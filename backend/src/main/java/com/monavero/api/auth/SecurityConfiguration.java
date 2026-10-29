package com.monavero.api.auth;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity
public class SecurityConfiguration {
    @Bean
    PasswordEncoder monaveroPasswordEncoder() { return new BCryptPasswordEncoder(12); }

    @Bean
    SecurityFilterChain monaveroSecurity(HttpSecurity http, TokenService tokens) throws Exception {
        return http
            .csrf(csrf -> csrf.disable()) // API stateless com Bearer; sem cookies de autenticação.
            .cors(Customizer.withDefaults())
            .httpBasic(basic -> basic.disable())
            .formLogin(form -> form.disable())
            .logout(logout -> logout.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((request, response, ex) -> response.sendError(401))
                .accessDeniedHandler((request, response, ex) -> response.sendError(403)))
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/system/info", "/actuator/health").permitAll()
                .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/auth/demo").permitAll()
                .requestMatchers("/api/v1/auth/**", "/api/v1/banking/**").authenticated()
                .anyRequest().denyAll())
            .addFilterBefore(new BearerAuthenticationFilter(tokens), UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
