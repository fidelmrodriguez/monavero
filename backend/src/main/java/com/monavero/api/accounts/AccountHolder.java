package com.monavero.api.accounts;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "account_holders")
public class AccountHolder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // As FKs estão no PostgreSQL; o módulo accounts não depende de entidades do módulo identity.
    @Column(name = "account_id", nullable = false)
    private UUID accountId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "holder_role", nullable = false, length = 16)
    private HolderRole holderRole;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected AccountHolder() { }

    public AccountHolder(UUID accountId, UUID userId, HolderRole role) {
        if (accountId == null || userId == null || role == null) {
            throw new IllegalArgumentException("Conta, usuário e tipo de titularidade são obrigatórios");
        }
        this.accountId = accountId;
        this.userId = userId;
        this.holderRole = role;
    }

    @PrePersist
    void onCreate() { createdAt = OffsetDateTime.now(ZoneOffset.UTC); }

    public UUID getId() { return id; }
    public UUID getAccountId() { return accountId; }
    public UUID getUserId() { return userId; }
    public HolderRole getHolderRole() { return holderRole; }
}
