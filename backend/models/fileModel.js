const pool = require('../config/database');
const transaction = require('./transaction');
const activity = require('./activityModel');
const publicColumns = 'id, owner_id, original_name, mime_type, file_size, uploaded_at';
async function createFile(ownerId, originalName, storedName, filePath, mimeType, fileSize) {
    return transaction(async client => {
        const { rows } = await client.query(
            'INSERT INTO files (owner_id, original_name, stored_name, file_path, mime_type, file_size) VALUES ($1,$2,$3,$4,$5,$6) RETURNING ' + publicColumns,
            [ownerId, originalName, storedName, filePath, mimeType, fileSize]);
        await activity.record(ownerId, 'upload', rows[0].id, { filename: originalName }, client);
        return rows[0];
    });
}
async function getFilesByOwner(ownerId, search = '') {
    return (await pool.query('SELECT ' + publicColumns + ' FROM files WHERE owner_id = $1 AND original_name ILIKE $2 ORDER BY uploaded_at DESC, id DESC', [ownerId, '%' + search + '%'])).rows;
}
async function getFileById(fileId, ownerId, client = pool, lock = false) {
    return (await client.query('SELECT * FROM files WHERE id = $1 AND owner_id = $2' + (lock ? ' FOR UPDATE' : ''), [fileId, ownerId])).rows[0];
}
async function deleteFile(fileId, ownerId) {
    return transaction(async client => {
        const file = await getFileById(fileId, ownerId, client, true);
        if (!file) return null;
        await activity.record(ownerId, 'delete', file.id, { filename: file.original_name }, client);
        await client.query('DELETE FROM shares WHERE file_id = $1', [fileId]);
        await client.query('DELETE FROM files WHERE id = $1 AND owner_id = $2', [fileId, ownerId]);
        return file;
    });
}
async function updateFileName(fileId, ownerId, newName) {
    return transaction(async client => {
        const file = await getFileById(fileId, ownerId, client, true);
        if (!file) return null;
        const { rows } = await client.query('UPDATE files SET original_name = $1 WHERE id = $2 AND owner_id = $3 RETURNING ' + publicColumns, [newName, fileId, ownerId]);
        await activity.record(ownerId, 'rename', fileId, { filename: newName, previous_name: file.original_name }, client);
        return rows[0];
    });
}
async function getDownloadableFile(fileId, userId) {
    return (await pool.query(
        'SELECT f.* FROM files f WHERE f.id = $1 AND (f.owner_id = $2 OR EXISTS (SELECT 1 FROM shares s WHERE s.file_id = f.id AND s.shared_with = $2))',
        [fileId, userId])).rows[0];
}
module.exports = { createFile, getFilesByOwner, getFileById, deleteFile, updateFileName, getDownloadableFile, searchFiles: getFilesByOwner };

