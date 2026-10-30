package com.monavero.api;

import com.jayway.jsonpath.JsonPath;
import com.monavero.api.scheduling.ScheduledTransferExecutionService;
import com.monavero.api.scheduling.ScheduledTransferWorker;
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
class ScheduledTransferIntegrationTest extends PostgresIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ScheduledTransferExecutionService execution;
    @Autowired ScheduledTransferWorker worker;

    private String register(String name) throws Exception {
        String body = "{\"name\":\"" + name + "\",\"email\":\"" + UUID.randomUUID() +
            "@example.test\",\"password\":\"senha-segura-2026\"}";
        String json = mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content(body)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(json, "$.accessToken");
    }

    private String overview(String token) throws Exception {
        return mvc.perform(get("/api/v1/banking/overview").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    private static String payload(String source, String agency, String number,
                                  String amount, String time, String key) {
        return "{\"originAccountId\":\"" + source + "\",\"destinationAgency\":\"" + agency +
            "\",\"destinationAccountNumber\":\"" + number + "\",\"amount\":" + amount +
            ",\"scheduledFor\":\"" + time + "\",\"description\":\"Agendamento teste\",\"idempotencyKey\":\"" + key + "\"}";
    }

    private BigDecimal balance(String id) {
        return jdbc.queryForObject("SELECT balance FROM bank_accounts WHERE id = ?", BigDecimal.class, UUID.fromString(id));
    }

    @Test
    void schemaV7Aplicado() {
        assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE version = '7' AND success = true",
            Integer.class)).isEqualTo(1);
    }

    @Test
    void agendaSemDebitarEExecutaSomenteUmaVezComDuasPontasPersistentes() throws Exception {
        String a = register("Titular A");
        String b = register("Titular B");
        String oa = overview(a);
        String ob = overview(b);
        String from = JsonPath.read(oa, "$.accounts[0].id");
        String to = JsonPath.read(ob, "$.accounts[0].id");
        String agency = JsonPath.read(ob, "$.accounts[0].agency");
        String number = JsonPath.read(ob, "$.accounts[0].number");
        String key = UUID.randomUUID().toString();
        String date = OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(10).toString();
        String body = payload(from, agency, number, "123.45", date, key);
        String response = mvc.perform(post("/api/v1/banking/scheduled-transfers")
                .header("Authorization", "Bearer " + a).contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("agendado"))
            .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(response, "$.id");
        assertThat(balance(from)).isEqualByComparingTo("1000.00");
        assertThat(balance(to)).isEqualByComparingTo("1000.00");
        execution.executeDue(UUID.fromString(id));
        assertThat(balance(from)).isEqualByComparingTo("1000.00");
        mvc.perform(post("/api/v1/banking/scheduled-transfers")
                .header("Authorization", "Bearer " + a).contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(id));
        mvc.perform(post("/api/v1/banking/scheduled-transfers")
                .header("Authorization", "Bearer " + a).contentType(MediaType.APPLICATION_JSON)
                .content(body.replace("123.45", "123.46")))
            .andExpect(status().isConflict());
        // O relógio avança via SQL apenas no banco de testes; o endpoint público não pode forçar execução.
        jdbc.update("UPDATE scheduled_transfers SET scheduled_for = now() - interval '1 minute' WHERE id = ?", UUID.fromString(id));
        execution.executeDue(UUID.fromString(id));
        execution.executeDue(UUID.fromString(id));
        assertThat(balance(from)).isEqualByComparingTo("876.55");
        assertThat(balance(to)).isEqualByComparingTo("1123.45");
        UUID transferId = jdbc.queryForObject("SELECT transfer_id FROM scheduled_transfers WHERE id = ?",
            UUID.class, UUID.fromString(id));
        assertThat(transferId).isNotNull();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM account_transactions WHERE transfer_id = ?",
            Integer.class, transferId)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT sum(amount) FROM account_transactions WHERE transfer_id = ?",
            BigDecimal.class, transferId)).isEqualByComparingTo(BigDecimal.ZERO);
        mvc.perform(get("/api/v1/banking/scheduled-transfers").header("Authorization", "Bearer " + a))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].status").value("concluido"));
        mvc.perform(delete("/api/v1/banking/scheduled-transfers/" + id)
            .header("Authorization", "Bearer " + a)).andExpect(status().isConflict());
    }

    @Test
    void somenteTitularPodeConsultarOuCancelarECancelamentoNaoMovimentaSaldo() throws Exception {
        String a = register("Titular C");
        String b = register("Titular D");
        String oa = overview(a);
        String ob = overview(b);
        String from = JsonPath.read(oa, "$.accounts[0].id");
        String to = JsonPath.read(ob, "$.accounts[0].id");
        String agency = JsonPath.read(ob, "$.accounts[0].agency");
        String number = JsonPath.read(ob, "$.accounts[0].number");
        String body = payload(from, agency, number, "10.00", OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(30).toString(),
            UUID.randomUUID().toString());
        String response = mvc.perform(post("/api/v1/banking/scheduled-transfers")
                .header("Authorization", "Bearer " + a).contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(response, "$.id");
        mvc.perform(get("/api/v1/banking/scheduled-transfers")
            .header("Authorization", "Bearer " + b)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(delete("/api/v1/banking/scheduled-transfers/" + id)
            .header("Authorization", "Bearer " + b)).andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/banking/scheduled-transfers/" + id))
            .andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/v1/banking/scheduled-transfers/" + id)
            .header("Authorization", "Bearer " + a)).andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("cancelado"));
        jdbc.update("UPDATE scheduled_transfers SET scheduled_for = now() - interval '1 minute' WHERE id = ?", UUID.fromString(id));
        execution.executeDue(UUID.fromString(id));
        assertThat(balance(from)).isEqualByComparingTo("1000.00");
        assertThat(balance(to)).isEqualByComparingTo("1000.00");
    }


    @Test
    void semSaldoNoVencimentoMarcaRecusadoSemDebito() throws Exception {
        String a = register("Titular F");
        String b = register("Titular G");
        String oa = overview(a);
        String ob = overview(b);
        String from = JsonPath.read(oa, "$.accounts[0].id");
        String to = JsonPath.read(ob, "$.accounts[0].id");
        String agency = JsonPath.read(ob, "$.accounts[0].agency");
        String number = JsonPath.read(ob, "$.accounts[0].number");
        String body = payload(from, agency, number, "200.00",
            OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(15).toString(), UUID.randomUUID().toString());
        String response = mvc.perform(post("/api/v1/banking/scheduled-transfers")
                .header("Authorization", "Bearer " + a).contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(response, "$.id");
        jdbc.update("UPDATE bank_accounts SET balance = 0 WHERE id = ?", UUID.fromString(from));
        jdbc.update("UPDATE scheduled_transfers SET scheduled_for = now() - interval '1 minute' WHERE id = ?", UUID.fromString(id));
        worker.processPending();
        assertThat(jdbc.queryForObject("SELECT status FROM scheduled_transfers WHERE id = ?", String.class, UUID.fromString(id)))
            .isEqualTo("FAILED");
        assertThat(balance(from)).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(balance(to)).isEqualByComparingTo("1000.00");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM bank_transfers WHERE request_key = ?",
            Integer.class, id)).isZero();
    }

    @Test
    void impedeAgendamentoParaMesmaContaEPayloadInvalido() throws Exception {
        String a = register("Titular E");
        String oa = overview(a);
        String from = JsonPath.read(oa, "$.accounts[0].id");
        String agency = JsonPath.read(oa, "$.accounts[0].agency");
        String number = JsonPath.read(oa, "$.accounts[0].number");
        String date = OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(20).toString();
        mvc.perform(post("/api/v1/banking/scheduled-transfers")
                .header("Authorization", "Bearer " + a).contentType(MediaType.APPLICATION_JSON)
                .content(payload(from, agency, number, "50.00", date, UUID.randomUUID().toString())))
            .andExpect(status().isUnprocessableEntity());
        mvc.perform(post("/api/v1/banking/scheduled-transfers")
                .header("Authorization", "Bearer " + a).contentType(MediaType.APPLICATION_JSON)
                .content(payload(from, agency, number, "50001.00", date, UUID.randomUUID().toString())))
            .andExpect(status().isBadRequest());
    }
}
