const pool = require("../config/database");

async function findById(id) {
    const result = await pool.query(
        `SELECT id, username, email, password_hash, is_active, mfa_enabled,
                mfa_secret_enc, mfa_pending_enc, mfa_pending_at, mfa_last_step,
                token_version
         FROM users WHERE id = $1`,
        [id]
    );
    return result.rows[0];
}

async function savePending(id, encrypted) {
    await pool.query(
        `UPDATE users SET mfa_pending_enc = $2, mfa_pending_at = NOW()
         WHERE id = $1 AND mfa_enabled = false`,
        [id, encrypted]
    );
}

async function enable(id, encrypted, step, client = pool) {
    const result = await client.query(
        `UPDATE users SET mfa_secret_enc = $2, mfa_pending_enc = NULL,
                mfa_pending_at = NULL, mfa_enabled = true, mfa_last_step = $3,
                token_version = token_version + 1
         WHERE id = $1 AND mfa_enabled = false
           AND mfa_pending_at > NOW() - INTERVAL '10 minutes'
         RETURNING id`,
        [id, encrypted, step]
    );
    return result.rowCount === 1;
}

async function claimStep(id, step, client = pool) {
    const result = await client.query(
        `UPDATE users SET mfa_last_step = $2
         WHERE id = $1 AND mfa_enabled = true AND is_active = true
           AND (mfa_last_step IS NULL OR mfa_last_step < $2)
         RETURNING id`,
        [id, step]
    );
    return result.rowCount === 1;
}

async function disable(id, client = pool) {
    await client.query(
        `UPDATE users SET mfa_enabled = false, mfa_secret_enc = NULL,
                mfa_pending_enc = NULL, mfa_pending_at = NULL, mfa_last_step = NULL,
                token_version = token_version + 1
         WHERE id = $1`,
        [id]
    );
}

module.exports = { findById, savePending, enable, claimStep, disable };
