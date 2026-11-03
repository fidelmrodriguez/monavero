package com.monavero.api.payments;

import com.monavero.api.accounts.BankingService;
import com.monavero.api.auth.AuthenticatedUser;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Pagamentos exclusivamente demonstrativos: um débito no extrato, sem liquidação externa. */
@Service
public class PaymentService {
    private final JdbcTemplate jdbc;
    private final BankingService banking;

    public PaymentService(JdbcTemplate jdbc, BankingService banking) {
        this.jdbc = jdbc;
        this.banking = banking;
    }

    private static final ZoneId BRAZIL = ZoneId.of("America/Sao_Paulo");

    public PaymentDtos.Boleto lookup(AuthenticatedUser user, String code) {
        requireUser(user);
        LocalDate today = LocalDate.now(BRAZIL);
        PaymentDtos.Boleto boleto = switch (code) {
            case "00090000000000000000000000000000000000000000001" ->
                new PaymentDtos.Boleto(code, "Energia Monavero (teste)", new BigDecimal("15.00"), today.plusDays(30));
            case "00090000000000000000000000000000000000000000002" ->
                new PaymentDtos.Boleto(code, "Água Monavero (teste)", new BigDecimal("12.00"), today.plusDays(30));
            case "00090000000000000000000000000000000000000000003" ->
                new PaymentDtos.Boleto(code, "Serviços Monavero (teste)", new BigDecimal("5000.00"), today.plusDays(30));
            case "00090000000000000000000000000000000000000000004" ->
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Boleto demonstrativo vencido.");
            default -> throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Boleto demonstrativo não encontrado.");
        };
        if (hasActiveBoleto(user.id(), code)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Boleto já pago ou agendado.");
        }
        return boleto;
    }

