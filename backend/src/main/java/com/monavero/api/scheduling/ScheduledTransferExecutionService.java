package com.monavero.api.scheduling;

import com.monavero.api.accounts.TransferDtos;
import com.monavero.api.accounts.TransferService;
import com.monavero.api.auth.AuthenticatedUser;
import com.monavero.api.identity.AccessRole;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Cada agendamento é travado antes do débito; várias instâncias podem executar o scanner. */
@Service
public class ScheduledTransferExecutionService {
    private final JdbcTemplate jdbc;
    private final TransferService transfers;

    public ScheduledTransferExecutionService(JdbcTemplate jdbc, TransferService transfers) {
        this.jdbc = jdbc;
        this.transfers = transfers;
    }

    @Transactional
    public void executeDue(UUID id) {
        // SKIP LOCKED impede que outra instância processe o mesmo agendamento simultaneamente.
        List<ScheduledTransferService.Stored> pending = jdbc.query(
            "SELECT * FROM scheduled_transfers WHERE id = ? AND status = 'PENDING' " +
                "AND scheduled_for <= now() FOR UPDATE SKIP LOCKED",
            (rs, row) -> ScheduledTransferService.stored(rs), id);
        if (pending.isEmpty()) return;
        ScheduledTransferService.Stored item = pending.get(0);
        List<AuthenticatedUser> holders = jdbc.query(
            "SELECT id, email, full_name, access_role, is_demo FROM app_users WHERE id = ? AND status = 'ACTIVE'",
            (rs, row) -> new AuthenticatedUser((UUID) rs.getObject("id"), rs.getString("email"),
                rs.getString("full_name"), AccessRole.valueOf(rs.getString("access_role")),
                rs.getBoolean("is_demo"), ""), item.userId());
        if (holders.isEmpty()) throw new IllegalStateException("Titular indisponível");
        // O próprio UUID do agendamento é a chave idempotente da operação financeira.
        TransferDtos.Receipt receipt = transfers.execute(holders.get(0), new TransferDtos.Request(
            item.origin(), item.agency(), item.number(), item.amount(),
            item.description(), item.id().toString()));
        jdbc.update("UPDATE scheduled_transfers SET status = 'EXECUTED', executed_at = ?, " +
                "transfer_id = ?, failure_reason = NULL WHERE id = ?",
            OffsetDateTime.now(ZoneOffset.UTC), receipt.id(), id);
    }

    /** Chamada somente após rollback de uma execução recusada; nunca reverte débito confirmado. */
    @Transactional
    public void markFailedIfPending(UUID id, String reason) {
        jdbc.update("UPDATE scheduled_transfers SET status = 'FAILED', failure_reason = ? " +
                "WHERE id = ? AND status = 'PENDING'", reason, id);
    }
}
