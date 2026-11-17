package com.monavero.api.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Correlaciona erros sem registrar corpo, query string, credenciais ou tokens. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestObservabilityFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(RequestObservabilityFilter.class);
    private static final long SLOW_REQUEST_MS = 5_000L;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        // Gerado pelo servidor: não confiar em IDs arbitrários fornecidos pelo cliente.
        String requestId = UUID.randomUUID().toString();
        response.setHeader("X-Request-Id", requestId);
        if (request.getRequestURI().startsWith("/api/")) {
            // Inclusive login, tokens de sessão e consultas bancárias.
            response.setHeader("Cache-Control", "no-store");
            response.setHeader("Pragma", "no-cache");
        }

        long started = System.nanoTime();
        try (MDC.MDCCloseable ignored = MDC.putCloseable("requestId", requestId)) {
            try {
                chain.doFilter(request, response);
            } finally {
                long elapsedMs = (System.nanoTime() - started) / 1_000_000L;
                int status = response.getStatus();
                // Não registrar caminhos (podem conter identificadores), parâmetros ou headers.
                if (status >= 500) {
                    log.warn("Falha HTTP method={} status={} durationMs={}",
                        request.getMethod(), status, elapsedMs);
                } else if (elapsedMs >= SLOW_REQUEST_MS) {
                    log.info("Requisicao lenta method={} status={} durationMs={}",
                        request.getMethod(), status, elapsedMs);
                }
            }
        }
    }
}
