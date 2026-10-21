const fileModel = require("../models/fileModel");
const fs = require("fs").promises;

async function uploadFile(req, res) {
    if (!req.file) {
        return res.status(400).json({
            message: "Please select a file."
        });
    }

    let savedFile;

    try {
        savedFile = await fileModel.createFile(
            req.user.id,
            req.file.originalname,
            req.file.filename,
            req.file.path,
            req.file.mimetype,
            req.file.size
        );
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

async function downloadFile(req, res) {
    const file = await fileModel.getDownloadableFile(req.params.id, req.user.id);

    if (!file) {
        return res.status(404).json({
            message: "file not found"
        });
    }
    else {
        res.download(
            file.file_path,
            file.original_name
        )
    }

}

async function deleteFile(req, res) {
    const file = await fileModel.getFileById(req.params.id, req.user.id);

    if (!file) {
        return res.status(404).json({
            message: "file not found"
        });
    }

    await fs.unlink(file.file_path);
    await fileModel.deleteFile(req.params.id, req.user.id);
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
    const file = await fileModel.getFileById(req.params.id, req.user.id);

    if (!file) {
        return res.status(404).json({
            message: "file not found"
        });
    }
    const updatedFile = await fileModel.updateFileName(
        req.params.id,
        req.user.id,
        newName
    );
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
