package com.monavero.api.auth;

import com.monavero.api.identity.AppUser;
import com.monavero.api.identity.AppUserRepository;
import com.monavero.api.identity.UserStatus;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
    private static final String DEMO_EMAIL = "demo@monavero.invalid";
    private final AppUserRepository users;
    private final PasswordEncoder passwords;
    private final TokenService tokens;
    private final boolean demoEnabled;

    public AuthService(AppUserRepository users, PasswordEncoder passwords, TokenService tokens,
                       @Value("${monavero.demo.enabled:true}") boolean demoEnabled) {
        this.users = users;
        this.passwords = passwords;
        this.tokens = tokens;
        this.demoEnabled = demoEnabled;
    }

    @Transactional
    public AuthDtos.LoginResponse register(AuthDtos.RegisterRequest request) {
        String email = normalize(request.email());
        validatePassword(request.password());
        if (users.findByEmailIgnoreCase(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Não foi possível concluir o cadastro.");
        }
        AppUser user = new AppUser(request.name(), email);
        user.configurePassword(passwords.encode(request.password()));
        return tokens.issue(users.saveAndFlush(user));
    }

    @Transactional
    public AuthDtos.LoginResponse login(AuthDtos.LoginRequest request) {
        String email = normalize(request.email());
        AppUser user = users.findByEmailIgnoreCase(email)
            .orElseThrow(AuthService::invalidLogin);
        if (user.isDemo() || user.getStatus() != UserStatus.ACTIVE ||
                user.getPasswordHash() == null ||
                !passwords.matches(request.password(), user.getPasswordHash())) {
            throw invalidLogin();
        }
        return tokens.issue(user);
    }

    @Transactional
    public AuthDtos.LoginResponse demo() {
        if (!demoEnabled) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        AppUser demo = users.findByEmailIgnoreCase(DEMO_EMAIL)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE));
        if (!demo.isDemo() || demo.getStatus() != UserStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);
        }
        return tokens.issue(demo);
    }

    @Transactional
    public void provisionDemo() {
        if (!demoEnabled) return;
        if (users.findByEmailIgnoreCase(DEMO_EMAIL).isEmpty()) {
            AppUser demo = new AppUser("Demonstração Monavero", DEMO_EMAIL);
            demo.markAsDemo();
            users.save(demo);
        }
    }

    private static String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private static void validatePassword(String password) {
        if (password == null || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Senha inválida.");
        }
    }

    private static ResponseStatusException invalidLogin() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-mail ou senha inválidos.");
    }
}
