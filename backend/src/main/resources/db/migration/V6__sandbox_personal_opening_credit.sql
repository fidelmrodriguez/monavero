-- Crédito fictício de abertura: uma concessão por conta pessoal, inclusive contas anteriores vazias.
-- Nunca reexecutar V1–V5 nem reiniciar saldos existentes.
ALTER TABLE bank_accounts
    ADD COLUMN sandbox_credit_provisioned BOOLEAN NOT NULL DEFAULT FALSE;
