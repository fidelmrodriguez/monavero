package com.monavero.api.accounts;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public final class TransferDtos {
    private TransferDtos() { }

    public record Request(
        @NotNull UUID originAccountId,
        @NotBlank @Pattern(regexp = "\\d{4}") String destinationAgency,
        @NotBlank @Pattern(regexp = "[A-Za-z0-9-]{5,20}") String destinationAccountNumber,
        @NotNull @DecimalMin("0.01") @DecimalMax("50000.00")
        @Digits(integer = 5, fraction = 2) BigDecimal amount,
        @Size(max = 160) String description,
        @NotBlank @Pattern(regexp = "[0-9a-fA-F-]{36}") String idempotencyKey
    ) { }

    public record Receipt(UUID id, UUID originAccountId, UUID destinationAccountId,
                          BigDecimal amount, OffsetDateTime executedAt, String status) { }
}
