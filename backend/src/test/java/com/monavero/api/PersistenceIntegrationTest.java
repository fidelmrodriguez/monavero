package com.monavero.api;

import com.monavero.api.accounts.AccountHolder;
import com.monavero.api.accounts.AccountHolderRepository;
import com.monavero.api.accounts.AccountType;
import com.monavero.api.accounts.BankAccount;
import com.monavero.api.accounts.BankAccountRepository;
import com.monavero.api.accounts.HolderRole;
import com.monavero.api.identity.AppUser;
import com.monavero.api.identity.AppUserRepository;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class PersistenceIntegrationTest extends PostgresIntegrationTest {

    @Autowired private AppUserRepository users;
    @Autowired private BankAccountRepository accounts;
    @Autowired private AccountHolderRepository holders;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void flywayCriaEstruturaVersionadaComRestrições() {
        Integer count = jdbc.queryForObject(
            "SELECT count(*) FROM flyway_schema_history WHERE version = '1' AND success = true", Integer.class);
        assertThat(count).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM information_schema.tables " +
            "WHERE table_schema = 'public' AND table_name IN ('app_users', 'bank_accounts', 'account_holders')", Integer.class))
            .isEqualTo(3);
    }

    @Test
    @Transactional
    void persisteUsuariosContasETitularidade() {
        var user = users.saveAndFlush(new AppUser("Ana Exemplo", "ANA@EXAMPLE.COM"));
        var account = accounts.saveAndFlush(new BankAccount("900001", "0001", AccountType.CHECKING));
        var holder = holders.saveAndFlush(new AccountHolder(account.getId(), user.getId(), HolderRole.PRIMARY));

        assertThat(users.findByEmailIgnoreCase("ana@example.com")).isPresent();
        assertThat(accounts.findByAccountNumber("900001")).isPresent();
        assertThat(holders.findByUserId(user.getId()))
            .extracting(AccountHolder::getId).containsExactly(holder.getId());
        assertThat(account.getBalance()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(account.getCreatedAt()).isNotNull();
        assertThat(user.getEmail()).isEqualTo("ana@example.com");
    }
}
