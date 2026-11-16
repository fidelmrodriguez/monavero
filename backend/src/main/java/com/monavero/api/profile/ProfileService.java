package com.monavero.api.profile;

import com.monavero.api.auth.AuthDtos;
import com.monavero.api.auth.AuthenticatedUser;
import com.monavero.api.auth.TokenService;
import com.monavero.api.identity.AppUser;
import com.monavero.api.identity.AppUserRepository;
import com.monavero.api.notifications.NotificationService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.nio.charset.StandardCharsets;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProfileService {
    private final AppUserRepository users;
    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwords;
    private final NotificationService notifications;

    public ProfileService(AppUserRepository users, JdbcTemplate jdbc, PasswordEncoder passwords,
                          NotificationService notifications) {
        this.users = users;
        this.jdbc = jdbc;
        this.passwords = passwords;
        this.notifications = notifications;
    }

    public record NameRequest(@NotBlank @Size(min = 2, max = 160) String name) { }
    public record PasswordRequest(@NotBlank String currentPassword, @NotBlank String newPassword) { }
    public record Session(UUID id, OffsetDateTime createdAt, OffsetDateTime expiresAt, boolean current) { }

    @Transactional
    public AuthDtos.Profile rename(AuthenticatedUser principal, NameRequest request) {
        AppUser user = personal(principal);
        if (request.name().trim().length() < 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nome inválido.");
        }
        user.rename(request.name());
        users.saveAndFlush(user);
        notifications.publish(user.getId(), null, "Perfil atualizado", "Nome de exibição atualizado com sucesso.", "success");
        return TokenService.profile(user);
    }

    @Transactional
    public void changePassword(AuthenticatedUser principal, PasswordRequest request) {
        AppUser user = personal(principal);
        String candidate = request.newPassword();
        if (candidate == null || candidate.length() < 12 || candidate.length() > 72 ||
                candidate.getBytes(StandardCharsets.UTF_8).length > 72 ||
                passwords.matches(candidate, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nova senha inválida ou igual à atual.");
        }
        if (request.currentPassword() == null || !passwords.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Senha atual incorreta.");
        }
        user.configurePassword(passwords.encode(candidate));
        users.saveAndFlush(user);
        // O usuário precisará entrar novamente; nenhuma sessão antiga permanece válida.
        jdbc.update("UPDATE auth_sessions SET revoked_at = now() WHERE user_id = ? AND revoked_at IS NULL", user.getId());
    }

    @Transactional(readOnly = true)
    public List<Session> sessions(AuthenticatedUser principal) {
        personal(principal);
        return jdbc.query("""
            SELECT id, created_at, expires_at, token_hash FROM auth_sessions
            WHERE user_id = ? AND revoked_at IS NULL AND expires_at > now()
            ORDER BY created_at DESC, id DESC LIMIT 50
            """, (rs, row) -> session(rs, principal.tokenHash()), principal.id());
    }

    @Transactional
    public void revokeSession(AuthenticatedUser principal, UUID sessionId) {
        personal(principal);
        List<String> hash = jdbc.query("""
            SELECT token_hash FROM auth_sessions
            WHERE id = ? AND user_id = ? AND revoked_at IS NULL AND expires_at > now() FOR UPDATE
            """, (rs, row) -> rs.getString(1), sessionId, principal.id());
        if (hash.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Sessão não encontrada.");
        if (principal.tokenHash().equals(hash.get(0))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Use sair da conta para encerrar a sessão atual.");
        }
        jdbc.update("UPDATE auth_sessions SET revoked_at = now() WHERE id = ? AND user_id = ?", sessionId, principal.id());
        notifications.publish(principal.id(), null, "Sessão encerrada", "Um outro acesso foi desconectado.", "warning");
    }

    private AppUser personal(AuthenticatedUser principal) {
        if (principal.demo()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "O perfil público de demonstração é somente leitura.");
        }
        return users.findById(principal.id())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    private static Session session(ResultSet rs, String tokenHash) throws SQLException {
        return new Session((UUID) rs.getObject("id"), rs.getObject("created_at", OffsetDateTime.class),
            rs.getObject("expires_at", OffsetDateTime.class), tokenHash.equals(rs.getString("token_hash")));
    }
}
