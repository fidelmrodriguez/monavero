package com.monavero.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SystemApiIntegrationTest extends PostgresIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void identificaAplicacao() throws Exception {
        mvc.perform(get("/api/v1/system/info"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.application").value("monavero-api"))
            .andExpect(jsonPath("$.status").value("available"));
    }

    @Test
    void publicaHealthCheckSemDetalhes() throws Exception {
        mvc.perform(get("/actuator/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void geraContratoOpenApi() throws Exception {
        mvc.perform(get("/v3/api-docs"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.info.title").value("Monavero API"));
    }

    @Test
    void permiteOrigemLocalDoAngular() throws Exception {
        mvc.perform(get("/api/v1/system/info")
                .header("Origin", "http://localhost:4200"))
            .andExpect(status().isOk())
            .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:4200"));
    }

    @Test
    void rejeitaOrigemNaoConfigurada() throws Exception {
        mvc.perform(get("/api/v1/system/info")
                .header("Origin", "https://site-desconhecido.example"))
            .andExpect(status().isForbidden());
    }
}
