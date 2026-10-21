const pool = require("../config/database");


async function createFile(
    ownerId,
    originalName,
    storedName,
    filePath,
    mimeType,
    fileSize,
    folderId,
    client = pool
) {
    const result = await client.query(
        `
        INSERT INTO files (
        owner_id,
        original_name,
        stored_name,
        file_path,
        mime_type,
        file_size,
        folder_id)
        VALUES($1,$2,$3,$4,$5,$6,$7)
        RETURNING *;
        `,
        [
            ownerId,
            originalName,
            storedName,
            filePath,
            mimeType,
            fileSize,
            folderId
        ]
    );
    return result.rows[0];
}

async function moveFile(fileId, ownerId, folderId, client = pool) {
    const result = await client.query(
        `UPDATE files SET folder_id = $3
         WHERE id = $1 AND owner_id = $2 AND (
             $3::bigint IS NULL OR EXISTS (
                 SELECT 1 FROM folders WHERE id = $3 AND owner_id = $2
             )
         ) RETURNING *`,
        [fileId, ownerId, folderId]
    );
    return result.rows[0];
}

async function getFilesByOwner(ownerId) {
    const result = await pool.query(
        `
        SELECT * FROM files
        WHERE owner_id = $1;
        `,
        [ownerId]
    );
    return result.rows;
}

async function getFileById(fileId, ownerId) {
    const result = await pool.query(
        `
        SELECT * FROM files
        WHERE id = $1
        AND owner_id = $2;
        `,
        [fileId, ownerId]
    );
    return result.rows[0];
}

async function deleteFile(fileId, ownerId, client = pool) {
    const result = await client.query(
        `
        DELETE FROM files
        WHERE id = $1
        AND owner_id = $2
        RETURNING *;
        `,
        [fileId, ownerId]
    );
    return result.rows[0];
}

async function updateFileName(fileId, ownerId, newName, client = pool) {
    const result = await client.query(
        `
        UPDATE FILES
        SET original_name = $1
        WHERE id = $2
        AND owner_id = $3
        RETURNING *;
        `,
        [newName, fileId, ownerId]
    );
    return result.rows[0];
}

async function searchFiles(ownerId, searchTerm) {
    const result = await pool.query(
        `
        SELECT *
        FROM FILES
        WHERE owner_id = $1
        AND original_name ILIKE $2
        ORDER BY uploaded_at DESC;
        `,
        [
            ownerId,
            `%${searchTerm}%`
        ]
    );
    return result.rows;
}

async function getDownloadableFile(fileId, userId) {
    const result = await pool.query(
        `
        SELECT f.*
        FROM files AS f
        WHERE f.id = $1
            AND (
                f.owner_id = $2
                OR EXISTS (
                    SELECT 1
                    FROM shares AS s
                    WHERE s.file_id = f.id
                        AND s.shared_with = $2
                )
            );
        `,
        [fileId, userId]
    );
    return result.rows[0];
}
module.exports = {
    createFile,
    getFilesByOwner,
    getFileById,
    getDownloadableFile,
    deleteFile,
    updateFileName,
    searchFiles,
    moveFile
};
