const pool = require("../config/database");

async function getAllUsers() {
    const result = await pool.query("SELECT * FROM users");
    return result.rows;
}

module.exports = {
    getAllUsers
};