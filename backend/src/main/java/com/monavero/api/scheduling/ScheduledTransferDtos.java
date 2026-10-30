package com.monavero.api.scheduling;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public final class ScheduledTransferDtos {
    private ScheduledTransferDtos() { }

    public record Request(
        @NotNull UUID originAccountId,
        @NotBlank @Pattern(regexp = "\\d{4}") String destinationAgency,
        @NotBlank @Pattern(regexp = "[A-Za-z0-9-]{5,20}") String destinationAccountNumber,
        @NotNull @DecimalMin("0.01") @DecimalMax("50000.00")
        @Digits(integer = 5, fraction = 2) BigDecimal amount,
        @Size(max = 160) String description,
        @NotNull @Future OffsetDateTime scheduledFor,
        @NotBlank @Pattern(regexp = "[0-9a-fA-F-]{36}") String idempotencyKey
    ) { }

    public record Item(UUID id, UUID originAccountId, String destinationAgency,
                       String destinationAccountNumber, BigDecimal amount, String description,
                       OffsetDateTime scheduledFor, OffsetDateTime createdAt,
                       String status, OffsetDateTime executedAt, UUID transferId,
                       String failureReason) { }
}
