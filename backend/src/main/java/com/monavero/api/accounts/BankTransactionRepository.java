package com.monavero.api.accounts;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BankTransactionRepository extends JpaRepository<BankTransaction, UUID> {
    List<BankTransaction> findTop100ByAccountIdOrderByOccurredAtDesc(UUID accountId);
    long countByAccountId(UUID accountId);
}
