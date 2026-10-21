require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" }));

const pool = require("./config/database");


//routes

const indexRoutes = require("./routes/indexRoutes");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const fileRoutes = require("./routes/fileRoutes");
app.use("/", indexRoutes);
app.use("/users", userRoutes);
app.use("/auth", authRoutes);
app.use("/files", fileRoutes);
app.use("/folders", require("./routes/folderRoutes"));
app.use("/activity", require("./routes/activityRoutes"));
app.use("/admin", require("./routes/adminRoutes"));

app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
            message: "File must be 5 MB or smaller."
        });
    }

    if (err.name === "MulterError") {
        return res.status(400).json({
            message: "Invalid upload. Select one supported file."
        });
    }

    if (err.status >= 400 && err.status < 500) {
        return res.status(err.status).json({
            message: err.message
        });
    }

    console.error(err);

    return res.status(500).json({
        message: "Something went wrong. Please try again."
    });


})
//connecting database

const PORT = process.env.PORT || 3000;
async function startServer() {
    try {
        if (!process.env.JWT_SECRET) throw new Error("Set JWT_SECRET in backend/.env");
        await pool.query("SELECT role, is_active FROM users LIMIT 1");
        await pool.query("SELECT id FROM audit_logs LIMIT 1");
        await pool.query("SELECT mfa_enabled, mfa_secret_enc, token_version FROM users LIMIT 1");
        await pool.query("SELECT id FROM folders LIMIT 1");
        console.log("Postgre connected");
        app.listen(PORT, () => {
            console.log(`Server running on ${PORT}`);
        });
    } catch (error) {
        console.error("Database is not ready. Run npm run migrate --prefix backend first.");
        console.error(error.message);
        process.exitCode = 1;
        await pool.end();
    }
}
startServer();
