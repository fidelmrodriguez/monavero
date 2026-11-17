package com.monavero.api.config;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class RequestObservabilityFilterTest {
    private final RequestObservabilityFilter filter = new RequestObservabilityFilter();

    @Test
    void protegeRespostasDaApiEGeraIdDeCorrelacaoSemAceitarHeaderExterno() throws Exception {
        var request = new MockHttpServletRequest("GET", "/api/v1/banking/overview");
        request.addHeader("X-Request-Id", "id-injetado-pelo-cliente");
        var response = new MockHttpServletResponse();
        filter.doFilter(request, response, (req, res) -> {
            assertThat(MDC.get("requestId")).isNotBlank();
            assertThat(((MockHttpServletResponse) res).getHeader("X-Request-Id"))
                .isEqualTo(MDC.get("requestId"));
            ((MockHttpServletResponse) res).setStatus(401);
        });
        String id = response.getHeader("X-Request-Id");
        assertThat(UUID.fromString(id).toString()).isEqualTo(id);
        assertThat(id).isNotEqualTo("id-injetado-pelo-cliente");
        assertThat(response.getHeader("Cache-Control")).isEqualTo("no-store");
        assertThat(response.getHeader("Pragma")).isEqualTo("no-cache");
        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(MDC.get("requestId")).isNull();
    }

    @Test
    void naoAplicaPoliticaDeCachePrivadoAoHealthCheckPublico() throws Exception {
        var request = new MockHttpServletRequest("GET", "/actuator/health");
        var response = new MockHttpServletResponse();
        filter.doFilter(request, response, (req, res) -> { });
        assertThat(response.getHeader("X-Request-Id")).isNotBlank();
        assertThat(response.getHeader("Cache-Control")).isNull();
        assertThat(MDC.get("requestId")).isNull();
    }
}
