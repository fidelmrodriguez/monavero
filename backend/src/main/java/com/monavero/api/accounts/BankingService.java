package com.monavero.api.accounts;

import com.monavero.api.auth.AuthenticatedUser;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BankingService {
    private final BankAccountRepository accounts;
    private final AccountHolderRepository holders;
    private final BankTransactionRepository transactions;
    private final JdbcTemplate jdbc;

    public BankingService(BankAccountRepository accounts, AccountHolderRepository holders,
                          BankTransactionRepository transactions, JdbcTemplate jdbc) {
        this.accounts = accounts;
        this.holders = holders;
        this.transactions = transactions;
        this.jdbc = jdbc;
    }

    /** Cria uma conta somente quando necessário, serializando requisições concorrentes do mesmo usuário. */
    @Transactional
    public BankingDtos.Overview overview(AuthenticatedUser principal) {
        BankAccount account = accountFor(principal);
        List<BankingDtos.Movement> movements = transactions
            .findTop100ByAccountIdOrderByOccurredAtDesc(account.getId())
            .stream().map(tx -> new BankingDtos.Movement(
                tx.getId(), tx.getOccurredAt(), tx.getDescription(), tx.getCategory(),
                tx.getMovementType().toLowerCase(Locale.ROOT), "concluido",
                tx.getAmount(), "internet banking"))
            .toList();
        BankingDtos.Account summary = new BankingDtos.Account(account.getId(),
            account.getAccountType() == AccountType.SAVINGS ? "Conta poupança" : "Conta corrente",
            account.getBranchCode(), account.getAccountNumber(), account.getBalance(), account.getCurrency());
        return new BankingDtos.Overview(List.of(summary), movements);
    }

    private BankAccount accountFor(AuthenticatedUser principal) {
        // A trava transacional do PostgreSQL cobre duas abas e várias instâncias da aplicação.
        jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<Void>) connection -> {
            try (var statement = connection.prepareStatement("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))")) {
                statement.setString(1, principal.id().toString());
                statement.execute();
            }
            return null;
        });
        List<AccountHolder> belonging = holders.findByUserId(principal.id());
        if (!belonging.isEmpty()) {
            // Não expor uma conta de terceiro: a titularidade é a fonte de autorização.
            return accounts.findById(belonging.get(0).getAccountId()).orElseThrow();
        }
        String number = "MV" + UUID.randomUUID().toString().replace("-", "")
            .substring(0, 12).toUpperCase(Locale.ROOT);
        BankAccount account = accounts.saveAndFlush(new BankAccount(number, "0001", AccountType.CHECKING));
        holders.saveAndFlush(new AccountHolder(account.getId(), principal.id(), HolderRole.PRIMARY));
        if (principal.demo()) seedDemo(account);
        return account;
    }

    private void seedDemo(BankAccount account) {
        // Somente a identidade demonstrativa recebe lançamentos fictícios.
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        record Sample(int daysAgo, String description, String category, String type, String value) { }
        List<Sample> samples = List.of(
            new Sample(80, "Saldo inicial demonstrativo", "Recebimentos", "ENTRADA", "90000.00"),
            new Sample(54, "Salário de demonstração", "Recebimentos", "ENTRADA", "18500.00"),
            new Sample(42, "Pagamento demonstrativo", "Serviços", "PAGAMENTO", "-1750.40"),
            new Sample(30, "Compra demonstrativa", "Cartões", "SAIDA", "-1280.00"),
            new Sample(22, "Recebimento de demonstração", "Recebimentos", "ENTRADA", "4200.00"),
            new Sample(16, "Despesa de demonstração", "Serviços", "SAIDA", "-2380.25"),
            new Sample(8, "Aplicação demonstrativa", "Investimentos", "INVESTIMENTO", "-15000.00"),
            new Sample(3, "Pagamento demonstrativo", "Pagamentos", "PAGAMENTO", "-3569.00")
        );
        BigDecimal balance = BigDecimal.ZERO;
        List<BankTransaction> items = new ArrayList<>();
        for (Sample sample : samples) {
            BigDecimal amount = new BigDecimal(sample.value());
            balance = balance.add(amount);
            items.add(new BankTransaction(account.getId(), now.minusDays(sample.daysAgo()),
                sample.description(), sample.category(), sample.type(), amount));
        }
        transactions.saveAll(items);
        account.setDemonstrationBalance(balance);
        accounts.save(account);
    }
}
