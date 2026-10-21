const pool = require('../config/database');

async function getOverview() {
    const result = await pool.query(
        `SELECT
            (SELECT COUNT(*)::integer FROM users) AS users,
            (SELECT COUNT(*)::integer FROM users WHERE is_active = false) AS disabled_users,
            (SELECT COUNT(*)::integer FROM files) AS files,
            (SELECT COUNT(*)::integer FROM shares) AS shares,
            (SELECT COALESCE(SUM(file_size), 0)::bigint FROM files) AS bytes_stored`
    );
    return result.rows[0];
}

async function listUsers() {
    const result = await pool.query(
        `SELECT u.id, u.username, u.email, u.role, u.is_active,
                COUNT(f.id)::integer AS file_count
         FROM users u LEFT JOIN files f ON f.owner_id = u.id
         GROUP BY u.id ORDER BY u.id ASC`
    );
    return result.rows;
}

async function setUserActive(userId, isActive, client = pool) {
    const result = await client.query(
        `UPDATE users SET is_active = $2
         WHERE id = $1 AND role = 'user'
         RETURNING id, username, email, role, is_active`,
        [userId, isActive]
    );
    return result.rows[0];
}

module.exports = { getOverview, listUsers, setUserActive };
