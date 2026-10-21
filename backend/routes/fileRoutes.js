const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const uploadMiddleware = require("../middleware/uploadMiddleware");
const fileController = require("../controllers/fileController");
const shareController = require("../controllers/shareController");
// upload files
router.post(
    "/upload",
    authMiddleware,
    uploadMiddleware.uploadSingle,
    fileController.uploadFile
);

router.get(
    "/:id/shares",
    authMiddleware,
    shareController.getRecipients
);

router.delete(
    "/:id/shares/:shareId",
    authMiddleware,
    shareController.revokeShare
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

router.post(
    "/:id/share",
    authMiddleware,
    shareController.shareFile
);

router.get(
    "/shared",
    authMiddleware,
    shareController.getSharedFiles
)

module.exports = router;
