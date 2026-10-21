const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const folderController = require("../controllers/folderController");

const router = express.Router();
router.use(authMiddleware);
router.get("/", folderController.listFolders);
router.post("/", folderController.createFolder);
router.patch("/:id", folderController.renameFolder);
router.delete("/:id", folderController.deleteFolder);

module.exports = router;
