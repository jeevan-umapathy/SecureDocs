const pool = require("../config/database");

async function createShare(fileId, recipientId) {
    const result = await pool.query(
        `
        INSERT INTO shares (file_id, shared_with)
        VALUES ($1, $2)
        ON CONFLICT (file_id, shared_with) DO NOTHING
        RETURNING *;
        `,
        [fileId, recipientId]
    );

    return result.rows[0];
}

async function getSharedFiles(userId) {
    const result = await pool.query(
        `
        SELECT
            f.id,
            f.original_name,
            f.mime_type,
            f.file_size,
            s.shared_at,
            u.username AS owner_name
        FROM shares AS s
        JOIN files AS F ON f.id = s.file_id
        JOIN users AS u ON u.id = s.owner_id
        WHERE s.shared_with = $1
        ORDER BY s.shared_at DESC;
        `,
        [userId]
    );
    return result.rows;
}

module.exports = {
    createShare,
    getSharedFiles
};