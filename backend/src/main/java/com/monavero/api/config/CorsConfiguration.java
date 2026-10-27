package com.monavero.api.config;

import java.util.Arrays;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfiguration {

    @Bean
    WebMvcConfigurer monaveroCors(
            @Value("${monavero.cors.allowed-origins}") String origins) {
        String[] allowed = Arrays.stream(origins.split(","))
            .map(String::trim)
            .filter(value -> !value.isBlank())
            .toArray(String[]::new);

        if (allowed.length == 0 || Arrays.asList(allowed).contains("*")) {
            throw new IllegalStateException(
                "MONAVERO_CORS_ALLOWED_ORIGINS deve conter origens HTTP(S) explícitas"
            );
        }

        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                    .allowedOrigins(allowed)
                    .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                    .allowedHeaders("Content-Type", "Authorization", "X-Request-Id", "Idempotency-Key")
                    .allowCredentials(false)
                    .maxAge(3600);
            }
        };
    }
}
