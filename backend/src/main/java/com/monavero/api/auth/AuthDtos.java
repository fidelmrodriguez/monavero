package com.monavero.api.auth;

import com.monavero.api.identity.AccessRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.UUID;

public final class AuthDtos {
    private AuthDtos() { }

    public record RegisterRequest(
        @NotBlank @Size(min = 2, max = 160) String name,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(min = 12, max = 72) String password) { }

    public record LoginRequest(
        @NotBlank String email,
        @NotBlank String password) { }

    public record Profile(UUID id, String email, String name, AccessRole role, boolean demo) { }

    public record LoginResponse(String accessToken, OffsetDateTime expiresAt, Profile user) { }
}
