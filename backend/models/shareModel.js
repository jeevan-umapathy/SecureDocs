const pool = require("../config/database");
const prisma = require("../config/prisma");

async function createShare(fileId, recipientId, client = pool) {
    const result = await client.query(
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

async function getRecipients(fileId, ownerId) {
    const result = await pool.query(
        `SELECT s.id, u.username, u.email, s.shared_at
         FROM shares AS s
         JOIN files AS f ON f.id = s.file_id
         JOIN users AS u ON u.id = s.shared_with
         WHERE f.id = $1 AND f.owner_id = $2
         ORDER BY s.shared_at DESC`,
        [fileId, ownerId]
    );
    return result.rows;
}

async function revokeShare(fileId, shareId, ownerId, client = pool) {
    const result = await client.query(
        `DELETE FROM shares AS s
         USING files AS f, users AS u
         WHERE s.id = $1 AND s.file_id = $2
           AND f.id = s.file_id AND f.owner_id = $3
           AND u.id = s.shared_with
         RETURNING s.id, u.email`,
        [shareId, fileId, ownerId]
    );
    return result.rows[0];
}

async function getSharedFiles(userId) {
    const records = await prisma.shares.findMany({
        where: {
            shared_with: Number(userId)
        },
        include: {
            files: {
                include: {
                    users: {
                        select: {
                            username: true
                        }
                    }
                }
            }
        },
        orderBy: {
            shared_at: "desc"
        }
    });

    return records.map((share) => ({
        id: share.files.id,
        original_name: share.files.original_name,
        mime_type: share.files.mime_type,
        file_size: share.files.file_size,
        shared_at: share.shared_at,
        owner_name: share.files.users.username
    }));
}

module.exports = {
    createShare,
    getSharedFiles,
    getRecipients,
    revokeShare
};
