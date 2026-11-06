ALTER TABLE app_users ADD COLUMN admin_version BIGINT NOT NULL DEFAULT 0;
CREATE TABLE admin_audit_events (
    id UUID PRIMARY KEY,
    actor_id UUID NOT NULL REFERENCES app_users(id),
    target_id UUID NOT NULL REFERENCES app_users(id),
    action VARCHAR(32) NOT NULL,
    old_role VARCHAR(16) NOT NULL,
    new_role VARCHAR(16) NOT NULL,
    old_status VARCHAR(16) NOT NULL,
    new_status VARCHAR(16) NOT NULL,
    reason VARCHAR(300) NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_admin_audit_date ON admin_audit_events(occurred_at DESC, id DESC);
