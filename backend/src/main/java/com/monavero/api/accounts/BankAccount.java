package com.monavero.api.accounts;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "bank_accounts")
public class BankAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "account_number", nullable = false, length = 20, unique = true)
    private String accountNumber;

    @Column(name = "branch_code", nullable = false, length = 10)
    private String branchCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_type", nullable = false, length = 16)
    private AccountType accountType;

    @Column(nullable = false, length = 3)
    private String currency = "BRL";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private AccountStatus status = AccountStatus.ACTIVE;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal balance = BigDecimal.ZERO.setScale(2);

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected BankAccount() { }

    public BankAccount(String accountNumber, String branchCode, AccountType accountType) {
        if (accountNumber == null || accountNumber.isBlank() || branchCode == null || branchCode.isBlank() || accountType == null) {
            throw new IllegalArgumentException("Número, agência e tipo são obrigatórios");
        }
        this.accountNumber = accountNumber.trim();
        this.branchCode = branchCode.trim();
        this.accountType = accountType;
    }

    @PrePersist
    void onCreate() {
        createdAt = OffsetDateTime.now(ZoneOffset.UTC);
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    /** Apenas dados fictícios iniciais; operações financeiras terão regras próprias na Etapa 6. */
    void setDemonstrationBalance(BigDecimal initialBalance) {
        if (initialBalance == null || initialBalance.signum() < 0) {
            throw new IllegalArgumentException("Saldo de demonstração inválido");
        }
        balance = initialBalance.setScale(2);
    }

    public UUID getId() { return id; }
    public String getAccountNumber() { return accountNumber; }
    public String getBranchCode() { return branchCode; }
    public AccountType getAccountType() { return accountType; }
    public String getCurrency() { return currency; }
    public AccountStatus getStatus() { return status; }
    public BigDecimal getBalance() { return balance; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
