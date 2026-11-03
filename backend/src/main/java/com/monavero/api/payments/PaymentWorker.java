package com.monavero.api.payments;

import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Verifica vencimentos enquanto a API está online; recupera atrasados após o despertar. */
@Component
public class PaymentWorker {
    private static final Logger log = LoggerFactory.getLogger(PaymentWorker.class);
    private final JdbcTemplate jdbc;
    private final PaymentService payments;

    public PaymentWorker(JdbcTemplate jdbc, PaymentService payments) {
        this.jdbc = jdbc;
        this.payments = payments;
    }

    @Scheduled(fixedDelayString = "${monavero.payments.scan-delay-ms:15000}",
               initialDelayString = "${monavero.payments.initial-delay-ms:25000}")
    public void processPending() {
        List<UUID> due = jdbc.query("""
            SELECT id FROM bank_payments WHERE status = 'PENDING' AND scheduled_for <= now()
            ORDER BY scheduled_for, id LIMIT 25
            """, (rs, row) -> (UUID) rs.getObject(1));
        for (UUID id : due) {
            try {
                payments.executeDue(id);
            } catch (Exception ex) {
                // Infraestrutura: manter PENDING para nova tentativa, sem confirmar débito.
                log.error("Falha transitória no processamento do pagamento {}", id, ex);
            }
        }
    }
}
