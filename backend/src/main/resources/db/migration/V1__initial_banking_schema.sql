-- Monavero: estrutura inicial para dados exclusivamente demonstrativos.
-- Migrações posteriores devem criar novos arquivos Vn__; não modificar esta versão após aplicação.
CREATE TABLE app_users (
    id UUID PRIMARY KEY,
    full_name VARCHAR(160) NOT NULL,
    email VARCHAR(254) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_app_users_name_not_blank CHECK (length(btrim(full_name)) > 0),
    CONSTRAINT ck_app_users_email_not_blank CHECK (length(btrim(email)) > 0),
    CONSTRAINT ck_app_users_status CHECK (status IN ('ACTIVE', 'BLOCKED'))
);
CREATE UNIQUE INDEX uq_app_users_email_normalized ON app_users (lower(email));

CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY,
    account_number VARCHAR(20) NOT NULL UNIQUE,
    branch_code VARCHAR(10) NOT NULL,
    account_type VARCHAR(16) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    balance NUMERIC(19,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_bank_accounts_number CHECK (length(btrim(account_number)) > 0),
    CONSTRAINT ck_bank_accounts_branch CHECK (length(btrim(branch_code)) > 0),
    CONSTRAINT ck_bank_accounts_type CHECK (account_type IN ('CHECKING', 'SAVINGS')),
    CONSTRAINT ck_bank_accounts_currency CHECK (currency = 'BRL'),
    CONSTRAINT ck_bank_accounts_status CHECK (status IN ('ACTIVE', 'BLOCKED', 'CLOSED')),
    CONSTRAINT ck_bank_accounts_balance CHECK (balance >= 0)
);

-- Titularidade vinculada por UUID, sem exigir dependência Java entre os módulos de identidade e contas.
CREATE TABLE account_holders (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    holder_role VARCHAR(16) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_account_holders_account_user UNIQUE (account_id, user_id),
    CONSTRAINT ck_account_holders_role CHECK (holder_role IN ('PRIMARY', 'CO_HOLDER'))
);
CREATE UNIQUE INDEX uq_account_holders_single_primary ON account_holders (account_id)
    WHERE holder_role = 'PRIMARY';
CREATE INDEX ix_account_holders_user ON account_holders (user_id);
