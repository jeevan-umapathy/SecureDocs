const shareModel = require("../models/shareModel");
const fileModel = require("../models/fileModel");
const authModel = require("../models/authModel");
const activityModel = require("../models/activityModel");
const transaction = require("../models/transaction");


async function shareFile(req, res) {
    const fileId = Number(req.params.id);
    const email = req.body?.email;

    if (!Number.isInteger(fileId) || fileId <= 0) {
        return res.status(400).json({
            message: "Invalid file ID."
        });
    }

    if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({
            message: "Recipient email is required."
        });
    }

    const file = await fileModel.getFileById(
        fileId,
        req.user.id
    );

    if (!file) {
        return res.status(404).json({
            message: "File not found."
        });
    }

    const recipient = await authModel.findUserByEmail(
        email.trim()
    );

    if (!recipient) {
        return res.status(404).json({
            message: "No account found with that email."
        });
    }

    if (recipient.id === req.user.id) {
        return res.status(400).json({
            message: "You already own this file."
        });
    }

    const share = await transaction(async (client) => {
        const created = await shareModel.createShare(fileId, recipient.id, client);
        if (created) {
            await activityModel.record(req.user.id, "share", fileId, {
                filename: file.original_name,
                recipient: recipient.email
            }, client);
        }
        return created;
    });

    if (!share) {
        return res.status(409).json({
            message: "File is already shared with this user."
        });
    }

    return res.status(201).json({
        message: "File shared successfully.",
        share
    });

}

async function getSharedFiles(req, res) {
    const files = await shareModel.getSharedFiles(req.user.id);

    return res.status(200).json({
        files
    });

}

async function getRecipients(req, res) {
    const file = await fileModel.getFileById(req.params.id, req.user.id);
    if (!file) {
        return res.status(404).json({ message: "File not found." });
    }
    const shares = await shareModel.getRecipients(file.id, req.user.id);
    return res.json({ shares });
}

async function revokeShare(req, res) {
    const file = await fileModel.getFileById(req.params.id, req.user.id);
    if (!file) {
        return res.status(404).json({ message: "File not found." });
    }
    const share = await transaction(async (client) => {
        const removed = await shareModel.revokeShare(
            file.id, req.params.shareId, req.user.id, client
        );
        if (removed) {
            await activityModel.record(req.user.id, "revoke", file.id, {
                filename: file.original_name,
                recipient: removed.email
            }, client);
        }
        return removed;
    });
    if (!share) {
        return res.status(404).json({ message: "Share not found." });
    }
    return res.json({ message: "Access revoked." });
}

module.exports = {
    shareFile,
    getSharedFiles,
    getRecipients,
    revokeShare
};
