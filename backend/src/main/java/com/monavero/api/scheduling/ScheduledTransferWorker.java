package com.monavero.api.scheduling;

import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** Recupera agendamentos vencidos inclusive depois de o servidor acordar na Blitz. */
@Component
public class ScheduledTransferWorker {
    private static final Logger log = LoggerFactory.getLogger(ScheduledTransferWorker.class);
    private final JdbcTemplate jdbc;
    private final ScheduledTransferExecutionService execution;

    public ScheduledTransferWorker(JdbcTemplate jdbc, ScheduledTransferExecutionService execution) {
        this.jdbc = jdbc;
        this.execution = execution;
    }

    @Scheduled(fixedDelayString = "${monavero.scheduling.scan-delay-ms:15000}",
               initialDelayString = "${monavero.scheduling.initial-delay-ms:20000}")
    public void processPending() {
        List<UUID> due = jdbc.query("SELECT id FROM scheduled_transfers WHERE status = 'PENDING' " +
                "AND scheduled_for <= now() ORDER BY scheduled_for, id LIMIT 25",
            (rs, row) -> (UUID) rs.getObject(1));
        for (UUID id : due) {
            try {
                execution.executeDue(id);
            } catch (ResponseStatusException ex) {
                log.warn("Agendamento {} não executado: status HTTP {}", id, ex.getStatusCode());
                execution.markFailedIfPending(id,
                    ex.getStatusCode().value() == 422 ? "Saldo ou conta indisponível na data agendada." :
                    "Não foi possível concluir a transferência agendada.");
            } catch (Exception ex) {
                // Erros de infraestrutura são transitórios: mantêm PENDING para nova tentativa.
                log.error("Falha transitória no processamento do agendamento {}", id, ex);
            }
        }
    }
}
