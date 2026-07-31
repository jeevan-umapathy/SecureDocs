const pool = require("../config/database");

async function createFile(
    ownerId,
    originalName,
    storedName,
    filePath,
    mimeType,
    fileSize
) {
    const result = await pool.query(
        `
        INSERT INTO files (
        owner_id,
        original_name,
        stored_name,
        file_path,
        mime_type,
        file_size)
        VALUES($1,$2,$3,$4,$5,$6)
        RETURNING *;
        `,
        [
            ownerId,
            originalName,
            storedName,
            filePath,
            mimeType,
            fileSize
        ]
    );
    return result.rows[0];
}

module.exports = {
    createFile
};