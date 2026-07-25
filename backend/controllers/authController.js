const authModel = require("../models/authModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

async function register(req, res) {
    console.log(req.body);
    const { username, email, password } = req.body;


    if (!username || !email || !password) {
        return res.status(400).json({
            message: "Username, email and password are required."
        });
    }

    const existingUser = await authModel.findUserByEmail(email);
    if (existingUser) {
        return res.status(409).json({
            message: "Email already registered"
        })
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword);


    const newUser = await authModel.createUser(
        username,
        email,
        hashedPassword
    );
    res.status(201).json({
        message: "User registered successfully",
        user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email
        }
    });

}

async function login(req, res) {

    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required."
        });
    }
    const user = await authModel.findUserByEmail(email);
    if (!user) {
        return res.status(401).json({
            message: "Invalid email or password."
        });
    }
    //checks whether a plain-text password matches a stored bcrypt hash.
    const isMatch = await bcrypt.compare(
        password,
        user.password_hash
    );

    if (!isMatch) {
        return res.status(401).json({
            message: "Invalid email or password."
        });
    }

    const token = jwt.sign(
        {
            id: user.id,
            email: user.email
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN
        }
    )

    return res.status(200).json({
        message: "Login successful",
        token,
        user: {
            id: user.id,
            username: user.username,
            email: user.email
        }
    });


}

module.exports = {
    register,
    login
};