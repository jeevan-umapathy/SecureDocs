BEGIN;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS mfa_secret_enc TEXT,
    ADD COLUMN IF NOT EXISTS mfa_pending_enc TEXT,
    ADD COLUMN IF NOT EXISTS mfa_pending_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS mfa_last_step BIGINT,
    ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS folders (
    id BIGSERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id BIGINT REFERENCES folders(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT folders_name_valid CHECK (length(trim(name)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS folders_root_name_unique
    ON folders (owner_id, lower(name)) WHERE parent_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS folders_child_name_unique
    ON folders (owner_id, parent_id, lower(name)) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS folders_parent_idx ON folders (owner_id, parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS folders_id_owner_unique ON folders (id, owner_id);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'folders_parent_owner_fk') THEN
        ALTER TABLE folders ADD CONSTRAINT folders_parent_owner_fk
            FOREIGN KEY (parent_id, owner_id) REFERENCES folders(id, owner_id);
    END IF;
END $$;

ALTER TABLE files ADD COLUMN IF NOT EXISTS folder_id BIGINT REFERENCES folders(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS files_folder_idx ON files (owner_id, folder_id);
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'files_folder_owner_fk') THEN
        ALTER TABLE files ADD CONSTRAINT files_folder_owner_fk
            FOREIGN KEY (folder_id, owner_id) REFERENCES folders(id, owner_id);
    END IF;
END $$;

ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_check CHECK (action IN (
    'upload', 'download', 'rename', 'delete', 'share', 'revoke',
    'account_disabled', 'account_enabled', 'folder_create', 'folder_rename',
    'folder_delete', 'file_move', 'mfa_enabled', 'mfa_disabled'
));

COMMIT;
