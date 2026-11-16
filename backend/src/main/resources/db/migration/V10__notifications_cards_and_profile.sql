-- Etapa 10: avisos privados e cartões VIRTUAIS demonstrativos (sem PAN, CVV ou transações reais).
CREATE TABLE user_notifications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    event_key VARCHAR(120),
    title VARCHAR(120) NOT NULL,
    description VARCHAR(500) NOT NULL,
    type VARCHAR(16) NOT NULL CHECK (type IN ('success', 'warning', 'danger', 'info')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ,
    CONSTRAINT uq_user_notification_event UNIQUE (user_id, event_key)
);
CREATE INDEX ix_user_notifications_feed ON user_notifications(user_id, created_at DESC, id DESC);

CREATE TABLE demo_cards (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    label VARCHAR(40) NOT NULL,
    last_four VARCHAR(4) NOT NULL CHECK (last_four ~ '^[0-9]{4}$'),
    status VARCHAR(16) NOT NULL CHECK (status IN ('ACTIVE', 'BLOCKED', 'CANCELED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_demo_cards_owner ON demo_cards(user_id, created_at DESC);
