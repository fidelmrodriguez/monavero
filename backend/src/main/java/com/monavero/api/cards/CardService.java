package com.monavero.api.cards;

import com.monavero.api.auth.AuthenticatedUser;
import com.monavero.api.notifications.NotificationService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.security.SecureRandom;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Apenas cartões ilustrativos: quatro dígitos fictícios e bloqueio local, sem emissão financeira. */
@Service
public class CardService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final JdbcTemplate jdbc;
    private final NotificationService notifications;

    public CardService(JdbcTemplate jdbc, NotificationService notifications) {
        this.jdbc = jdbc;
        this.notifications = notifications;
    }

    public record CreateRequest(@NotBlank @Size(min = 2, max = 40) String label) { }
    public record Card(UUID id, String label, String lastFour, String status,
                       OffsetDateTime createdAt, OffsetDateTime updatedAt) { }

    @Transactional(readOnly = true)
    public List<Card> list(AuthenticatedUser principal) {
        return jdbc.query("""
            SELECT * FROM demo_cards WHERE user_id = ? ORDER BY created_at DESC, id DESC
            """, (rs, i) -> card(rs), principal.id());
    }

    @Transactional
    public Card create(AuthenticatedUser principal, CreateRequest request) {
        String label = request.label().trim();
        if (label.length() < 2) throw badRequest();
        // Serialização também entre instâncias distintas da API.
        jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<Void>) connection -> {
            try (var statement = connection.prepareStatement("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))")) {
                statement.setString(1, "cards:" + principal.id());
                statement.execute();
            }
            return null;
        });
        Long active = jdbc.queryForObject("""
            SELECT count(*) FROM demo_cards WHERE user_id = ? AND status <> 'CANCELED'
            """, Long.class, principal.id());
        if (active != null && active >= 3) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Limite de três cartões demonstrativos ativos ou bloqueados.");
        }
        UUID id = UUID.randomUUID();
        String lastFour = String.format(Locale.ROOT, "%04d", RANDOM.nextInt(10000));
        jdbc.update("""
            INSERT INTO demo_cards (id, user_id, label, last_four, status) VALUES (?, ?, ?, ?, 'ACTIVE')
            """, id, principal.id(), label, lastFour);
        notifications.publish(principal.id(), "card-created:" + id, "Cartão demonstrativo criado",
            "Cartão virtual fictício final " + lastFour + " disponível para simulação.", "info");
        return find(principal.id(), id);
    }

    @Transactional
    public Card change(AuthenticatedUser principal, UUID id, String action) {
        String desired = switch (action) {
            case "block" -> "BLOCKED";
            case "unblock" -> "ACTIVE";
            case "cancel" -> "CANCELED";
            default -> throw badRequest();
        };
        List<String> states = jdbc.query("""
            SELECT status FROM demo_cards WHERE id = ? AND user_id = ? FOR UPDATE
            """, (rs, i) -> rs.getString(1), id, principal.id());
        if (states.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Cartão não encontrado.");
        String previous = states.get(0);
        if ("CANCELED".equals(previous) ||
                ("block".equals(action) && !"ACTIVE".equals(previous)) ||
                ("unblock".equals(action) && !"BLOCKED".equals(previous))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Transição de cartão não permitida.");
        }
        if (!previous.equals(desired)) {
            jdbc.update("UPDATE demo_cards SET status = ?, updated_at = now() WHERE id = ? AND user_id = ?",
                desired, id, principal.id());
            notifications.publish(principal.id(), null,
                "Cartão demonstrativo atualizado", "Situação alterada para " + desired + ".", "info");
        }
        return find(principal.id(), id);
    }

    private Card find(UUID userId, UUID id) {
        return jdbc.queryForObject("SELECT * FROM demo_cards WHERE id = ? AND user_id = ?",
            (rs, i) -> card(rs), id, userId);
    }

    private static Card card(ResultSet rs) throws SQLException {
        return new Card((UUID) rs.getObject("id"), rs.getString("label"), rs.getString("last_four"),
            rs.getString("status"), rs.getObject("created_at", OffsetDateTime.class),
            rs.getObject("updated_at", OffsetDateTime.class));
    }

    private static ResponseStatusException badRequest() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dados inválidos para cartão demonstrativo.");
    }
}
