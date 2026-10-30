package com.monavero.api.scheduling;

import com.monavero.api.accounts.BankingService;
import com.monavero.api.auth.AuthenticatedUser;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ScheduledTransferService {
    private final JdbcTemplate jdbc;
    private final BankingService banking;

    public ScheduledTransferService(JdbcTemplate jdbc, BankingService banking) {
        this.jdbc = jdbc;
        this.banking = banking;
    }

    @Transactional
    public ScheduledTransferDtos.Item create(AuthenticatedUser user, ScheduledTransferDtos.Request request) {
        requireUser(user);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime scheduledFor = request.scheduledFor().withOffsetSameInstant(ZoneOffset.UTC);
        banking.ensureAccountForScheduling(user);
        jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<Void>) connection -> {
            try (var statement = connection.prepareStatement("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))")) {
                statement.setString(1, "schedule:" + user.id() + ":" + request.idempotencyKey());
                statement.execute();
            }
            return null;
        });
        List<Stored> previous = jdbc.query("SELECT * FROM scheduled_transfers WHERE requester_id = ? AND request_key = ?",
            (rs, i) -> stored(rs), user.id(), request.idempotencyKey());
        if (!previous.isEmpty()) {
            Stored existing = previous.get(0);
            if (!existing.origin().equals(request.originAccountId()) ||
                !existing.agency().equals(request.destinationAgency()) ||
                !existing.number().equals(request.destinationAccountNumber()) ||
                existing.amount().compareTo(request.amount()) != 0 ||
                !existing.scheduledFor().isEqual(scheduledFor) ||
                !Objects.equals(existing.description(), normalized(request.description()))) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Este identificador já foi utilizado para outro agendamento.");
            }
            return existing.item();
        }
        if (scheduledFor.isBefore(now.plusSeconds(60)) || scheduledFor.isAfter(now.plusDays(90))) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "Escolha um horário entre um minuto e 90 dias a partir de agora.");
        }
        if (!Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM account_holders WHERE account_id = ? AND user_id = ?)",
                Boolean.class, request.originAccountId(), user.id()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Conta de origem não pertence ao titular.");
        }
        List<UUID> destinations = jdbc.query(
            "SELECT id FROM bank_accounts WHERE branch_code = ? AND account_number = ? AND status = 'ACTIVE' AND currency = 'BRL'",
            (rs, row) -> (UUID) rs.getObject(1), request.destinationAgency(), request.destinationAccountNumber());
        if (destinations.isEmpty() || destinations.get(0).equals(request.originAccountId())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Conta de destino inválida.");
        }
        UUID destinationId = destinations.get(0);
        if (!Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM bank_accounts WHERE id = ? AND status = 'ACTIVE' AND currency = 'BRL')",
                Boolean.class, request.originAccountId()))) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Conta de origem indisponível.");
        }
        // Mesma separação de fundos da transferência imediata: demo não cruza contas pessoais.
        if (user.demo() && !Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM account_holders WHERE account_id = ? AND user_id = ?)",
                Boolean.class, destinationId, user.id()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Destino indisponível para a conta demonstrativa.");
        }
        if (!user.demo() && Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM account_holders h JOIN app_users u ON u.id = h.user_id WHERE h.account_id = ? AND u.is_demo = true)",
                Boolean.class, destinationId))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Destino demonstrativo não permitido.");
        }
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO scheduled_transfers (id, requester_id, origin_account_id, destination_account_id, " +
                "destination_agency, destination_number, request_key, amount, description, scheduled_for, status, created_at) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)",
            id, user.id(), request.originAccountId(), destinationId, request.destinationAgency(),
            request.destinationAccountNumber(), request.idempotencyKey(), request.amount(),
            normalized(request.description()), scheduledFor, now);
        return new ScheduledTransferDtos.Item(id, request.originAccountId(), request.destinationAgency(),
            request.destinationAccountNumber(), request.amount(), normalized(request.description()),
            scheduledFor, now, "agendado", null, null, null);
    }

    @Transactional(readOnly = true)
    public List<ScheduledTransferDtos.Item> list(AuthenticatedUser user) {
        requireUser(user);
        return jdbc.query("SELECT * FROM scheduled_transfers WHERE requester_id = ? " +
                "ORDER BY created_at DESC, id DESC LIMIT 100",
            (rs, row) -> stored(rs).item(), user.id());
    }

    @Transactional
    public ScheduledTransferDtos.Item cancel(AuthenticatedUser user, UUID id) {
        requireUser(user);
        List<Stored> rows = jdbc.query("SELECT * FROM scheduled_transfers WHERE id = ? AND requester_id = ? FOR UPDATE",
            (rs, row) -> stored(rs), id, user.id());
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        Stored current = rows.get(0);
        if (!"PENDING".equals(current.status())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Somente agendamentos pendentes podem ser cancelados.");
        }
        jdbc.update("UPDATE scheduled_transfers SET status = 'CANCELED' WHERE id = ?", id);
        return new ScheduledTransferDtos.Item(current.id(), current.origin(), current.agency(),
            current.number(), current.amount(), current.description(), current.scheduledFor(),
            current.createdAt(), "cancelado", null, null, null);
    }

    static Stored stored(ResultSet rs) throws SQLException {
        return new Stored((UUID) rs.getObject("id"), (UUID) rs.getObject("requester_id"),
            (UUID) rs.getObject("origin_account_id"), (UUID) rs.getObject("destination_account_id"),
            rs.getString("destination_agency"), rs.getString("destination_number"),
            rs.getString("request_key"), rs.getBigDecimal("amount"), rs.getString("description"),
            rs.getObject("scheduled_for", OffsetDateTime.class), rs.getObject("created_at", OffsetDateTime.class),
            rs.getString("status"), rs.getObject("executed_at", OffsetDateTime.class),
            (UUID) rs.getObject("transfer_id"), rs.getString("failure_reason"));
    }

    static String normalized(String description) { return description == null ? "" : description.trim(); }

    private static void requireUser(AuthenticatedUser user) {
        if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
    }

    record Stored(UUID id, UUID userId, UUID origin, UUID destination, String agency, String number,
                  String requestKey, BigDecimal amount, String description,
                  OffsetDateTime scheduledFor, OffsetDateTime createdAt, String status,
                  OffsetDateTime executedAt, UUID transferId, String failureReason) {
        ScheduledTransferDtos.Item item() {
            String localized = switch (status) {
                case "EXECUTED" -> "concluido";
                case "CANCELED" -> "cancelado";
                case "FAILED" -> "recusado";
                default -> "agendado";
            };
            return new ScheduledTransferDtos.Item(id, origin, agency, number, amount, description,
                scheduledFor, createdAt, localized, executedAt, transferId, failureReason);
        }
    }
}
