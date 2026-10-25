
const prisma = require("../config/prisma");

async function getUserNotifications(userId) {
    return prisma.notifications.findMany({
        where: {
            recipient_id: Number(userId)
        },
        orderBy: {
            created_at: "desc"
        },
        take: 50
    });
}

async function markAsRead(notificationId, userId) {
    const result = await prisma.notifications.updateMany({
        where: {
            id: BigInt(notificationId),
            recipient_id: Number(userId),
            is_read: false
        },
        data: {
            is_read: true
        }
    });

    return result.count;
}

async function getUnreadCount(userId) {
    return prisma.notifications.count({
        where: {
            recipient_id: Number(userId),
            is_read: false
        }
    });
}

module.exports = {
    getUserNotifications,
    getUnreadCount,
    markAsRead
};
