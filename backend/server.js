const express = require("express");
const app = express();
const indexRoutes = require("./routes/indexRoutes");

app.use(express.json());


app.use("/", indexRoutes);

app.listen(3000, () => {
    console.log("Server running on port 3000");
})