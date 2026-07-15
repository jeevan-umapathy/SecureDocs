require("dotenv").config();
const express = require("express");
const app = express();


const pool = require("./config/database");
app.use(express.json());

//routes

const indexRoutes = require("./routes/indexRoutes");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
app.use("/", indexRoutes);
app.use("/users", userRoutes);
console.log(authRoutes);
app.use("/auth", authRoutes);

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