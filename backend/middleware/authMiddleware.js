const jwt = require("jsonwebtoken");

async function authMiddleware(req, res, next) {
    //authorization header
    const authHeader = req.headers.authorization

    if (!authHeader) {
        return res.status(401).json({
            message: "Access token required."
        });
    }
    // split bearer

    const authString = authHeader.split(" ")[1];

    //verify
    try {

        const decoded = jwt.verify(
            authString,
            process.env.JWT_SECRET
        );

        req.user = decoded

        next();

    } catch (err) {
        return res.status(401).json({
            message: "Invalid token."
        });
    }


}

module.exports = authMiddleware;