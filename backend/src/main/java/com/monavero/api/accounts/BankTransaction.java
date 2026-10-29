package com.monavero.api.accounts;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "account_transactions")
public class BankTransaction {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "account_id", nullable = false)
    private UUID accountId;

    @Column(name = "occurred_at", nullable = false)
    private OffsetDateTime occurredAt;

    @Column(nullable = false, length = 160)
    private String description;

    @Column(nullable = false, length = 80)
    private String category;

    @Column(name = "movement_type", nullable = false, length = 16)
    private String movementType;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    protected BankTransaction() { }

    public BankTransaction(UUID accountId, OffsetDateTime occurredAt, String description,
                           String category, String movementType, BigDecimal amount) {
        if (accountId == null || occurredAt == null || description == null || category == null ||
                movementType == null || amount == null || amount.signum() == 0) {
            throw new IllegalArgumentException("Lançamento inválido");
        }
        this.accountId = accountId;
        this.occurredAt = occurredAt;
        this.description = description;
        this.category = category;
        this.movementType = movementType;
        this.amount = amount;
    }

    public UUID getId() { return id; }
    public UUID getAccountId() { return accountId; }
    public OffsetDateTime getOccurredAt() { return occurredAt; }
    public String getDescription() { return description; }
    public String getCategory() { return category; }
    public String getMovementType() { return movementType; }
    public BigDecimal getAmount() { return amount; }
}
