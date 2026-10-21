const fileModel = require("../models/fileModel");
const activityModel = require("../models/activityModel");
const transaction = require("../models/transaction");
const path = require("path");
const { Readable } = require("stream");
const storage = require("../services/storage");
const folderModel = require("../models/folderModel");

function storedPath(file) {
    return path.isAbsolute(file.file_path)
        ? file.file_path
        : path.resolve(__dirname, "..", file.file_path);
}

async function uploadFile(req, res) {
    if (!req.file) {
        return res.status(400).json({
            message: "Please select a file."
        });
    }

    const folderId = req.body?.folder_id || null;
    let validFolder = folderId === null;
    try {
        if (folderId !== null && Number.isSafeInteger(Number(folderId)) && Number(folderId) > 0) {
            validFolder = await folderModel.exists(req.user.id, folderId);
        }
    } catch (error) {
        await storage.remove(req.file.path).catch(console.error);
        throw error;
    }
    if (!validFolder) {
        await storage.remove(req.file.path);
        return res.status(400).json({ message: "Choose one of your folders." });
    }

    let savedFile;
    let location = req.file.path;

    try {
        location = await storage.save(req.file);
        savedFile = await transaction(async (client) => {
            const file = await fileModel.createFile(
                req.user.id,
                req.file.originalname,
                req.file.filename,
                location,
                req.file.mimetype,
                req.file.size,
                folderId,
                client
            );
            await activityModel.record(req.user.id, "upload", file.id, {
                filename: file.original_name
            }, client);
            return file;
        });
    } catch (error) {
        try {
            await storage.remove(location);
        } catch (cleanupError) {
            console.error("Upload cleanup failed:", cleanupError);
        }

        throw error;
    }

    return res.status(201).json({
        message: "File uploaded successfully",
        file: savedFile
    });
}

async function moveFile(req, res) {
    const folderId = req.body?.folder_id ?? null;
    if (folderId !== null && (!Number.isSafeInteger(Number(folderId)) || Number(folderId) <= 0)) {
        return res.status(400).json({ message: "Invalid folder ID." });
    }
    const file = await transaction(async (client) => {
        const updated = await fileModel.moveFile(req.params.id, req.user.id, folderId, client);
        if (updated) await activityModel.record(req.user.id, "file_move", updated.id, {
            filename: updated.original_name
        }, client);
        return updated;
    });
    if (!file) return res.status(404).json({ message: "File or folder not found." });
    return res.json({ file });
}

async function getMyFiles(req, res) {
    const files = await fileModel.getFilesByOwner(req.user.id);

    res.status(200).json({
        files
    });
}

async function downloadFile(req, res, next) {
    const file = await fileModel.getDownloadableFile(req.params.id, req.user.id);

    if (!file) {
        return res.status(404).json({
            message: "file not found"
        });
    }
    const recordDownload = () => activityModel.record(req.user.id, "download", file.id, {
        filename: file.original_name
    }).catch((auditError) => console.error("Download audit failed:", auditError));

    if (storage.isRemote(file.file_path)) {
        const response = await storage.download(file.file_path);
        res.attachment(file.original_name);
        res.setHeader("Content-Type", file.mime_type);
        Readable.fromWeb(response.body).on("error", next).pipe(res);
        res.on("finish", recordDownload);
        return;
    }

    res.download(storedPath(file), file.original_name, (error) => {
        if (error) return next(error);
        recordDownload();
    });

}

async function deleteFile(req, res) {
    const file = await transaction(async (client) => {
        const deleted = await fileModel.deleteFile(req.params.id, req.user.id, client);
        if (deleted) {
            await activityModel.record(req.user.id, "delete", deleted.id, {
                filename: deleted.original_name
            }, client);
        }
        return deleted;
    });

    if (!file) {
        return res.status(404).json({
            message: "file not found"
        });
    }

    try {
        await storage.remove(file.file_path);
    } catch (error) {
        if (error.code !== "ENOENT") {
            console.error("File deleted from database; disk cleanup failed:", error);
        }
    }
    return res.status(200).json({
        message: "File deleted successfully"
    });

}

async function renameFile(req, res) {
    const original_name = req.body?.original_name;

    if (
        typeof original_name !== "string" ||
        !original_name.trim() ||
        original_name.trim().length > 255 ||
        /[\/\\\x00-\x1F\x7F]/.test(original_name)
    ) {
        return res.status(400).json({
            message: "Enter a valid filename without slashes, maximum 255 characters."
        });
    }

    const newName = original_name.trim();
    const updatedFile = await transaction(async (client) => {
        const renamed = await fileModel.updateFileName(
            req.params.id,
            req.user.id,
            newName,
            client
        );
        if (renamed) {
            await activityModel.record(req.user.id, "rename", renamed.id, {
                filename: renamed.original_name
            }, client);
        }
        return renamed;
    });
    if (!updatedFile) {
        return res.status(404).json({
            message: "file not found"
        });
    }
    return res.status(200).json({
        message: "File renamed successfully",
        file: updatedFile
    });

}

async function searchFiles(req, res) {
    const { q } = req.query;

    if (typeof q !== "string" || !q.trim()) {
        return res.status(400).json({
            message: "Search query is required"
        });
    }
    const files = await fileModel.searchFiles(req.user.id, q);
    return res.status(200).json({
        files
    });

}
module.exports = {
    uploadFile,
    getMyFiles,
    downloadFile,
    renameFile,
    searchFiles,
    deleteFile,
    moveFile
};
