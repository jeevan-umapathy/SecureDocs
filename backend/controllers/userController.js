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

async function profile(req, res) {
    return res.status(201).json({
        message: "Profile fetched successfully",
        user: req.user
    });
}

module.exports = {
    getUsers,
    profile
};