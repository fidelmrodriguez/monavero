-- Etapa 5: movimentações persistentes e vinculadas à conta; sem tocar em V1-V3.
CREATE TABLE account_transactions (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    occurred_at TIMESTAMPTZ NOT NULL,
    description VARCHAR(160) NOT NULL,
    category VARCHAR(80) NOT NULL,
    movement_type VARCHAR(16) NOT NULL,
    amount NUMERIC(19,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_account_transactions_amount CHECK (amount <> 0),
    CONSTRAINT ck_account_transactions_movement CHECK (
        movement_type IN ('ENTRADA', 'SAIDA', 'PAGAMENTO', 'TRANSFERENCIA', 'INVESTIMENTO')
    )
);
CREATE INDEX ix_account_transactions_account_date
    ON account_transactions (account_id, occurred_at DESC, id DESC);
