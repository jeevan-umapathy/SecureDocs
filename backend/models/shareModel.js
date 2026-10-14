const pool = require('../config/database');
const transaction = require('./transaction');
const files = require('./fileModel');
const activity = require('./activityModel');
const fail = (status, message) => Object.assign(new Error(message), { status });
async function createShare(fileId, ownerId, email) {
    return transaction(async client => {
        const file = await files.getFileById(fileId, ownerId, client, true);
        if (!file) throw fail(404, 'File not found.');
        const recipient = (await client.query('SELECT id, email FROM users WHERE lower(email) = lower($1) AND is_active = true', [email])).rows[0];
        if (!recipient) throw fail(404, 'No enabled account found with that email.');
        if (recipient.id === ownerId) throw fail(400, 'You already own this file.');
        const share = (await client.query('INSERT INTO shares (file_id, shared_with) VALUES ($1,$2) ON CONFLICT (file_id, shared_with) DO NOTHING RETURNING id, shared_at', [fileId, recipient.id])).rows[0];
        if (!share) throw fail(409, 'File is already shared with this user.');
        await activity.record(ownerId, 'share', fileId, { filename: file.original_name, recipient: recipient.email }, client);
        return share;
    });
}
async function getSharedFiles(userId) {
    return (await pool.query('SELECT f.id, f.original_name, f.mime_type, f.file_size, s.shared_at, u.username AS owner_name FROM shares s JOIN files f ON f.id = s.file_id JOIN users u ON u.id = f.owner_id WHERE s.shared_with = $1 ORDER BY s.shared_at DESC', [userId])).rows;
}
async function getFileShares(fileId, ownerId) {
    if (!(await files.getFileById(fileId, ownerId))) throw fail(404, 'File not found.');
    return (await pool.query('SELECT s.id, u.username, u.email, s.shared_at FROM shares s JOIN users u ON u.id = s.shared_with JOIN files f ON f.id = s.file_id WHERE s.file_id = $1 AND f.owner_id = $2 ORDER BY s.shared_at DESC', [fileId, ownerId])).rows;
}
async function revokeShare(fileId, shareId, ownerId) {
    return transaction(async client => {
        const file = await files.getFileById(fileId, ownerId, client, true);
        if (!file) throw fail(404, 'File not found.');
        const share = (await client.query('DELETE FROM shares s USING users u WHERE s.id = $1 AND s.file_id = $2 AND u.id = s.shared_with RETURNING u.email', [shareId, fileId])).rows[0];
        if (!share) throw fail(404, 'Share not found.');
        await activity.record(ownerId, 'revoke', fileId, { filename: file.original_name, recipient: share.email }, client);
    });
}
module.exports = { createShare, getSharedFiles, getFileShares, revokeShare };

