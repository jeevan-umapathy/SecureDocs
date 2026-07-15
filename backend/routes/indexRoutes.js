const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.send("Welcome to SecureDocs API");
});

module.exports = router;