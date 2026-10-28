package com.monavero.api;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** PostgreSQL isolado: nunca utiliza o Neon nem as credenciais da Blitz. */
abstract class PostgresIntegrationTest {

    // Um container compartilhado para todas as classes de integração nesta execução Maven.
    private static final PostgreSQLContainer POSTGRES =
        new PostgreSQLContainer("postgres:18-alpine")
            .withDatabaseName("monavero_tests")
            .withUsername("monavero_test")
            .withPassword("monavero_test");

    static { POSTGRES.start(); }

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }
}
