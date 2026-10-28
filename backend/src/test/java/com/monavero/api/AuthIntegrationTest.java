package com.monavero.api;

import com.monavero.api.identity.AppUserRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AuthIntegrationTest extends PostgresIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired AppUserRepository users;

    private String uniqueEmail() { return "user-" + UUID.randomUUID() + "@example.test"; }

    private String register(String email) throws Exception {
        String payload = "{\"name\":\"Conta Teste\",\"email\":\"" + email +
            "\",\"password\":\"uma-senha-segura-2026\"}";
        return mvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON).content(payload))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.user.role").value("CLIENT"))
            .andExpect(jsonPath("$.user.demo").value(false))
            .andReturn().getResponse().getContentAsString();
    }

    private static String tokenFrom(String json) {
        Matcher matcher = Pattern.compile("\\\"accessToken\\\"\\s*:\\s*\\\"([^\\\"]+)\\\"").matcher(json);
        assertThat(matcher.find()).isTrue();
        return matcher.group(1);
    }

    @Test
    void cadastroLogoutLoginPosteriorERevogacaoDeSessao() throws Exception {
        String email = uniqueEmail();
        String firstToken = tokenFrom(register(email));
        assertThat(firstToken).hasSize(43);
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + firstToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value(email));

        mvc.perform(post("/api/v1/auth/logout").header("Authorization", "Bearer " + firstToken))
            .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + firstToken))
            .andExpect(status().isUnauthorized());

        String body = "{\"email\":\"" + email +
            "\",\"password\":\"uma-senha-segura-2026\"}";
        String second = mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.user.email").value(email))
            .andReturn().getResponse().getContentAsString();
        assertThat(tokenFrom(second)).isNotEqualTo(firstToken);

        // Somente o hash SHA-256 é armazenado, nunca o token bruto.
        Long count = jdbc.queryForObject(
            "SELECT count(*) FROM auth_sessions WHERE token_hash = ?", Long.class, firstToken);
        assertThat(count).isZero();
    }

    @Test
    void cadastroNaoAceitaDuplicidadeNemPrivilegiosDoCliente() throws Exception {
        String email = uniqueEmail();
        register(email);
        String body = "{\"name\":\"Outra pessoa\",\"email\":\"" + email +
            "\",\"password\":\"uma-senha-segura-2026\",\"role\":\"ADMIN\"}";
        mvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isConflict());
        assertThat(users.findByEmailIgnoreCase(email).orElseThrow().getAccessRole().name()).isEqualTo("CLIENT");
    }

    @Test
    void rejeitaSenhaErradaEUsuarioInexistenteComMesmoStatus() throws Exception {
        String email = uniqueEmail();
        register(email);
        for (String user : new String[]{email, "nao-existe@example.test"}) {
            mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + user + "\",\"password\":\"senha-errada\"}"))
                .andExpect(status().isUnauthorized());
        }
    }

    @Test
    void acessoDemonstrativoTemSessaoRealSemAdmin() throws Exception {
        String body = mvc.perform(post("/api/v1/auth/demo"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.user.role").value("CLIENT"))
            .andExpect(jsonPath("$.user.demo").value(true))
            .andReturn().getResponse().getContentAsString();
        mvc.perform(get("/api/v1/auth/me")
                .header("Authorization", "Bearer " + tokenFrom(body)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.demo").value(true));
    }

    @Test
    void protegeMeSemTokenERejeitaSenhaFracaNoCadastro() throws Exception {
        mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Conta\",\"email\":\"a@example.test\",\"password\":\"1234\"}"))
            .andExpect(status().isBadRequest());
    }
}
