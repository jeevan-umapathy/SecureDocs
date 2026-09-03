const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const uploadMiddleware = require("../middleware/uploadMiddleware");
const fileController = require("../controllers/fileController");
// upload files
router.post(
    "/upload",
    authMiddleware,
    uploadMiddleware.uploadSingle,
    fileController.uploadFile
);
// fetch the user's files
router.get(
    "/",
    authMiddleware,
    fileController.getMyFiles
);
// search files
router.get(
    "/search",
    authMiddleware,
    fileController.searchFiles
);
// download
router.get(
    "/:id/download",
    authMiddleware,
    fileController.downloadFile
);
// rename
router.patch(
    "/:id",
    authMiddleware,
    fileController.renameFile
);

router.delete(
    "/:id",
    authMiddleware,
    fileController.deleteFile
);
module.exports = router;
