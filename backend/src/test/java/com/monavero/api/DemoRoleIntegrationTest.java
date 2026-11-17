package com.monavero.api;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** O perfil demo é validado pelo servidor por token, e não pelo menu Angular. */
@SpringBootTest
@AutoConfigureMockMvc
class DemoRoleIntegrationTest extends PostgresIntegrationTest {
    @Autowired MockMvc mvc;

    private String demo(String role) throws Exception {
        String body = mvc.perform(post("/api/v1/auth/demo")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"" + role + "\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.user.role").value(role))
            .andExpect(jsonPath("$.user.demo").value(true))
            .andReturn().getResponse().getContentAsString();
        String token = JsonPath.read(body, "$.accessToken");
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.role").value(role));
        return token;
    }

    @Test
    void clienteDemoNaoConsegueConsultarGestaoNemAuditoria() throws Exception {
        String token = demo("CLIENT");
        for (String url : new String[]{"/api/v1/admin/users", "/api/v1/admin/accounts",
                "/api/v1/admin/summary", "/api/v1/audit/events"}) {
            mvc.perform(get(url).header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
        }
    }

    @Test
    void gerenteDemoConsultaSemAlterarOuAuditar() throws Exception {
        String token = demo("MANAGER");
        mvc.perform(get("/api/v1/admin/summary").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalUsers").isNumber());
        mvc.perform(get("/api/v1/admin/users").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
        mvc.perform(get("/api/v1/admin/accounts").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
        mvc.perform(get("/api/v1/audit/events").header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden());
        mvc.perform(patch("/api/v1/admin/users/00000000-0000-0000-0000-000000000001")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\":\"BLOCKED\",\"version\":0,\"reason\":\"Validação permissão\"}"))
            .andExpect(status().isForbidden());
    }

    @Test
    void administradorDemoAcessaGestaoETrilhaAuditoria() throws Exception {
        String token = demo("ADMIN");
        mvc.perform(get("/api/v1/admin/summary").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
        mvc.perform(get("/api/v1/admin/users").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
        mvc.perform(get("/api/v1/audit/events").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
    }

    @Test
    void naoAceitaPerfilForaDaLista() throws Exception {
        mvc.perform(post("/api/v1/auth/demo").contentType(MediaType.APPLICATION_JSON)
            .content("{\"role\":\"SUPER_ADMIN\"}"))
            .andExpect(status().isBadRequest());
    }
}
