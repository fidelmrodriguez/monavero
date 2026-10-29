package com.monavero.api.auth;

import com.monavero.api.identity.AppUser;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "auth_sessions")
public class AuthSession {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    // PostgreSQL retorna CHAR(64) como bpchar / JDBC Types.CHAR.
    // columnDefinition sozinho não muda o tipo JDBC padrão de String (VARCHAR).
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "token_hash", nullable = false, length = 64, unique = true,
            columnDefinition = "char(64)")
    private String tokenHash;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "revoked_at")
    private OffsetDateTime revokedAt;

    protected AuthSession() { }

    public AuthSession(AppUser user, String tokenHash, OffsetDateTime createdAt, OffsetDateTime expiresAt) {
        this.user = user;
        this.tokenHash = tokenHash;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    public void revoke(OffsetDateTime at) { this.revokedAt = at; }
    public AppUser getUser() { return user; }
    public String getTokenHash() { return tokenHash; }
}
