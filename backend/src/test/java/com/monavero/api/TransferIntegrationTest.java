package com.monavero.api;

import com.jayway.jsonpath.JsonPath;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class TransferIntegrationTest extends PostgresIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;

    private String demoToken() throws Exception {
        String body = mvc.perform(post("/api/v1/auth/demo"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }

    private String register() throws Exception {
        String email = "transfer-" + UUID.randomUUID() + "@example.test";
        String body = "{\"name\":\"Cliente Exemplo\",\"email\":\"" + email +
            "\",\"password\":\"senha-segura-2026\"}";
        String json = mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content(body)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(json, "$.accessToken");
    }

    private String overview(String token) throws Exception {
        return mvc.perform(get("/api/v1/banking/overview").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    private static String request(String origin, String agency, String destination, String amount,
                                  String key, String description) {
        return "{\"originAccountId\":\"" + origin + "\",\"destinationAgency\":\"" + agency +
            "\",\"destinationAccountNumber\":\"" + destination + "\",\"amount\":" + amount +
            ",\"idempotencyKey\":\"" + key + "\",\"description\":\"" + description + "\"}";
    }

    private BigDecimal balance(String id) {
        return jdbc.queryForObject("SELECT balance FROM bank_accounts WHERE id = ?",
            BigDecimal.class, UUID.fromString(id));
    }

    @Test
    void flywayV5FoiAplicada() {
        assertThat(jdbc.queryForObject(
            "SELECT count(*) FROM flyway_schema_history WHERE version = '5' AND success = true",
            Integer.class)).isEqualTo(1);
    }

    @Test
    void autenticaTransfereAtomicoAtualizaExtratosERepeteComMesmaChaveSemDebitoExtra() throws Exception {
        String token = demoToken();
        String overview = overview(token);
        String source = JsonPath.read(overview, "$.accounts[0].id");
        String destination = JsonPath.read(overview, "$.accounts[1].id");
        String agency = JsonPath.read(overview, "$.accounts[1].agency");
        String number = JsonPath.read(overview, "$.accounts[1].number");
        BigDecimal beforeSource = balance(source);
        BigDecimal beforeDestination = balance(destination);
        String key = UUID.randomUUID().toString();
        String payload = request(source, agency, number, "25.37", key, "Teste da etapa seis");

        String first = mvc.perform(post("/api/v1/banking/transfers")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(payload))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("concluido"))
            .andExpect(jsonPath("$.amount").value(25.37))
            .andReturn().getResponse().getContentAsString();
        String transferId = JsonPath.read(first, "$.id");
        assertThat(balance(source)).isEqualByComparingTo(beforeSource.subtract(new BigDecimal("25.37")));
        assertThat(balance(destination)).isEqualByComparingTo(beforeDestination.add(new BigDecimal("25.37")));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM account_transactions WHERE transfer_id = ?",
            Integer.class, UUID.fromString(transferId))).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT sum(amount) FROM account_transactions WHERE transfer_id = ?",
            BigDecimal.class, UUID.fromString(transferId))).isEqualByComparingTo(BigDecimal.ZERO);

        mvc.perform(post("/api/v1/banking/transfers").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(payload))
            .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(transferId));
        assertThat(balance(source)).isEqualByComparingTo(beforeSource.subtract(new BigDecimal("25.37")));
        mvc.perform(post("/api/v1/banking/transfers").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(request(source, agency, number, "25.38", key, "Teste da etapa seis")))
            .andExpect(status().isConflict());
        String after = overview(token);
        assertThat((String) JsonPath.read(after, "$.transactions[0].type")).isEqualTo("transferencia");
    }

    @Test
    void bloqueiaSemTokenSaldoInsuficienteContaPropriaEDestinoPessoalDoDemo() throws Exception {
        String token = demoToken();
        String overview = overview(token);
        String origin = JsonPath.read(overview, "$.accounts[0].id");
        String agency = JsonPath.read(overview, "$.accounts[1].agency");
        String number = JsonPath.read(overview, "$.accounts[1].number");
        String id = UUID.randomUUID().toString();
        String payload = request(origin, agency, number, "10.00", id, "Teste");
        mvc.perform(post("/api/v1/banking/transfers").contentType(MediaType.APPLICATION_JSON)
            .content(payload)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/banking/transfers")
            .header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
            .content(request(JsonPath.read(overview, "$.accounts[1].id"), "0001",
                JsonPath.read(overview, "$.accounts[0].number"),
                "50000.00", UUID.randomUUID().toString(), "Teste")))
            .andExpect(status().isUnprocessableEntity());
        String sameNumber = JsonPath.read(overview, "$.accounts[0].number");
        mvc.perform(post("/api/v1/banking/transfers")
            .header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
            .content(request(origin, "0001", sameNumber, "2.00", UUID.randomUUID().toString(), "Teste")))
            .andExpect(status().isUnprocessableEntity());
        String personal = register();
        String target = overview(personal);
        String personalNumber = JsonPath.read(target, "$.accounts[0].number");
        mvc.perform(post("/api/v1/banking/transfers")
            .header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
            .content(request(origin, "0001", personalNumber, "2.00", UUID.randomUUID().toString(), "Teste")))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/banking/transfers")
            .header("Authorization", "Bearer " + personal).contentType(MediaType.APPLICATION_JSON)
            .content(payload)).andExpect(status().isForbidden());
    }
}
