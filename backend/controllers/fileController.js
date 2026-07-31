const fileModel = require("../models/fileModel");

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

module.exports = {
    uploadFile
};