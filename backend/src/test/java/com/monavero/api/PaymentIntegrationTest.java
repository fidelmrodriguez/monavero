package com.monavero.api;

import com.jayway.jsonpath.JsonPath;
import com.monavero.api.payments.PaymentService;
import com.monavero.api.payments.PaymentWorker;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PaymentIntegrationTest extends PostgresIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired PaymentService service;
    @Autowired PaymentWorker worker;

    private String register() throws Exception {
        String json = mvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Cliente pagamento\",\"email\":\"" + UUID.randomUUID() +
                    "@example.test\",\"password\":\"senha-segura-2026\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(json, "$.accessToken");
    }

    private String account(String token) throws Exception {
        String json = mvc.perform(get("/api/v1/banking/overview")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(json, "$.accounts[0].id");
    }

    private static String payload(String source, String amount, String when, String key) {
        String schedule = when == null ? "null" : "\"" + when + "\"";
        return "{\"originAccountId\":\"" + source + "\",\"paymentType\":\"BOLETO\"," +
            "\"beneficiary\":\"Prestador exemplo\",\"reference\":\"FATURA2026A1\"," +
            "\"description\":\"Pagamento mensal\",\"amount\":" + amount +
            ",\"scheduledFor\":" + schedule + ",\"idempotencyKey\":\"" + key + "\"}";
    }

    private BigDecimal balance(String account) {
        return jdbc.queryForObject("SELECT balance FROM bank_accounts WHERE id = ?",
            BigDecimal.class, UUID.fromString(account));
    }

    @Test
    void migrationV8Aplicada() {
        assertThat(jdbc.queryForObject("""
            SELECT count(*) FROM flyway_schema_history WHERE version = '8' AND success = true
            """, Integer.class)).isEqualTo(1);
    }

    @Test
    void pagamentoImediatoDebitaUmaUnicaVezMesmoEmReenvio() throws Exception {
        String token = register();
        String source = account(token);
        String key = UUID.randomUUID().toString();
        String body = payload(source, "123.45", null, key);
        String first = mvc.perform(post("/api/v1/banking/payments")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("concluido"))
            .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(first, "$.id");
        assertThat(balance(source)).isEqualByComparingTo("876.55");
        mvc.perform(post("/api/v1/banking/payments")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(id));
        assertThat(balance(source)).isEqualByComparingTo("876.55");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM account_transactions WHERE payment_id = ?",
            Integer.class, UUID.fromString(id))).isEqualTo(1);
        mvc.perform(post("/api/v1/banking/payments")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(payload(source, "123.46", null, key)))
            .andExpect(status().isConflict());
        mvc.perform(get("/api/v1/banking/overview").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.transactions[0].type").value("pagamento"))
            .andExpect(jsonPath("$.transactions[0].amount").value(-123.45));
    }

    @Test
    void agendamentoCancelaSemDebitoEEUsuarioNaoVazaHistorico() throws Exception {
        String a = register();
        String b = register();
        String source = account(a);
        account(b);
        String future = OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(30).toString();
        String body = payload(source, "80.00", future, UUID.randomUUID().toString());
        String response = mvc.perform(post("/api/v1/banking/payments")
                .header("Authorization", "Bearer " + a)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("agendado"))
            .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(response, "$.id");
        assertThat(balance(source)).isEqualByComparingTo("1000.00");
        mvc.perform(get("/api/v1/banking/payments").header("Authorization", "Bearer " + b))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(delete("/api/v1/banking/payments/" + id).header("Authorization", "Bearer " + b))
            .andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/banking/payments/" + id).header("Authorization", "Bearer " + a))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("cancelado"));
        jdbc.update("UPDATE bank_payments SET scheduled_for = now() - interval '1 minute' WHERE id = ?",
            UUID.fromString(id));
        service.executeDue(UUID.fromString(id));
        assertThat(balance(source)).isEqualByComparingTo("1000.00");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM account_transactions WHERE payment_id = ?",
            Integer.class, UUID.fromString(id))).isZero();
    }

    @Test
    void agendadoSoDebitaNoVencimentoEExecucaoDuplicadaEhInofensiva() throws Exception {
        String a = register();
        String source = account(a);
        String future = OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(20).toString();
        String key = UUID.randomUUID().toString();
        String body = payload(source, "25.35", future, key);
        String response = mvc.perform(post("/api/v1/banking/payments")
                .header("Authorization", "Bearer " + a)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(response, "$.id");
        service.executeDue(UUID.fromString(id));
        assertThat(balance(source)).isEqualByComparingTo("1000.00");
        mvc.perform(post("/api/v1/banking/payments")
                .header("Authorization", "Bearer " + a)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(id));
        jdbc.update("UPDATE bank_payments SET scheduled_for = now() - interval '1 minute' WHERE id = ?",
            UUID.fromString(id));
        service.executeDue(UUID.fromString(id));
        service.executeDue(UUID.fromString(id));
        assertThat(balance(source)).isEqualByComparingTo("974.65");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM account_transactions WHERE payment_id = ?",
            Integer.class, UUID.fromString(id))).isEqualTo(1);
        mvc.perform(get("/api/v1/banking/payments").header("Authorization", "Bearer " + a))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].status").value("concluido"));
        mvc.perform(delete("/api/v1/banking/payments/" + id).header("Authorization", "Bearer " + a))
            .andExpect(status().isConflict());
    }

    @Test
    void semSaldoNoVencimentoRecusaSemSaldoNegativo() throws Exception {
        String a = register();
        String source = account(a);
        String future = OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(20).toString();
        String response = mvc.perform(post("/api/v1/banking/payments")
                .header("Authorization", "Bearer " + a)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload(source, "5000.00", future, UUID.randomUUID().toString())))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(response, "$.id");
        jdbc.update("UPDATE bank_payments SET scheduled_for = now() - interval '1 minute' WHERE id = ?",
            UUID.fromString(id));
        worker.processPending();
        assertThat(jdbc.queryForObject("SELECT status FROM bank_payments WHERE id = ?",
            String.class, UUID.fromString(id))).isEqualTo("FAILED");
        assertThat(balance(source)).isEqualByComparingTo("1000.00");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM account_transactions WHERE payment_id = ?",
            Integer.class, UUID.fromString(id))).isZero();
    }

    @Test
    void semAutenticacaoOutroTitularEValorInvalidoSaoRecusados() throws Exception {
        String a = register();
        String b = register();
        String source = account(a);
        account(b);
        String body = payload(source, "15.00", null, UUID.randomUUID().toString());
        mvc.perform(post("/api/v1/banking/payments")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/banking/payments")
                .header("Authorization", "Bearer " + b)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/banking/payments")
                .header("Authorization", "Bearer " + a)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload(source, "50000.01", null, UUID.randomUUID().toString())))
            .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/banking/payments")
                .header("Authorization", "Bearer " + a)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload(source, "1100.00", null, UUID.randomUUID().toString())))
            .andExpect(status().isUnprocessableEntity());
        assertThat(balance(source)).isEqualByComparingTo("1000.00");
    }
}
