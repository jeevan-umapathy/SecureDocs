const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },

    filename: function (req, file, cb) {
        cb(null,
            `${Date.now()}-${file.originalname}`
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
            ".png"
        ];

        const allowedMimeTypes = [
            "application/pdf",
            "image/jpeg",
            "image/png"
        ];
        const extension = path.extname(file.originalname).toLowerCase();
        const mimetype = file.mimetype;
        if (allowedExtensions.includes(extension) && allowedMimeTypes.includes(mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error("Only PDF and image files are allowed."));
        }
    }
});

module.exports = {
    uploadSingle: upload.single("file")
};