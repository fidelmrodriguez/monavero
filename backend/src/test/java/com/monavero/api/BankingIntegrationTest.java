package com.monavero.api;

import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
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
class BankingIntegrationTest extends PostgresIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;

    private static String tokenFrom(String json) {
        Matcher matcher = Pattern.compile("\"accessToken\"\\s*:\\s*\"([^\"]+)\"").matcher(json);
        assertThat(matcher.find()).isTrue();
        return matcher.group(1);
    }

    private String register(String email) throws Exception {
        String body = "{\"name\":\"Conta Exemplo\",\"email\":\"" + email +
            "\",\"password\":\"senha-segura-2026\"}";
        String json = mvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return tokenFrom(json);
    }

    @Test
    void flywayV4PersistiuMovimentacoes() {
        assertThat(jdbc.queryForObject(
            "SELECT count(*) FROM flyway_schema_history WHERE version='4' AND success=true", Integer.class))
            .isEqualTo(1);
    }

    @Test
    void flywayV6DisponibilizaMarcadorDeCreditoUnico() {
        assertThat(jdbc.queryForObject(
            "SELECT count(*) FROM flyway_schema_history WHERE version='6' AND success=true", Integer.class))
            .isEqualTo(1);
    }

    @Test
    void acessoRequerToken() throws Exception {
        mvc.perform(get("/api/v1/banking/overview")).andExpect(status().isUnauthorized());
    }

    @Test
    void contasPessoaisSaoIsoladasEContinuamAposNovoLogin() throws Exception {
        String email1 = "conta-" + UUID.randomUUID() + "@example.test";
        String email2 = "conta-" + UUID.randomUUID() + "@example.test";
        String token1 = register(email1);
        String token2 = register(email2);
        String id1 = mvc.perform(get("/api/v1/banking/overview")
                .header("Authorization", "Bearer " + token1))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accounts[0].balance").value(1000.0))
            .andExpect(jsonPath("$.transactions.length()").value(1))
            .andExpect(jsonPath("$.transactions[0].description").value("Crédito de abertura"))
            .andReturn().getResponse().getContentAsString();
        String id2 = mvc.perform(get("/api/v1/banking/overview")
                .header("Authorization", "Bearer " + token2))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accounts[0].balance").value(1000.0))
            .andReturn().getResponse().getContentAsString();
        assertThat(id1).doesNotContain(email2);
        assertThat(id1).isNotEqualTo(id2);
        // Depois de novo login a conta vinculada ao UUID do usuário continua a mesma.
        String body = "{\"email\":\"" + email1 + "\",\"password\":\"senha-segura-2026\"}";
        String token3 = tokenFrom(mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        mvc.perform(get("/api/v1/banking/overview")
                .header("Authorization", "Bearer " + token3))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accounts[0].id").value(extractAccountId(id1)))
            .andExpect(jsonPath("$.accounts[0].balance").value(1000.0))
            .andExpect(jsonPath("$.transactions.length()").value(1));
        assertThat(jdbc.queryForObject(
            "SELECT count(*) FROM account_transactions WHERE account_id = ? AND description = 'Crédito de abertura'",
            Integer.class, UUID.fromString(extractAccountId(id1)))).isEqualTo(1);
    }

    @Test
    void lancamentosSemTransferIdNaoQuebramConsultaNemInventamContraparte() throws Exception {
        String token = register("sem-transfer-" + UUID.randomUUID() + "@example.test");
        mvc.perform(get("/api/v1/banking/overview")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.transactions.length()").value(1))
            .andExpect(jsonPath("$.transactions[0].description").value("Crédito de abertura"))
            .andExpect(jsonPath("$.transactions[0].counterpartyName").doesNotExist())
            .andExpect(jsonPath("$.transactions[0].counterpartyAgency").doesNotExist())
            .andExpect(jsonPath("$.transactions[0].counterpartyAccount").doesNotExist());
    }

    @Test
    void contaPessoalAntigaVaziaRecebeCreditoUmaUnicaVezSemDuplicarEmF5() throws Exception {
        String token = register("antiga-" + UUID.randomUUID() + "@example.test");
        String first = mvc.perform(get("/api/v1/banking/overview")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String accountId = extractAccountId(first);
        // Simula conta pessoal anterior à V6, ainda sem movimentações.
        jdbc.update("DELETE FROM account_transactions WHERE account_id = ?", UUID.fromString(accountId));
        jdbc.update("UPDATE bank_accounts SET balance = 0, sandbox_credit_provisioned = false WHERE id = ?",
            UUID.fromString(accountId));
        mvc.perform(get("/api/v1/banking/overview").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accounts[0].balance").value(1000.0));
        mvc.perform(get("/api/v1/banking/overview").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accounts[0].balance").value(1000.0))
            .andExpect(jsonPath("$.transactions.length()").value(1));
    }

    @Test
    void contaAntigaComHistoricoNaoRecebeCreditoInesperado() throws Exception {
        String token = register("movimentada-" + UUID.randomUUID() + "@example.test");
        String first = mvc.perform(get("/api/v1/banking/overview")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        UUID accountId = UUID.fromString(extractAccountId(first));
        jdbc.update("UPDATE bank_accounts SET balance = 0, sandbox_credit_provisioned = false WHERE id = ?", accountId);
        mvc.perform(get("/api/v1/banking/overview").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accounts[0].balance").value(0.0))
            .andExpect(jsonPath("$.transactions.length()").value(1));
        assertThat(jdbc.queryForObject("SELECT sandbox_credit_provisioned FROM bank_accounts WHERE id = ?",
            Boolean.class, accountId)).isTrue();
    }

    @Test
    void demonstracaoTemExtratoPersistidoSemCompartilharDadosComContasPessoais() throws Exception {
        String json = mvc.perform(post("/api/v1/auth/demo"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        mvc.perform(get("/api/v1/banking/overview")
                .header("Authorization", "Bearer " + tokenFrom(json)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accounts[0].balance").isNumber())
            .andExpect(jsonPath("$.transactions[0].description").exists());
    }

    private static String extractAccountId(String json) {
        Matcher matcher = Pattern.compile("\"id\"\\s*:\\s*\"([^\"]+)\"").matcher(json);
        assertThat(matcher.find()).isTrue();
        return matcher.group(1);
    }
}
