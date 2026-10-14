const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, require('../middleware/adminMiddleware'), userController.getUsers);
router.get("/profile", authMiddleware, userController.profile);

module.exports = router;
