const pool = require('../config/database');

async function record(actorId, action, fileId = null, details = {}, client = pool) {
    await client.query(
        `INSERT INTO audit_logs (actor_id, action, file_id, details)
         VALUES ($1, $2, (SELECT id FROM files WHERE id = $3), $4::jsonb)`,
        [actorId, action, fileId, JSON.stringify(details)]
    );
}



async function listForUser(userId) {
    const result = await pool.query(
        `SELECT id, action, file_id, details, created_at
     FROM user_activity_feed
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 100`,
        [userId]
    );

    return result.rows;
}


async function listForAdmin() {
    const result = await pool.query(
        `SELECT a.id, a.action, a.file_id, a.details, a.created_at,
                u.username AS actor_name, u.email AS actor_email
         FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
         ORDER BY a.created_at DESC, a.id DESC LIMIT 200`
    );
    return result.rows;
}

module.exports = { record, listForUser, listForAdmin };
