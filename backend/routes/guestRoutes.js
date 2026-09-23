const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const os = require("os");

const guestUploadDir = require("../config/guestStorage");

const router = express.Router();
const MAX_SIZE = 2 * 1024 * 1024 * 1024;

let transferToken;
let expiresAt;
let busy = false;

function startGuestTransfer(port) {
    transferToken = crypto.randomBytes(32).toString("hex");
    expiresAt = Date.now() + 30 * 60 * 1000;

    console.log("\nGuest transfer ready — expires in 30 minutes.");
    console.log(`Files save to: ${guestUploadDir}`);

    for (const addresses of Object.values(os.networkInterfaces())) {
        for (const address of addresses || []) {
            if (address.family === "IPv4" && !address.internal) {
                console.log(
                    `http://${address.address}:${port}/guest#${transferToken}`
                );
            }
        }
    }

    console.log("Open the Wi-Fi address on your phone.\n");
}

function checkTransfer(req, res, next) {
    if (!transferToken || Date.now() >= expiresAt) {
        return res.status(410).json({
            message: "Transfer expired. Restart the backend for a new link."
        });
    }

    const supplied = req.get("X-Transfer-Token") || "";
    const expected = Buffer.from(transferToken);
    const received = Buffer.from(supplied);

    if (
        received.length !== expected.length ||
        !crypto.timingSafeEqual(received, expected)
    ) {
        return res.status(403).json({
            message: "Invalid transfer link."
        });
    }

    next();
}

const storage = multer.diskStorage({
    destination: guestUploadDir,

    filename(req, file, callback) {
        const safeName = file.originalname
            .replace(/[^a-zA-Z0-9._-]/g, "_")
            .slice(-150) || "file";

        callback(null, `${crypto.randomUUID()}-${safeName}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: MAX_SIZE,
        files: 1,
        fields: 0,
        parts: 1
    }
}).single("file");

router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.set("Referrer-Policy", "no-referrer");
    res.set("X-Content-Type-Options", "nosniff");
    next();
});

router.post("/upload", checkTransfer, (req, res) => {
    if (busy) {
        return res.status(409).json({
            message: "Another upload is running. Try again when it finishes."
        });
    }

    busy = true;

    upload(req, res, (error) => {
        busy = false;

        if (error) {
            const message = error.code === "LIMIT_FILE_SIZE"
                ? "File must be 2 GB or smaller."
                : "Upload failed. Select one file and try again.";

            return res.status(
                error instanceof multer.MulterError ? 400 : 500
            ).json({ message });
        }

        if (!req.file) {
            return res.status(400).json({
                message: "Select a file first."
            });
        }

        return res.status(201).json({
            message: "Saved on your PC.",
            filename: req.file.filename
        });
    });
});

router.get("/", (req, res) => {
    res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>SecureDocs Guest Transfer</title>
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #f3f4f6;
            font-family: system-ui, sans-serif;
            color: #111827;
            padding: 20px;
        }
        main {
            width: 100%;
            max-width: 460px;
            padding: 28px;
            border-radius: 18px;
            background: white;
            box-shadow: 0 12px 40px #0000000d;
        }
        h1 { margin-top: 0; font-size: 26px; }
        p { color: #6b7280; line-height: 1.5; }
        input { width: 100%; margin: 18px 0; }
        button {
            width: 100%;
            border: 0;
            border-radius: 10px;
            padding: 14px;
            background: #111827;
            color: white;
            font-size: 16px;
            cursor: pointer;
        }
        button:disabled { opacity: .5; cursor: wait; }
        progress { width: 100%; margin-top: 20px; }
        #status { overflow-wrap: anywhere; }
    </style>
</head>
<body>
    <main>
        <h1>Guest transfer</h1>
        <p>Send a file directly to your PC. No account required.</p>
        <p>Any file type · Maximum 500 MB per file</p>

        <form id="form">
            <input id="file" type="file" required>
            <button id="send" type="submit">Send to PC</button>
        </form>

        <progress id="progress" max="100" value="0" hidden></progress>
        <p id="status" role="status" aria-live="polite"></p>
    </main>

    <script>
        const token = location.hash.slice(1);

        // Remove the secret from the displayed URL after reading it.
        history.replaceState(null, "", location.pathname);

        const form = document.getElementById("form");
        const input = document.getElementById("file");
        const button = document.getElementById("send");
        const progress = document.getElementById("progress");
        const status = document.getElementById("status");

        if (!token) {
            button.disabled = true;
            status.textContent =
                "Open the complete transfer link printed in your PC terminal.";
        }

        form.addEventListener("submit", (event) => {
            event.preventDefault();

            const file = input.files[0];
            if (!file) return;

            if (file.size > 2 * 1024 * 1024 * 1024) {
                status.textContent = "File must be 500 MB or smaller.";
                return;
            }

            button.disabled = true;
            input.disabled = true;
            progress.hidden = false;
            progress.value = 0;
            status.textContent = "Uploading… Keep this page open.";

            const body = new FormData();
            body.append("file", file);

            const request = new XMLHttpRequest();
            request.open("POST", "/guest/upload");
            request.setRequestHeader("X-Transfer-Token", token);

            request.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = Math.round(
                        event.loaded / event.total * 100
                    );

                    progress.value = percent;
                    status.textContent = percent === 100
                        ? "Finishing save on your PC…"
                        : "Uploading: " + percent + "%";
                }
            };

            request.onload = () => {
                let data;

                try {
                    data = JSON.parse(request.responseText);
                } catch {
                    status.textContent = "Unexpected server response.";
                    return;
                }

                if (request.status === 201) {
                    status.textContent =
                        data.message + " Saved as: " + data.filename;
                    input.value = "";
                } else {
                    status.textContent = data.message || "Upload failed.";
                }
            };

            request.onerror = () => {
                status.textContent =
                    "Connection lost. Check Wi-Fi and that the backend is running.";
            };

            request.onloadend = () => {
                button.disabled = false;
                input.disabled = false;
            };

            request.send(body);
        });
    </script>
</body>
</html>`);
});

module.exports = { router, startGuestTransfer };