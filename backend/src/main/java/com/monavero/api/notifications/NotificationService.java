package com.monavero.api.notifications;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Avisos gerados apenas pela API, em operações efetivamente confirmadas. */
@Service
public class NotificationService {
    private final JdbcTemplate jdbc;

    public NotificationService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public record Item(UUID id, OffsetDateTime date, String title, String description, boolean read, String type) { }

    @Transactional(readOnly = true)
    public List<Item> list(UUID userId) {
        return jdbc.query("""
            SELECT id, created_at, title, description, read_at, type
              FROM user_notifications WHERE user_id = ?
              ORDER BY created_at DESC, id DESC LIMIT 100
            """, (rs, row) -> item(rs), userId);
    }

    @Transactional
    public void markRead(UUID userId, UUID notificationId) {
        jdbc.update("""
            UPDATE user_notifications SET read_at = now()
            WHERE id = ? AND user_id = ? AND read_at IS NULL
            """, notificationId, userId);
    }

    @Transactional
    public void markAllRead(UUID userId) {
        jdbc.update("UPDATE user_notifications SET read_at = now() WHERE user_id = ? AND read_at IS NULL", userId);
    }

    /** Pode ser invocado dentro da transação bancária: rollback desfaz também a notificação. */
    @Transactional
    public void publish(UUID userId, String key, String title, String description, String type) {
        jdbc.update("""
            INSERT INTO user_notifications (id, user_id, event_key, title, description, type)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT (user_id, event_key) DO NOTHING
            """, UUID.randomUUID(), userId, key, title, description, type);
    }

    private static Item item(ResultSet rs) throws SQLException {
        return new Item((UUID) rs.getObject("id"), rs.getObject("created_at", OffsetDateTime.class),
            rs.getString("title"), rs.getString("description"), rs.getObject("read_at") != null,
            rs.getString("type"));
    }
}
