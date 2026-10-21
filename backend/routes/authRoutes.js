const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/login/mfa", authController.verifyLoginMfa);
router.post("/mfa/setup", authMiddleware, authController.setupMfa);
router.post("/mfa/enable", authMiddleware, authController.enableMfa);
router.post("/mfa/disable", authMiddleware, authController.disableMfa);
module.exports = router;
