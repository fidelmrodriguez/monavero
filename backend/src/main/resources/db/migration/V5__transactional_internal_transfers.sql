-- Etapa 6: transferências imediatas, exclusivamente entre contas internas do Monavero.
-- Sem alterações destrutivas nas migrações V1-V4 ou nos lançamentos já persistidos.
CREATE TABLE bank_transfers (
    id UUID PRIMARY KEY,
    requester_id UUID NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    origin_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    destination_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    destination_agency VARCHAR(10) NOT NULL,
    destination_number VARCHAR(20) NOT NULL,
    request_key VARCHAR(64) NOT NULL,
    amount NUMERIC(19,2) NOT NULL,
    description VARCHAR(160) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_bank_transfers_request UNIQUE (requester_id, request_key),
    CONSTRAINT ck_bank_transfers_amount CHECK (amount >= 0.01 AND amount <= 50000.00),
    CONSTRAINT ck_bank_transfers_different CHECK (origin_account_id <> destination_account_id)
);
CREATE INDEX ix_bank_transfers_origin_date ON bank_transfers (origin_account_id, created_at DESC);
ALTER TABLE account_transactions ADD COLUMN transfer_id UUID NULL REFERENCES bank_transfers(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX uk_account_transactions_transfer_leg
    ON account_transactions (account_id, transfer_id) WHERE transfer_id IS NOT NULL;
