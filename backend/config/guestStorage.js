const fs = require("fs");
const path = require("path");

const guestUploadDir = process.env.GUEST_UPLOAD_DIR;

if (!guestUploadDir || !path.isAbsolute(guestUploadDir)) {
    throw new Error("GUEST_UPLOAD_DIR must be an absolute folder path.");
}

fs.mkdirSync(guestUploadDir, { recursive: true });

module.exports = guestUploadDir;