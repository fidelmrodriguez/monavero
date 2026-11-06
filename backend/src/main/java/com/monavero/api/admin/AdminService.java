package com.monavero.api.admin;

import com.monavero.api.auth.AuthenticatedUser;
import com.monavero.api.identity.AccessRole;
import com.monavero.api.identity.UserStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AdminService {
    private final JdbcTemplate jdbc;
    public AdminService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public record User(UUID id, String name, String email, AccessRole role,
                       UserStatus status, boolean demo, long version) { }
    public record Change(@NotNull AccessRole role, @NotNull UserStatus status,
                         @NotNull @PositiveOrZero Long version,
                         @NotBlank @Size(min = 5, max = 300) String reason) { }
    public record Event(UUID id, String actor, String target, String action,
                        String oldRole, String newRole, String oldStatus, String newStatus,
                        String reason, OffsetDateTime occurredAt) { }

    public record Account(UUID id, String number, String branch, String owner,
                          String status, java.math.BigDecimal balance) { }

    @Transactional(readOnly = true)
    public List<Account> accounts(int page) {
        checkPage(page);
        return jdbc.query("""
            SELECT a.*, u.full_name FROM bank_accounts a
            JOIN account_holders h ON h.account_id = a.id AND h.holder_role = 'PRIMARY'
            JOIN app_users u ON u.id = h.user_id
            ORDER BY a.created_at DESC, a.id DESC LIMIT 51 OFFSET ?
            """, (rs, row) -> new Account(rs.getObject("id", UUID.class),
                rs.getString("account_number"), rs.getString("branch_code"),
                rs.getString("full_name"), rs.getString("status"), rs.getBigDecimal("balance")), page * 50);
    }

    @Transactional(readOnly = true)
    public List<User> users(int page) {
        checkPage(page);
        return jdbc.query("SELECT * FROM app_users ORDER BY created_at DESC, id DESC LIMIT 51 OFFSET ?",
            (rs, row) -> user(rs), page * 50);
    }

    @Transactional(readOnly = true)
    public List<Event> events(int page) {
        checkPage(page);
        return jdbc.query("""
            SELECT e.*, a.email AS actor_email, t.email AS target_email
            FROM admin_audit_events e
            JOIN app_users a ON a.id = e.actor_id
            JOIN app_users t ON t.id = e.target_id
            ORDER BY e.occurred_at DESC, e.id DESC LIMIT 51 OFFSET ?
            """, (rs, row) -> new Event(rs.getObject("id", UUID.class),
                rs.getString("actor_email"), rs.getString("target_email"), rs.getString("action"),
                rs.getString("old_role"), rs.getString("new_role"), rs.getString("old_status"),
                rs.getString("new_status"), rs.getString("reason"),
                rs.getObject("occurred_at", OffsetDateTime.class)), page * 50);
    }

    @Transactional
    public User change(AuthenticatedUser actor, UUID id, Change change) {
        lockAdministration();
        // Revalida a autorização depois do lock, inclusive se outro administrador revogou o acesso.
        User currentActor = find(actor.id());
        if (currentActor.role() != AccessRole.ADMIN || currentActor.status() != UserStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        User old = find(id);
        if (actor.id().equals(id) || old.demo()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "A própria conta e a conta de demonstração não podem ser alteradas.");
        }
        if (change.reason().trim().length() < 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o motivo da alteração.");
        }
        // Retry da mesma alteração não duplica evento nem revoga uma nova sessão.
        if (old.role() == change.role() && old.status() == change.status()) return old;
        if (old.version() != change.version()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Este usuário foi atualizado. Recarregue os dados.");
        }
        if (old.role() == AccessRole.ADMIN && old.status() == UserStatus.ACTIVE
                && (change.role() != AccessRole.ADMIN || change.status() != UserStatus.ACTIVE)
                && jdbc.queryForObject("SELECT count(*) FROM app_users WHERE access_role = 'ADMIN' AND status = 'ACTIVE'",
                    Long.class) <= 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Mantenha um administrador ativo.");
        }
        jdbc.update("""
            UPDATE app_users SET access_role = ?, status = ?, admin_version = admin_version + 1,
                updated_at = now() WHERE id = ?
            """, change.role().name(), change.status().name(), id);
        jdbc.update("UPDATE auth_sessions SET revoked_at = now() WHERE user_id = ? AND revoked_at IS NULL", id);
        record(actor.id(), old, change.role(), change.status(), "USER_UPDATED", change.reason().trim());
        return find(id);
    }

    private void lockAdministration() {
        jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<Void>) connection -> {
            try (var statement = connection.prepareStatement("SELECT pg_advisory_xact_lock(901009)")) {
                statement.execute();
            }
            return null;
        });
    }

    private User find(UUID id) {
        List<User> users = jdbc.query("SELECT * FROM app_users WHERE id = ?", (rs, row) -> user(rs), id);
        if (users.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return users.get(0);
    }

    private void record(UUID actor, User old, AccessRole role, UserStatus status, String action, String reason) {
        jdbc.update("""
            INSERT INTO admin_audit_events(id, actor_id, target_id, action, old_role, new_role,
                old_status, new_status, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, UUID.randomUUID(), actor, old.id(), action, old.role().name(), role.name(),
            old.status().name(), status.name(), reason);
    }

    private static User user(ResultSet rs) throws SQLException {
        return new User(rs.getObject("id", UUID.class), rs.getString("full_name"), rs.getString("email"),
            AccessRole.valueOf(rs.getString("access_role")), UserStatus.valueOf(rs.getString("status")),
            rs.getBoolean("is_demo"), rs.getLong("admin_version"));
    }

    private static void checkPage(int page) {
        if (page < 0 || page > 100000) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
    }
}
