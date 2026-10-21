const pool = require("../config/database");


async function getAllUsers() {
    const result = await pool.query("SELECT id, username, email, role, is_active FROM users ORDER BY id");
    return result.rows;
}


module.exports = {
    getAllUsers
};
