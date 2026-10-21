const pool = require("../config/database");

async function findUserByEmail(email) {
    const result = await pool.query(
        "SELECT id, username, email, password_hash, role, is_active FROM users WHERE lower(email) = lower($1)",
        [email]
    )
    return result.rows[0];
}

async function createUser(username, email, passwordHash) {
    const result = await pool.query(
        `
        INSERT INTO users (username, email, password_hash, role, is_active)
        VALUES ($1, $2, $3, 'user', true)
        RETURNING *;
        `,
        [username, email, passwordHash]
    );

    return result.rows[0];
}
module.exports = {
    findUserByEmail,
    createUser
};
