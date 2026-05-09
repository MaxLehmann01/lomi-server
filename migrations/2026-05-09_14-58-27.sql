CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    name VARCHAR(100) NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt VARCHAR(50) NOT NULL,
    UNIQUE(name)
);

CREATE TABLE user_refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_ct BYTEA NOT NULL,
    token_iv BYTEA NOT NULL,
    token_tag BYTEA NOT NULL,
    token_digest BYTEA NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL
);