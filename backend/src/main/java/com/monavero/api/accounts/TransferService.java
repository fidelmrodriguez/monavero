package com.monavero.api.accounts;

import com.monavero.api.auth.AuthenticatedUser;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Movimentação estritamente interna ao Monavero: saldo e dois lançamentos atômicos. */
@Service
public class TransferService {
    private final BankingService banking;
    private final JdbcTemplate jdbc;
    private final BankTransactionRepository transactions;

    public TransferService(BankingService banking, JdbcTemplate jdbc, BankTransactionRepository transactions) {
        this.banking = banking;
        this.jdbc = jdbc;
        this.transactions = transactions;
    }

    @Transactional
    public TransferDtos.Receipt execute(AuthenticatedUser user, TransferDtos.Request request) {
        if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        BigDecimal amount = request.amount().setScale(2);
        String description = request.description() == null ? "" : request.description().trim();
        String key = request.idempotencyKey();

        // Primeiro provisiona a conta; a operação inteira mantém a mesma transação JDBC/JPA.
        banking.ensurePrimary(user);
        // Serializa também reenvios concorrentes do mesmo identificador por usuário.
        jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<Void>) connection -> {
            try (var statement = connection.prepareStatement(
                    "SELECT pg_advisory_xact_lock(hashtextextended(?, 0))")) {
                statement.setString(1, "transfer:" + user.id() + ":" + key);
                statement.execute();
            }
            return null;
        });

        List<Existing> existing = jdbc.query(
            "SELECT id, origin_account_id, destination_account_id, destination_agency, " +
                "destination_number, amount, description, created_at FROM bank_transfers " +
                "WHERE requester_id = ? AND request_key = ?",
            (rs, row) -> new Existing((UUID) rs.getObject("id"),
                (UUID) rs.getObject("origin_account_id"), (UUID) rs.getObject("destination_account_id"),
                rs.getString("destination_agency"), rs.getString("destination_number"),
                rs.getBigDecimal("amount"), rs.getString("description"),
                rs.getObject("created_at", OffsetDateTime.class)), user.id(), key);
        if (!existing.isEmpty()) {
            Existing previous = existing.get(0);
            if (!previous.originId().equals(request.originAccountId()) ||
                    !previous.agency().equals(request.destinationAgency()) ||
                    !previous.number().equals(request.destinationAccountNumber()) ||
                    previous.amount().compareTo(amount) != 0 ||
                    !Objects.equals(previous.description(), description)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Identificador já utilizado para outra transferência.");
            }
            return previous.receipt();
        }

        if (!Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM account_holders WHERE account_id = ? AND user_id = ?)",
                Boolean.class, request.originAccountId(), user.id()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Conta de origem não pertence ao usuário.");
        }
        List<UUID> destinationIds = jdbc.query(
            "SELECT id FROM bank_accounts WHERE branch_code = ? AND account_number = ?",
            (rs, row) -> (UUID) rs.getObject(1),
            request.destinationAgency(), request.destinationAccountNumber());
        if (destinationIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "Conta de destino não encontrada no Monavero.");
        }
        UUID destinationId = destinationIds.get(0);
        if (destinationId.equals(request.originAccountId())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "A conta de origem e a de destino devem ser diferentes.");
        }
        // A identidade demo é pública; seus fundos fictícios não podem sair para contas pessoais.
        if (user.demo() && !Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM account_holders WHERE account_id = ? AND user_id = ?)",
                Boolean.class, destinationId, user.id()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Transferências demonstrativas só podem ocorrer entre contas de demonstração.");
        }

        // Impede que dinheiro fictício de contas pessoais seja enviado à identidade demo pública.
        if (!user.demo() && Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM account_holders h " +
                "JOIN app_users u ON u.id = h.user_id " +
                "WHERE h.account_id = ? AND u.is_demo = true)",
                Boolean.class, destinationId))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Transferências para a conta pública de demonstração não são permitidas.");
        }

        // Ordem global consistente impede deadlocks em transferências simultâneas A -> B / B -> A.
        List<UUID> orderedIds = new ArrayList<>(List.of(request.originAccountId(), destinationId));
        orderedIds.sort(Comparator.naturalOrder());
        List<AccountSnapshot> snapshots = new ArrayList<>();
        for (UUID id : orderedIds) {
            snapshots.add(jdbc.queryForObject(
                "SELECT id, balance, status, currency FROM bank_accounts WHERE id = ? FOR UPDATE",
                (rs, row) -> new AccountSnapshot((UUID) rs.getObject("id"),
                    rs.getBigDecimal("balance"), rs.getString("status"), rs.getString("currency")), id));
        }
        AccountSnapshot origin = snapshots.stream()
            .filter(row -> row.id().equals(request.originAccountId())).findFirst().orElseThrow();
        AccountSnapshot target = snapshots.stream()
            .filter(row -> row.id().equals(destinationId)).findFirst().orElseThrow();
        if (!"ACTIVE".equals(origin.status()) || !"ACTIVE".equals(target.status()) ||
                !"BRL".equals(origin.currency()) || !"BRL".equals(target.currency())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "Conta indisponível para transferência em reais.");
        }
        if (origin.balance().compareTo(amount) < 0) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Saldo insuficiente.");
        }

        UUID transferId = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        jdbc.update("INSERT INTO bank_transfers (id, requester_id, origin_account_id, destination_account_id, " +
                "destination_agency, destination_number, request_key, amount, description, created_at) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", transferId, user.id(), request.originAccountId(),
                destinationId, request.destinationAgency(), request.destinationAccountNumber(),
                key, amount, description, now);
        jdbc.update("UPDATE bank_accounts SET balance = balance - ?, updated_at = ? WHERE id = ?",
            amount, now, request.originAccountId());
        jdbc.update("UPDATE bank_accounts SET balance = balance + ?, updated_at = ? WHERE id = ?",
            amount, now, destinationId);

        String reference = "Transferência Monavero " + transferId.toString().substring(0, 8);
        String label = description.isEmpty() ? reference : description;
        transactions.saveAllAndFlush(List.of(
            new BankTransaction(request.originAccountId(), now, label, "Transferências",
                "TRANSFERENCIA", amount.negate(), transferId),
            new BankTransaction(destinationId, now, label, "Transferências",
                "TRANSFERENCIA", amount, transferId)));
        return new TransferDtos.Receipt(transferId, request.originAccountId(), destinationId,
            amount, now, "concluido");
    }

    private record AccountSnapshot(UUID id, BigDecimal balance, String status, String currency) { }
    private record Existing(UUID id, UUID originId, UUID destinationId, String agency, String number,
                            BigDecimal amount, String description, OffsetDateTime date) {
        TransferDtos.Receipt receipt() {
            return new TransferDtos.Receipt(id, originId, destinationId, amount, date, "concluido");
        }
    }
}
