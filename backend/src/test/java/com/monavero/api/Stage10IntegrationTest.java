package com.monavero.api;

import com.jayway.jsonpath.JsonPath;
import java.util.List;
import java.util.Map;
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
class Stage10IntegrationTest extends PostgresIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    private record Identity(UUID id, String email, String token) { }

    private Identity register() throws Exception {
        String email = UUID.randomUUID() + "@example.test";
        String body = mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Conta Pessoal\",\"email\":\"" + email +
                    "\",\"password\":\"senha-segura-original\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return new Identity(UUID.fromString(JsonPath.read(body, "$.user.id")), email,
            JsonPath.read(body, "$.accessToken"));
    }

    private String bearer(Identity user) { return "Bearer " + user.token(); }

    @Test
    void cartoesFicticiosSaoPrivadosPossuemLimiteECicloConsistente() throws Exception {
        Identity owner = register();
        Identity other = register();
        mvc.perform(get("/api/v1/cards")).andExpect(status().isUnauthorized());
        String created = mvc.perform(post("/api/v1/cards").header("Authorization", bearer(owner))
            .contentType(MediaType.APPLICATION_JSON).content("{\"label\":\"Meu teste\"}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("ACTIVE"))
            .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(created, "$.id");
        assertThat((String) JsonPath.read(created, "$.lastFour")).matches("[0-9]{4}");
        assertThat(created).doesNotContain("cvv", "cardNumber", "pan");
        mvc.perform(get("/api/v1/cards").header("Authorization", bearer(other)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(patch("/api/v1/cards/" + id + "/block").header("Authorization", bearer(other)))
            .andExpect(status().isNotFound());
        mvc.perform(patch("/api/v1/cards/" + id + "/block").header("Authorization", bearer(owner)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("BLOCKED"));
        mvc.perform(patch("/api/v1/cards/" + id + "/unblock").header("Authorization", bearer(owner)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACTIVE"));
        mvc.perform(patch("/api/v1/cards/" + id + "/cancel").header("Authorization", bearer(owner)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELED"));
        mvc.perform(patch("/api/v1/cards/" + id + "/unblock").header("Authorization", bearer(owner)))
            .andExpect(status().isConflict());
        for (int i = 0; i < 3; i++) {
            mvc.perform(post("/api/v1/cards").header("Authorization", bearer(owner))
                .contentType(MediaType.APPLICATION_JSON).content("{\"label\":\"Teste 0" + i + "\"}"))
                .andExpect(status().isCreated());
        }
        mvc.perform(post("/api/v1/cards").header("Authorization", bearer(owner))
            .contentType(MediaType.APPLICATION_JSON).content("{\"label\":\"Cartão adicional\"}"))
            .andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM demo_cards WHERE user_id = ?", Integer.class, owner.id()))
            .isEqualTo(4);
    }

    @Test
    void avisosPersistemSaoIsoladosESomenteTitularMarcaLeitura() throws Exception {
        Identity owner = register();
        Identity other = register();
        mvc.perform(post("/api/v1/cards").header("Authorization", bearer(owner))
            .contentType(MediaType.APPLICATION_JSON).content("{\"label\":\"Aviso de cartão\"}"))
            .andExpect(status().isCreated());
        String feed = mvc.perform(get("/api/v1/notifications").header("Authorization", bearer(owner)))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].read").value(false))
            .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(feed, "$[0].id");
        mvc.perform(get("/api/v1/notifications").header("Authorization", bearer(other)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(patch("/api/v1/notifications/" + id + "/read").header("Authorization", bearer(other)))
            .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/notifications").header("Authorization", bearer(owner)))
            .andExpect(jsonPath("$[0].read").value(false));
        mvc.perform(patch("/api/v1/notifications/" + id + "/read").header("Authorization", bearer(owner)))
            .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/notifications").header("Authorization", bearer(owner)))
            .andExpect(jsonPath("$[0].read").value(true));
        mvc.perform(patch("/api/v1/notifications/read-all").header("Authorization", bearer(owner)))
            .andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_notifications WHERE user_id = ?", Integer.class, owner.id()))
            .isEqualTo(1);
    }

    @Test
    void perfilAtualizaNomeRevogaSessoesAlheiasETrocaSenha() throws Exception {
        Identity owner = register();
        Identity other = register();
        String anotherLogin = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"" + owner.email() + "\",\"password\":\"senha-segura-original\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String otherToken = JsonPath.read(anotherLogin, "$.accessToken");
        String sessionsJson = mvc.perform(get("/api/v1/profile/sessions").header("Authorization", bearer(owner)))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        List<Map<String, Object>> sessions = JsonPath.read(sessionsJson, "$");
        assertThat(sessions).hasSize(2);
        String otherSessionId = sessions.stream().filter(it -> Boolean.FALSE.equals(it.get("current")))
            .map(it -> it.get("id").toString()).findFirst().orElseThrow();
        mvc.perform(delete("/api/v1/profile/sessions/" + otherSessionId)
            .header("Authorization", bearer(other))).andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/profile/sessions/" + otherSessionId)
            .header("Authorization", bearer(owner))).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + otherToken))
            .andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/v1/profile").header("Authorization", bearer(owner))
            .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Nome Atualizado\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Nome Atualizado"));
        mvc.perform(get("/api/v1/auth/me").header("Authorization", bearer(owner)))
            .andExpect(jsonPath("$.name").value("Nome Atualizado"));
        mvc.perform(post("/api/v1/profile/password").header("Authorization", bearer(owner))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"currentPassword\":\"senha-errada\",\"newPassword\":\"nova-senha-segura-2026\"}"))
            .andExpect(status().isUnprocessableEntity());
        mvc.perform(post("/api/v1/profile/password").header("Authorization", bearer(owner))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"currentPassword\":\"senha-segura-original\",\"newPassword\":\"nova-senha-segura-2026\"}"))
            .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/auth/me").header("Authorization", bearer(owner)))
            .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"" + owner.email() + "\",\"password\":\"nova-senha-segura-2026\"}"))
            .andExpect(status().isOk());
    }

    @Test
    void demoPublicaNaoPodeAlterarPerfilNemVerSessoesCompartilhadas() throws Exception {
        String token = JsonPath.read(mvc.perform(post("/api/v1/auth/demo"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString(), "$.accessToken");
        mvc.perform(patch("/api/v1/profile").header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Outro Nome\"}"))
            .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/profile/sessions").header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/profile/password").header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"currentPassword\":\"senha-segura-original\",\"newPassword\":\"nova-senha-segura-2026\"}"))
            .andExpect(status().isForbidden());
    }
}
