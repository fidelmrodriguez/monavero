package com.monavero.api.identity;

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
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.UUID;

@Entity
@Table(name = "app_users")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "full_name", nullable = false, length = 160)
    private String fullName;

    @Column(nullable = false, length = 254)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private UserStatus status = UserStatus.ACTIVE;

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "access_role", nullable = false, length = 16)
    private AccessRole accessRole = AccessRole.CLIENT;

    @Column(name = "is_demo", nullable = false)
    private boolean demo = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected AppUser() { }

    public AppUser(String fullName, String email) {
        if (fullName == null || fullName.isBlank() || email == null || email.isBlank()) {
            throw new IllegalArgumentException("Nome e e-mail são obrigatórios");
        }
        this.fullName = fullName.trim();
        this.email = email.trim().toLowerCase(Locale.ROOT);
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

    public void configurePassword(String encodedPassword) {
        if (demo || encodedPassword == null || encodedPassword.isBlank()) {
            throw new IllegalArgumentException("Credencial inválida");
        }
        passwordHash = encodedPassword;
    }

    public void markAsDemo() {
        if (passwordHash != null) throw new IllegalStateException("Conta pessoal não pode ser demo");
        demo = true;
    }

    public String getPasswordHash() { return passwordHash; }
    public AccessRole getAccessRole() { return accessRole; }
    public boolean isDemo() { return demo; }
    public UUID getId() { return id; }
    public String getFullName() { return fullName; }
    public String getEmail() { return email; }
    public UserStatus getStatus() { return status; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