    private boolean hasActiveBoleto(UUID userId, String code) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM bank_payments
              WHERE requester_id = ? AND reference = ? AND payment_type = 'BOLETO'
              AND status IN ('PENDING', 'EXECUTED'))
            """, Boolean.class, userId, code));
    }

    @Transactional
    public PaymentDtos.Item create(AuthenticatedUser user, PaymentDtos.Request request) {
        requireUser(user);
        banking.ensureAccountForScheduling(user);
        // Precisão idêntica à coluna TIMESTAMPTZ do PostgreSQL, incluindo reenvios.
        OffsetDateTime scheduled = request.scheduledFor() == null ? null :
            request.scheduledFor().withOffsetSameInstant(ZoneOffset.UTC)
                .plusNanos(500).truncatedTo(ChronoUnit.MICROS);
        String beneficiary = request.beneficiary().trim();
        String reference = request.reference().trim().toUpperCase(java.util.Locale.ROOT);
        String description = normalized(request.description());
        if (beneficiary.length() < 2 || reference.length() < 6) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "Beneficiário e referência devem estar preenchidos corretamente.");
        }
        BigDecimal amount = request.amount().setScale(2);
        String key = request.idempotencyKey();
        jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<Void>) connection -> {
            try (var statement = connection.prepareStatement("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))")) {
                if (reference.matches("[0-9]{47}")) {
                    statement.setString(1, "boleto:" + user.id() + ":" + reference);
                    statement.execute();
                }
                statement.setString(1, "payment:" + user.id() + ":" + key);
                statement.execute();
            }
            return null;
        });
        List<Stored> previous = jdbc.query("SELECT * FROM bank_payments WHERE requester_id = ? AND request_key = ?",
            (rs, row) -> stored(rs), user.id(), key);
        if (!previous.isEmpty()) {
            Stored original = previous.get(0);
            if (!original.origin().equals(request.originAccountId()) ||
                    !original.type().equals(request.paymentType()) ||
                    !original.beneficiary().equals(beneficiary) ||
                    !original.reference().equals(reference) ||
                    original.amount().compareTo(amount) != 0 ||
                    !Objects.equals(original.description(), description) ||
                    !sameInstant(original.scheduledFor(), scheduled)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Identificador já utilizado para outro pagamento.");
            }
            return original.item();
        }
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (scheduled != null && (scheduled.isBefore(now.plusSeconds(60)) || scheduled.isAfter(now.plusDays(90)))) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "Escolha uma data entre um minuto e 90 dias a partir de agora.");
        }
        if (reference.matches("[0-9]{47}")) {
            PaymentDtos.Boleto boleto = lookup(user, reference);
            if (!"BOLETO".equals(request.paymentType()) || !boleto.beneficiary().equals(beneficiary)
                    || boleto.amount().compareTo(amount) != 0
                    || (scheduled != null && scheduled.atZoneSameInstant(BRAZIL).toLocalDate().isAfter(boleto.dueDate()))) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Confira os dados e o vencimento do boleto.");
            }
        }
        if (!Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM account_holders h JOIN bank_accounts a ON a.id = h.account_id
                  WHERE h.account_id = ? AND h.user_id = ? AND a.status = 'ACTIVE' AND a.currency = 'BRL')
                """, Boolean.class, request.originAccountId(), user.id()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Conta de origem indisponível para este usuário.");
        }
        UUID id = UUID.randomUUID();
        jdbc.update("""
            INSERT INTO bank_payments (id, requester_id, origin_account_id, request_key, payment_type,
              beneficiary, reference, amount, description, scheduled_for, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
            """, id, user.id(), request.originAccountId(), key, request.paymentType(),
            beneficiary, reference, amount, description, scheduled, now);
        if (scheduled == null) {
            // Atomicidade: se o débito for recusado, o INSERT também sofre rollback.
            executeDebit(id, request.originAccountId(), amount, beneficiary);
        }
        return jdbc.queryForObject("SELECT * FROM bank_payments WHERE id = ?",
            (rs, row) -> stored(rs).item(), id);
    }

    @Transactional(readOnly = true)
    public List<PaymentDtos.Item> list(AuthenticatedUser user) {
        requireUser(user);
        return jdbc.query("SELECT * FROM bank_payments WHERE requester_id = ? " +
                "ORDER BY created_at DESC, id DESC LIMIT 100",
            (rs, row) -> stored(rs).item(), user.id());
    }

    @Transactional
    public PaymentDtos.Item cancel(AuthenticatedUser user, UUID id) {
        requireUser(user);
        List<Stored> records = jdbc.query(
            "SELECT * FROM bank_payments WHERE id = ? AND requester_id = ? FOR UPDATE",
            (rs, row) -> stored(rs), id, user.id());
        if (records.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        Stored item = records.get(0);
        if (!"PENDING".equals(item.status()) || item.scheduledFor() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Somente pagamentos agendados pendentes podem ser cancelados.");
        }
        jdbc.update("UPDATE bank_payments SET status = 'CANCELED' WHERE id = ?", id);
        return jdbc.queryForObject("SELECT * FROM bank_payments WHERE id = ?",
            (rs, row) -> stored(rs).item(), id);
    }

    @Transactional
    public void executeDue(UUID id) {
        List<Stored> pending = jdbc.query("""
            SELECT * FROM bank_payments WHERE id = ? AND status = 'PENDING'
              AND scheduled_for IS NOT NULL AND scheduled_for <= now() FOR UPDATE SKIP LOCKED
            """, (rs, row) -> stored(rs), id);
        if (pending.isEmpty()) return;
        Stored item = pending.get(0);
        // Recusa financeira não é erro transitório: persiste status FAILED sem débito.
        if (!Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM account_holders h JOIN app_users u ON u.id = h.user_id
                  WHERE h.account_id = ? AND h.user_id = ? AND u.status = 'ACTIVE')
                """, Boolean.class, item.origin(), item.userId()))) {
            fail(item.id(), "Conta indisponível na data agendada.");
            return;
        }
        debitIfPossible(item.id(), item.origin(), item.amount(), item.beneficiary());
    }

    private void executeDebit(UUID id, UUID origin, BigDecimal amount, String beneficiary) {
        if (!debitIfPossible(id, origin, amount, beneficiary)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "Saldo insuficiente ou conta indisponível.");
        }
    }

    private boolean debitIfPossible(UUID id, UUID origin, BigDecimal amount, String beneficiary) {
        List<Account> locked = jdbc.query(
            "SELECT id, balance, status, currency FROM bank_accounts WHERE id = ? FOR UPDATE",
            (rs, row) -> new Account(rs.getBigDecimal("balance"), rs.getString("status"), rs.getString("currency")), origin);
        if (locked.isEmpty() || !"ACTIVE".equals(locked.get(0).status()) ||
                !"BRL".equals(locked.get(0).currency()) || locked.get(0).balance().compareTo(amount) < 0) {
            fail(id, "Saldo ou conta indisponível na data agendada.");
            return false;
        }
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        jdbc.update("UPDATE bank_accounts SET balance = balance - ?, updated_at = ? WHERE id = ?", amount, now, origin);
        String label = "Pagamento para " + beneficiary;
        if (label.length() > 160) label = label.substring(0, 160);
        jdbc.update("""
            INSERT INTO account_transactions
              (id, account_id, occurred_at, description, category, movement_type, amount, payment_id)
            VALUES (?, ?, ?, ?, 'Pagamentos', 'PAGAMENTO', ?, ?)
            """, UUID.randomUUID(), origin, now, label, amount.negate(), id);
        jdbc.update("UPDATE bank_payments SET status = 'EXECUTED', processed_at = ?, failure_reason = NULL WHERE id = ?",
            now, id);
        return true;
    }

    private void fail(UUID id, String reason) {
        jdbc.update("UPDATE bank_payments SET status = 'FAILED', failure_reason = ? WHERE id = ?", reason, id);
    }

    private static String normalized(String value) { return value == null ? "" : value.trim(); }
    private static boolean sameInstant(OffsetDateTime a, OffsetDateTime b) {
        return a == null ? b == null : b != null && a.isEqual(b);
    }
    private static void requireUser(AuthenticatedUser user) {
        if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
    }
    private record Account(BigDecimal balance, String status, String currency) { }

    static Stored stored(ResultSet rs) throws SQLException {
        return new Stored((UUID) rs.getObject("id"), (UUID) rs.getObject("requester_id"),
            (UUID) rs.getObject("origin_account_id"), rs.getString("request_key"),
            rs.getString("payment_type"), rs.getString("beneficiary"), rs.getString("reference"),
            rs.getBigDecimal("amount"), rs.getString("description"),
            rs.getObject("scheduled_for", OffsetDateTime.class),
            rs.getObject("created_at", OffsetDateTime.class),
            rs.getObject("processed_at", OffsetDateTime.class),
            rs.getString("status"), rs.getString("failure_reason"));
    }

    record Stored(UUID id, UUID userId, UUID origin, String key, String type,
                  String beneficiary, String reference, BigDecimal amount, String description,
                  OffsetDateTime scheduledFor, OffsetDateTime createdAt, OffsetDateTime processedAt,
                  String status, String failureReason) {
        PaymentDtos.Item item() {
            String label = switch (status) {
                case "EXECUTED" -> "concluido";
                case "CANCELED" -> "cancelado";
                case "FAILED" -> "recusado";
                default -> "agendado";
            };
            return new PaymentDtos.Item(id, origin, type, beneficiary, reference, amount,
                description, scheduledFor, createdAt, processedAt, label, failureReason);
        }
    }
}
