const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const adminModel = require('../models/adminModel');
const activityModel = require('../models/activityModel');
const transaction = require('../models/transaction');

const router = express.Router();
router.use(authMiddleware, adminMiddleware);

router.get('/overview', async (req, res) => {
    res.json({ overview: await adminModel.getOverview() });
});

router.get('/users', async (req, res) => {
    res.json({ users: await adminModel.listUsers() });
});

router.get('/activity', async (req, res) => {
    res.json({ activity: await activityModel.listForAdmin() });
});

router.patch('/users/:id/status', async (req, res) => {
    const id = Number(req.params.id);
    const { is_active: isActive } = req.body || {};
    if (!Number.isSafeInteger(id) || id <= 0 || typeof isActive !== 'boolean') {
        return res.status(400).json({ message: 'Valid user ID and status required.' });
    }
    if (id === req.user.id) {
        return res.status(400).json({ message: 'You cannot disable your own account.' });
    }

    const user = await transaction(async (client) => {
        const updated = await adminModel.setUserActive(id, isActive, client);
        if (updated) await activityModel.record(req.user.id, isActive ? 'account_enabled' : 'account_disabled', null, {
            username: updated.username, user_id: updated.id
        }, client);
        return updated;
    });
    if (!user) {
        return res.status(404).json({ message: 'User not found or is an admin.' });
    }
    res.json({ user });
});

module.exports = router;
