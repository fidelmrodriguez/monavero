-- Transferências agendadas internas: sem reserva de saldo, execução apenas no vencimento.
-- Cada agendamento tem chave idempotente e pode gerar no máximo uma transferência.
CREATE TABLE scheduled_transfers (
    id UUID PRIMARY KEY,
    requester_id UUID NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    origin_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    destination_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    destination_agency VARCHAR(10) NOT NULL,
    destination_number VARCHAR(20) NOT NULL,
    request_key VARCHAR(64) NOT NULL,
    amount NUMERIC(19,2) NOT NULL,
    description VARCHAR(160) NOT NULL DEFAULT '',
    scheduled_for TIMESTAMPTZ NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    executed_at TIMESTAMPTZ,
    transfer_id UUID REFERENCES bank_transfers(id) ON DELETE RESTRICT,
    failure_reason VARCHAR(120),
    CONSTRAINT uk_scheduled_transfers_key UNIQUE (requester_id, request_key),
    CONSTRAINT uk_scheduled_transfers_transfer UNIQUE (transfer_id),
    CONSTRAINT ck_scheduled_transfers_amount CHECK (amount BETWEEN 0.01 AND 50000.00),
    CONSTRAINT ck_scheduled_transfers_distinct CHECK (origin_account_id <> destination_account_id),
    CONSTRAINT ck_scheduled_transfers_status CHECK (status IN ('PENDING', 'EXECUTED', 'CANCELED', 'FAILED'))
);
CREATE INDEX ix_scheduled_transfers_due ON scheduled_transfers (scheduled_for, id)
    WHERE status = 'PENDING';
CREATE INDEX ix_scheduled_transfers_owner ON scheduled_transfers (requester_id, created_at DESC);
