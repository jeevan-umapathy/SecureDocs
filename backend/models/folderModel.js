const pool = require("../config/database");

async function list(ownerId) {
    const result = await pool.query(
        `SELECT id, parent_id, name, created_at FROM folders
         WHERE owner_id = $1 ORDER BY lower(name)`,
        [ownerId]
    );
    return result.rows;
}

async function create(ownerId, name, parentId, client = pool) {
    const result = await client.query(
        `INSERT INTO folders (owner_id, name, parent_id)
         SELECT $1, $2, $3 WHERE $3::bigint IS NULL
         OR EXISTS (SELECT 1 FROM folders WHERE id = $3 AND owner_id = $1)
         RETURNING id, parent_id, name, created_at`,
        [ownerId, name, parentId]
    );
    return result.rows[0];
}

async function rename(ownerId, folderId, name, client = pool) {
    const result = await client.query(
        `UPDATE folders SET name = $3 WHERE owner_id = $1 AND id = $2
         RETURNING id, parent_id, name, created_at`,
        [ownerId, folderId, name]
    );
    return result.rows[0];
}

async function remove(ownerId, folderId, client = pool) {
    const result = await client.query(
        `DELETE FROM folders AS f WHERE f.owner_id = $1 AND f.id = $2
         AND NOT EXISTS (SELECT 1 FROM files WHERE folder_id = f.id)
         AND NOT EXISTS (SELECT 1 FROM folders WHERE parent_id = f.id)
         RETURNING f.id, f.name`,
        [ownerId, folderId]
    );
    return result.rows[0];
}

async function exists(ownerId, folderId, client = pool) {
    const result = await client.query(
        `SELECT 1 FROM folders WHERE id = $1 AND owner_id = $2`,
        [folderId, ownerId]
    );
    return result.rowCount === 1;
}

module.exports = { list, create, rename, remove, exists };
