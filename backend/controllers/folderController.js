const folderModel = require("../models/folderModel");
const activityModel = require("../models/activityModel");
const transaction = require("../models/transaction");

function validName(name) {
    return typeof name === "string" && name.trim().length > 0 &&
        name.trim().length <= 100 && !/[\/\\\x00-\x1F\x7F]/.test(name);
}

function validId(value) {
    return Number.isSafeInteger(Number(value)) && Number(value) > 0;
}

function databaseError(error) {
    if (error.code === "23505") {
        error.status = 409;
        error.message = "A folder with that name already exists here.";
    }
    throw error;
}

async function listFolders(req, res) {
    res.json({ folders: await folderModel.list(req.user.id) });
}

async function createFolder(req, res) {
    const { name, parent_id: parentId = null } = req.body || {};
    if (!validName(name) || (parentId !== null && !validId(parentId))) {
        return res.status(400).json({ message: "Enter a folder name and valid parent." });
    }
    try {
        const folder = await transaction(async (client) => {
            const created = await folderModel.create(req.user.id, name.trim(), parentId, client);
            if (created) await activityModel.record(req.user.id, "folder_create", null, {
                filename: created.name
            }, client);
            return created;
        });
        if (!folder) return res.status(404).json({ message: "Parent folder not found." });
        return res.status(201).json({ folder });
    } catch (error) { databaseError(error); }
}

async function renameFolder(req, res) {
    if (!validId(req.params.id) || !validName(req.body?.name)) {
        return res.status(400).json({ message: "Enter a valid folder name." });
    }
    try {
        const folder = await transaction(async (client) => {
            const updated = await folderModel.rename(req.user.id, req.params.id, req.body.name.trim(), client);
            if (updated) await activityModel.record(req.user.id, "folder_rename", null, {
                filename: updated.name
            }, client);
            return updated;
        });
        if (!folder) return res.status(404).json({ message: "Folder not found." });
        return res.json({ folder });
    } catch (error) { databaseError(error); }
}

async function deleteFolder(req, res) {
    if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid folder ID." });
    const folder = await transaction(async (client) => {
        const removed = await folderModel.remove(req.user.id, req.params.id, client);
        if (removed) await activityModel.record(req.user.id, "folder_delete", null, {
            filename: removed.name
        }, client);
        return removed;
    });
    if (!folder) return res.status(409).json({ message: "Folder not found or is not empty." });
    return res.json({ message: "Folder deleted." });
}

module.exports = { listFolders, createFolder, renameFolder, deleteFolder };
