-- Etapa 8: pagamentos demonstrativos persistidos. Não há integração com rede bancária,
-- liquidação de boletos, PIX ou concessionárias reais.
CREATE TABLE bank_payments (
    id UUID PRIMARY KEY,
    requester_id UUID NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    origin_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    request_key VARCHAR(64) NOT NULL,
    payment_type VARCHAR(16) NOT NULL,
    beneficiary VARCHAR(120) NOT NULL,
    reference VARCHAR(48) NOT NULL,
    amount NUMERIC(19,2) NOT NULL,
    description VARCHAR(160) NOT NULL DEFAULT '',
    scheduled_for TIMESTAMPTZ,
    status VARCHAR(16) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    failure_reason VARCHAR(160),
    CONSTRAINT uk_bank_payments_request UNIQUE (requester_id, request_key),
    CONSTRAINT ck_bank_payments_type CHECK (payment_type IN ('BOLETO', 'CONVENIO')),
    CONSTRAINT ck_bank_payments_amount CHECK (amount BETWEEN 0.01 AND 50000.00),
    CONSTRAINT ck_bank_payments_status CHECK (status IN ('PENDING', 'EXECUTED', 'CANCELED', 'FAILED')),
    CONSTRAINT ck_bank_payments_beneficiary CHECK (length(btrim(beneficiary)) >= 2),
    CONSTRAINT ck_bank_payments_reference CHECK (length(btrim(reference)) >= 6)
);
CREATE INDEX ix_bank_payments_owner ON bank_payments (requester_id, created_at DESC);
CREATE INDEX ix_bank_payments_due ON bank_payments (scheduled_for, id)
    WHERE status = 'PENDING' AND scheduled_for IS NOT NULL;
ALTER TABLE account_transactions
    ADD COLUMN payment_id UUID REFERENCES bank_payments(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX uk_account_transactions_payment
    ON account_transactions(payment_id) WHERE payment_id IS NOT NULL;
