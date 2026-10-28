package com.monavero.api.accounts;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountHolderRepository extends JpaRepository<AccountHolder, UUID> {
    List<AccountHolder> findByUserId(UUID userId);
    List<AccountHolder> findByAccountId(UUID accountId);
}
