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

    private String register() throws Exception { return register("Cliente Exemplo"); }

    private String register(String name) throws Exception {
        String email = "transfer-" + UUID.randomUUID() + "@example.test";
        String body = "{\"name\":\"" + name + "\",\"email\":\"" + email +
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
        // A conta poupança demonstrativa possui vínculo CO_HOLDER, não PRIMARY.
        // Ainda assim as duas pontas devem ser identificadas no extrato.
        assertThat((String) JsonPath.read(after, "$.transactions[0].counterpartyName")).isNotBlank();
        assertThat((String) JsonPath.read(after, "$.transactions[0].counterpartyAccount"))
            .matches("••••[A-Za-z0-9]{4}");
    }

    @Test
    void usuariosPessoaisDiferentesTransferemSaldoComExtratoPersistenteEIdempotencia() throws Exception {
        String tokenA = register("Remetente Exemplo");
        String tokenB = register("Destinatário Exemplo");
        String overviewA = overview(tokenA);
        String overviewB = overview(tokenB);
        String source = JsonPath.read(overviewA, "$.accounts[0].id");
        String target = JsonPath.read(overviewB, "$.accounts[0].id");
        String agency = JsonPath.read(overviewB, "$.accounts[0].agency");
        String number = JsonPath.read(overviewB, "$.accounts[0].number");
        assertThat(balance(source)).isEqualByComparingTo("1000.00");
        assertThat(balance(target)).isEqualByComparingTo("1000.00");
        String payload = request(source, agency, number, "125.50", UUID.randomUUID().toString(),
            "Transferência entre titulares");
        String result = mvc.perform(post("/api/v1/banking/transfers")
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON).content(payload))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("concluido"))
            .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(result, "$.id");
        assertThat(balance(source)).isEqualByComparingTo("874.50");
        assertThat(balance(target)).isEqualByComparingTo("1125.50");
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM account_transactions WHERE transfer_id = ?",
            Integer.class, UUID.fromString(id))).isEqualTo(2);
        // Ambos visualizam apenas seus próprios lançamentos, incluindo o crédito de abertura.
        String afterA = overview(tokenA);
        String afterB = overview(tokenB);
        assertThat((String) JsonPath.read(afterA, "$.accounts[0].id")).isEqualTo(source);
        assertThat((String) JsonPath.read(afterB, "$.accounts[0].id")).isEqualTo(target);
        assertThat((String) JsonPath.read(afterA, "$.transactions[0].type")).isEqualTo("transferencia");
        assertThat((String) JsonPath.read(afterB, "$.transactions[0].type")).isEqualTo("transferencia");
        // A API identifica ambas as contrapartes, inclusive em transferências antigas,
        // sem revelar ao destinatário o número completo da conta do remetente.
        assertThat((String) JsonPath.read(afterA, "$.transactions[0].counterpartyName"))
            .isEqualTo("Destinatário Exemplo");
        assertThat((String) JsonPath.read(afterB, "$.transactions[0].counterpartyName"))
            .isEqualTo("Remetente Exemplo");
        assertThat((String) JsonPath.read(afterB, "$.transactions[0].counterpartyAgency"))
            .isEqualTo("0001");
        String originNumber = JsonPath.read(overviewA, "$.accounts[0].number");
        assertThat((String) JsonPath.read(afterB, "$.transactions[0].counterpartyAccount"))
            .isEqualTo("••••" + originNumber.substring(originNumber.length() - 4));
        assertThat(afterB).doesNotContain(originNumber);
        assertThat((String) JsonPath.read(afterB, "$.transactions[1].description"))
            .isEqualTo("Crédito de abertura");
        mvc.perform(post("/api/v1/banking/transfers")
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON).content(payload))
            .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(id));
        assertThat(balance(source)).isEqualByComparingTo("874.50");
        assertThat(balance(target)).isEqualByComparingTo("1125.50");
    }

    @Test
    void contaPessoalNaoPodeTransferirParaContaDemoPublica() throws Exception {
        String token = register();
        String account = overview(token);
        String demo = overview(demoToken());
        mvc.perform(post("/api/v1/banking/transfers")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(request(JsonPath.read(account, "$.accounts[0].id"),
                    JsonPath.read(demo, "$.accounts[0].agency"),
                    JsonPath.read(demo, "$.accounts[0].number"),
                    "10.00", UUID.randomUUID().toString(), "Teste")))
            .andExpect(status().isForbidden());
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
