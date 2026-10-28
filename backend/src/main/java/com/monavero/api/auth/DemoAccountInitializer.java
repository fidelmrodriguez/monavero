package com.monavero.api.auth;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DemoAccountInitializer {
    @Bean
    ApplicationRunner provisionMonaveroDemo(AuthService auth) {
        return arguments -> auth.provisionDemo();
    }
}
