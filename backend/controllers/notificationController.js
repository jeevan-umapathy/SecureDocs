const notificationModel = require("../models/notificationModel");

async function getNotifications(req, res) {
    try {
        const userId = req.user.id;

        const [notifications, unreadCount] = await Promise.all([
            notificationModel.getUserNotifications(userId),
            notificationModel.getUnreadCount(userId),
        ]);

        res.json({
            success: true,
            unreadCount,
            notifications: notifications.map((item) => ({
                ...item,
                id: item.id.toString()
            }))
        });
    } catch (error) {
        console.error("Notification error:", error);
        res.status(500).json({
            error: "Unable to load notifications",
        });
    }
}

async function readNotification(req, res) {
    try {
        const { id } = req.params;

        if (!/^\d+$/.test(id)) {
            return res.status(400).json({
                message: "Invalid notification ID."
            });
        }

        const updated = await notificationModel.markAsRead(
            id,
            req.user.id
        );

        if (!updated) {
            return res.status(404).json({
                message: "Notification not found."
            });
        }

        return res.json({
            message: "Notification marked as read."
        });
    } catch (error) {
        console.error("Mark notification read:", error);

        return res.status(500).json({
            message: "Could not update notification."
        });
    }
}

module.exports = {
    getNotifications,
    readNotification
};