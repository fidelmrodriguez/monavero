package com.monavero.api;

import com.jayway.jsonpath.JsonPath;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Fluxo integrado para evitar regressão de autenticação, cartões e notificações no release. */
@SpringBootTest
@AutoConfigureMockMvc
class ReleaseIntegrationTest extends PostgresIntegrationTest {
    @Autowired MockMvc mvc;

    @Test
    void dadosPermanecemEntreSessoesMasNaoVazamEntreTitulares() throws Exception {
        String email = UUID.randomUUID() + "@example.test";
        String created = mvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Teste Release\",\"email\":\"" + email +
                    "\",\"password\":\"senha-segura-2026\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String originalToken = JsonPath.read(created, "$.accessToken");

        mvc.perform(post("/api/v1/cards")
                .header("Authorization", "Bearer " + originalToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"label\":\"Cartao de teste\"}"))
            .andExpect(status().isCreated());
        mvc.perform(patch("/api/v1/notifications/read-all")
                .header("Authorization", "Bearer " + originalToken))
            .andExpect(status().isNoContent());

        String reLogin = mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"senha-segura-2026\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String anotherToken = JsonPath.read(reLogin, "$.accessToken");
        mvc.perform(get("/api/v1/cards").header("Authorization", "Bearer " + anotherToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].label").value("Cartao de teste"));
        mvc.perform(get("/api/v1/notifications").header("Authorization", "Bearer " + anotherToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].read").value(true));

        String otherEmail = UUID.randomUUID() + "@example.test";
        String secondUser = mvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Outra Conta\",\"email\":\"" + otherEmail +
                    "\",\"password\":\"senha-segura-2026\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String otherToken = JsonPath.read(secondUser, "$.accessToken");
        mvc.perform(get("/api/v1/cards").header("Authorization", "Bearer " + otherToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/v1/notifications").header("Authorization", "Bearer " + otherToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void respostasPrivadasNaoSaoCacheaveisEErrosPossuemCorrelacao() throws Exception {
        mvc.perform(get("/api/v1/cards"))
            .andExpect(status().isUnauthorized())
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(header().exists("X-Request-Id"));
        mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"inexistente@example.test\",\"password\":\"senha-invalida\"}"))
            .andExpect(status().isUnauthorized())
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(header().exists("X-Request-Id"));
        mvc.perform(get("/actuator/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("UP"));
    }
}
