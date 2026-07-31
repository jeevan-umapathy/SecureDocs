const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const uploadMiddleware = require("../middleware/uploadMiddleware");
const fileController = require("../controllers/fileController");

router.post(
    "/upload",
    authMiddleware,
    uploadMiddleware.uploadSingle,
    fileController.uploadFile
);


module.exports = router;