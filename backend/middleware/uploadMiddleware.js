const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { randomUUID } = require("crypto");

const uploadDirectory = path.join(__dirname, "..", "uploads");

fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, "uploadDirectory");
    },

    filename: function (req, file, cb) {
        const extension = path.extname(file.originalname).toLowerCase();

        cb(null,
            `${randomUUID()}${extension}`
        );
    }


});

const upload = multer({
    storage,

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: function (req, file, cb) {
        const allowedExtensions = [
            ".pdf",
            ".jpg",
            ".jpeg",
            ".png",
            ".pptx",
            ".ppt"
        ];

        const allowedMimeTypes = [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "application/vnd.ms-powerpoint"
        ];
        const extension = path.extname(file.originalname).toLowerCase();
        const mimetype = file.mimetype;
        if (allowedExtensions.includes(extension) && allowedMimeTypes.includes(mimetype)) {
            cb(null, true);
        }
        else {
            const error = new Error(
                "Only PDF, JPG, PNG, PPT, and PPTX files are allowed."
            );

            error.status = 400;
            cb(error);
        }
    }
});

module.exports = {
    uploadSingle: upload.single("file")
};