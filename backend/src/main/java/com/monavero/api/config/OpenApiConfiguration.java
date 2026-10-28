package com.monavero.api.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfiguration {

    @Bean
    OpenAPI monaveroOpenApi() {
        return new OpenAPI().info(new Info()
            .title("Monavero API")
            .version("0.4.0")
            .description("API do sistema bancário demonstrativo. Sem operações financeiras reais."));
    }
}
