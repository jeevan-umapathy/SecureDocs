const userModel = require("../models/userModel");

async function getUsers(req, res) {
    try {
        const users = await userModel.getAllUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({
            message: "failed to fetch users"
        });

    }
}

module.exports = {
    getUsers
};