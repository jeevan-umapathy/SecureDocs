const fileModel = require("../models/fileModel");
const fs = require("fs").promises;

async function uploadFile(req, res) {
    const savedFile = await fileModel.createFile(
        req.user.id,
        req.file.originalname,
        req.file.filename,
        req.file.path,
        req.file.mimetype,
        req.file.size
    )
    return res.status(201).json({
        message: "File uploaded succesfully",
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
    const file = await fileModel.getFileById(req.params.id, req.user.id);

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
    const { original_name } = req.body;
    const file = await fileModel.getFileById(req.params.id, req.user.id);

    if (!file) {
        return res.status(404).json({
            message: "file not found"
        });
    }
    const updatedFile = await fileModel.updateFileName(
        req.params.id,
        req.user.id,
        original_name
    );
    return res.status(200).json({
        message: "File renamed successfully",
        file: updatedFile
    });

}

async function searchFiles(req, res) {
    const { q } = req.query;

    if (!q) {
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
