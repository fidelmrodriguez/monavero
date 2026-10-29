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
            .andExpect(jsonPath("$.accounts[0].balance").value(0.0))
            .andExpect(jsonPath("$.transactions.length()").value(0))
            .andReturn().getResponse().getContentAsString();
        String id2 = mvc.perform(get("/api/v1/banking/overview")
                .header("Authorization", "Bearer " + token2))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accounts[0].balance").value(0.0))
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
            .andExpect(jsonPath("$.accounts[0].id")
                .value(extractAccountId(id1)));
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
