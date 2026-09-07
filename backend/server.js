require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
app.use(express.json());
app.use(cors());

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

    if (err.status === 400) {
        return res.status(400).json({
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
        await pool.query("SELECT NOW()");
        console.log("Postgre connected");
        app.listen(PORT, () => {
            console.log(`Server running on ${PORT}`);
        });
    } catch (error) {
        console.log("failed to connect");
        console.log(error.message);
    }
}
startServer();