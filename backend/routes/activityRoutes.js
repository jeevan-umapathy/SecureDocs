const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const activityModel = require('../models/activityModel');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
    const activity = await activityModel.listForUser(req.user.id);
    res.json({ activity });
});

module.exports = router;
