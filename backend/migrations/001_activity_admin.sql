-- Additive, re-runnable migration. Back up the database and uploads first.
BEGIN;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user',
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'users'::regclass AND conname = 'users_role_check') THEN
        ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));
    END IF;
END $$;
-- Legacy is_admin is left untouched. Grant new admin access explicitly.

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN (
        'upload', 'download', 'rename', 'delete', 'share', 'revoke', 'account_disabled', 'account_enabled'
    )),
    file_id INTEGER REFERENCES files(id) ON DELETE SET NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_actor_time_idx
    ON audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_time_idx
    ON audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS files_owner_time_idx ON files (owner_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS shares_recipient_idx ON shares (shared_with);
CREATE UNIQUE INDEX IF NOT EXISTS shares_file_recipient_unique ON shares (file_id, shared_with);
COMMIT;

-- After running this migration, promote only your own existing account:
-- UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
-- Log out and log back in to refresh the dashboard role.
