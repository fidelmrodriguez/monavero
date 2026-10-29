package com.monavero.api.accounts;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class BankingDtos {
    private BankingDtos() { }

    public record Account(UUID id, String label, String agency, String number,
                          BigDecimal balance, String currency) { }
    public record Movement(UUID id, OffsetDateTime date, String description, String category,
                           String type, String status, BigDecimal amount, String channel) { }
    public record Overview(List<Account> accounts, List<Movement> transactions) { }
}
