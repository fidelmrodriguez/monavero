package com.monavero.api;

import com.jayway.jsonpath.JsonPath;
import java.util.UUID;
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
class AdminIntegrationTest extends PostgresIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    private record Login(UUID id, String token) { }

    private Login register(String role) throws Exception {
        String body = mvc.perform(post("/api/v1/auth/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Teste administrativo\",\"email\":\"" + UUID.randomUUID() +
                "@example.test\",\"password\":\"senha-segura-2026\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        UUID id = UUID.fromString(JsonPath.read(body, "$.user.id"));
        jdbc.update("UPDATE app_users SET access_role = ? WHERE id = ?", role, id);
        return new Login(id, JsonPath.read(body, "$.accessToken"));
    }

    private String change(String role, String status, long version) {
        return "{\"role\":\"" + role + "\",\"status\":\"" + status +
            "\",\"version\":" + version + ",\"reason\":\"Validação de administração\"}";
    }

    @Test
    void demonstracaoPublicaAdministraUsuariosEConsultaContas() throws Exception {
        String body = mvc.perform(post("/api/v1/auth/demo"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.user.role").value("ADMIN"))
            .andReturn().getResponse().getContentAsString();
        String token = JsonPath.read(body, "$.accessToken");
        Login client = register("CLIENT");
        mvc.perform(get("/api/v1/admin/users").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
        mvc.perform(get("/api/v1/admin/accounts").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
        mvc.perform(patch("/api/v1/admin/users/" + client.id())
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON).content(change("MANAGER", "ACTIVE", 0)))
            .andExpect(status().isOk());
        mvc.perform(get("/api/v1/audit/events").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM admin_audit_events WHERE target_id = ?",
            Long.class, client.id())).isEqualTo(1);
    }

    @Test
    void clienteNaoAcessaAdministracaoNemAuditoria() throws Exception {
        Login client = register("CLIENT");
        mvc.perform(get("/api/v1/admin/users")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/users").header("Authorization", "Bearer " + client.token()))
            .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/audit/events").header("Authorization", "Bearer " + client.token()))
            .andExpect(status().isForbidden());
        mvc.perform(patch("/api/v1/admin/users/" + client.id())
            .header("Authorization", "Bearer " + client.token())
            .contentType(MediaType.APPLICATION_JSON).content(change("ADMIN", "ACTIVE", 0)))
            .andExpect(status().isForbidden());
    }

    @Test
    void gerenteConsultaAuditoriaMasNaoAlteraUsuarios() throws Exception {
        Login manager = register("MANAGER");
        mvc.perform(get("/api/v1/audit/events").header("Authorization", "Bearer " + manager.token()))
            .andExpect(status().isOk());
        mvc.perform(patch("/api/v1/admin/users/" + manager.id())
            .header("Authorization", "Bearer " + manager.token())
            .contentType(MediaType.APPLICATION_JSON).content(change("ADMIN", "ACTIVE", 0)))
            .andExpect(status().isForbidden());
    }

    @Test
    void bloqueioRevogaSessaoEAuditaSemDuplicarEmRetry() throws Exception {
        Login admin = register("ADMIN");
        Login client = register("CLIENT");
        String request = change("CLIENT", "BLOCKED", 0);
        for (int retry = 0; retry < 2; retry++) {
            mvc.perform(patch("/api/v1/admin/users/" + client.id())
                .header("Authorization", "Bearer " + admin.token())
                .contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("BLOCKED"))
                .andExpect(jsonPath("$.version").value(1));
        }
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + client.token()))
            .andExpect(status().isUnauthorized());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM admin_audit_events WHERE target_id = ?",
            Long.class, client.id())).isEqualTo(1);
        mvc.perform(patch("/api/v1/admin/users/" + client.id())
            .header("Authorization", "Bearer " + admin.token())
            .contentType(MediaType.APPLICATION_JSON).content(change("CLIENT", "ACTIVE", 0)))
            .andExpect(status().isConflict());
        mvc.perform(patch("/api/v1/admin/users/" + client.id())
            .header("Authorization", "Bearer " + admin.token())
            .contentType(MediaType.APPLICATION_JSON).content(change("CLIENT", "ACTIVE", 1)))
            .andExpect(status().isOk());
        // Desbloquear não ressuscita tokens revogados.
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + client.token()))
            .andExpect(status().isUnauthorized());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM admin_audit_events WHERE target_id = ?",
            Long.class, client.id())).isEqualTo(2);
    }

    @Test
    void impedeAutoAlteracaoEAtualizaPapelComRevogacao() throws Exception {
        Login admin = register("ADMIN");
        Login client = register("CLIENT");
        mvc.perform(patch("/api/v1/admin/users/" + admin.id())
            .header("Authorization", "Bearer " + admin.token())
            .contentType(MediaType.APPLICATION_JSON).content(change("CLIENT", "BLOCKED", 0)))
            .andExpect(status().isConflict());
        mvc.perform(patch("/api/v1/admin/users/" + client.id())
            .header("Authorization", "Bearer " + admin.token())
            .contentType(MediaType.APPLICATION_JSON).content(change("MANAGER", "ACTIVE", 0)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("MANAGER"));
        mvc.perform(get("/api/v1/audit/events").header("Authorization", "Bearer " + client.token()))
            .andExpect(status().isUnauthorized());
        assertThat(jdbc.queryForObject("SELECT new_role FROM admin_audit_events WHERE target_id = ?",
            String.class, client.id())).isEqualTo("MANAGER");
    }
}
