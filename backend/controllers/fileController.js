const fileModel = require("../models/fileModel");
const activityModel = require("../models/activityModel");
const transaction = require("../models/transaction");
const fs = require("fs").promises;
const path = require("path");

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

    let savedFile;

    try {
        savedFile = await transaction(async (client) => {
            const file = await fileModel.createFile(
                req.user.id,
                req.file.originalname,
                req.file.filename,
                req.file.path,
                req.file.mimetype,
                req.file.size,
                client
            );
            await activityModel.record(req.user.id, "upload", file.id, {
                filename: file.original_name
            }, client);
            return file;
        });
    } catch (error) {
        try {
            await fs.unlink(req.file.path);
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
    res.download(storedPath(file), file.original_name, (error) => {
        if (error) return next(error);
        activityModel.record(req.user.id, "download", file.id, {
            filename: file.original_name
        }).catch((auditError) => console.error("Download audit failed:", auditError));
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
        await fs.unlink(storedPath(file));
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
    deleteFile
};
