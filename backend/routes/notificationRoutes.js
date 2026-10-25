const express = require("express");
const router = express.Router();

const {
    getNotifications,
    readNotification
} = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");
router.patch("/:id/read", authMiddleware, readNotification);
router.get("/", authMiddleware, getNotifications);

module.exports = router;
