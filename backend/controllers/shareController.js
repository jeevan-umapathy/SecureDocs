const shareModel = require("../models/shareModel");
const fileModel = require("../models/fileModel");
const authModel = require("../models/authModel");


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

    const share = await shareModel.createShare(
        fileId,
        recipient.id
    );

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

module.exports = {
    shareFile,
    getSharedFiles
};