const authModel = require("../models/authModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const qrcode = require("qrcode");
const mfaModel = require("../models/mfaModel");
const activityModel = require("../models/activityModel");
const totp = require("../utils/totp");
const transaction = require("../models/transaction");
const crypto = require("crypto");
const mfaAttempts = new Map();

function sessionToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, purpose: "session", version: user.token_version },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
    );
}

async function register(req, res) {

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
    if (user.is_active === false) {
        return res.status(403).json({
            message: "This account is disabled."
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

    if (user.mfa_enabled) {
        // This token only proves the password step. authMiddleware rejects it.
        const challenge = jwt.sign(
            { id: user.id, purpose: "mfa" },
            process.env.JWT_SECRET,
            { expiresIn: "5m" }
        );
        return res.json({ mfa_required: true, challenge });
    }

    const token = sessionToken(user);

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

async function verifyLoginMfa(req, res) {
    let challenge;
    try {
        challenge = jwt.verify(req.body?.challenge, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    } catch {
        return res.status(401).json({ message: "Sign in again; MFA challenge expired." });
    }
    if (challenge.purpose !== "mfa" || !Number.isSafeInteger(challenge.id)) {
        return res.status(401).json({ message: "Invalid MFA challenge." });
    }

    const attemptKey = crypto.createHash("sha256").update(req.body.challenge).digest("hex");
    const previous = mfaAttempts.get(attemptKey) || 0;
    if (previous >= 5) return res.status(429).json({ message: "Too many attempts. Sign in again." });
    mfaAttempts.set(attemptKey, previous + 1);
    if (mfaAttempts.size > 5000) mfaAttempts.clear();

    const user = await mfaModel.findById(challenge.id);
    if (!user || !user.is_active || !user.mfa_enabled || !user.mfa_secret_enc) {
        return res.status(401).json({ message: "Account unavailable." });
    }
    const step = totp.matchingStep(totp.decrypt(user.mfa_secret_enc), req.body?.code);
    if (step === null || !(await mfaModel.claimStep(user.id, step))) {
        return res.status(401).json({ message: "Invalid or previously used code." });
    }
    mfaAttempts.delete(attemptKey);

    return res.json({
        token: sessionToken(user),
        user: { id: user.id, username: user.username, email: user.email }
    });
}

async function setupMfa(req, res) {
    const user = await mfaModel.findById(req.user.id);
    if (user.mfa_enabled) return res.status(409).json({ message: "MFA is already enabled." });
    if (!req.body?.password || !(await bcrypt.compare(req.body.password, user.password_hash))) {
        return res.status(401).json({ message: "Current password is required." });
    }
    const secret = totp.generateSecret();
    await mfaModel.savePending(user.id, totp.encrypt(secret));
    const label = encodeURIComponent(`SecureDocs:${user.email}`);
    const uri = `otpauth://totp/${label}?secret=${secret}&issuer=SecureDocs&algorithm=SHA1&digits=6&period=30`;
    res.set("Cache-Control", "no-store");
    return res.json({ secret, qr: await qrcode.toDataURL(uri) });
}

async function enableMfa(req, res) {
    const user = await mfaModel.findById(req.user.id);
    if (!user?.mfa_pending_enc || !user.mfa_pending_at ||
        Date.now() - new Date(user.mfa_pending_at).getTime() > 10 * 60 * 1000) {
        return res.status(400).json({ message: "Start MFA setup again." });
    }
    const step = totp.matchingStep(totp.decrypt(user.mfa_pending_enc), req.body?.code);
    if (step === null) {
        return res.status(400).json({ message: "Invalid code or expired setup." });
    }
    const enabled = await transaction(async (client) => {
        const updated = await mfaModel.enable(user.id, user.mfa_pending_enc, step, client);
        if (updated) await activityModel.record(user.id, "mfa_enabled", null, {}, client);
        return updated;
    });
    if (!enabled) return res.status(400).json({ message: "Invalid code or expired setup." });
    return res.json({ message: "Authenticator MFA enabled." });
}

async function disableMfa(req, res) {
    const user = await mfaModel.findById(req.user.id);
    if (!user?.mfa_enabled) return res.status(400).json({ message: "MFA is not enabled." });
    if (!req.body?.password || !(await bcrypt.compare(req.body.password, user.password_hash))) {
        return res.status(401).json({ message: "Current password is required." });
    }
    const step = totp.matchingStep(totp.decrypt(user.mfa_secret_enc), req.body?.code);
    if (step === null || !(await mfaModel.claimStep(user.id, step))) {
        return res.status(401).json({ message: "Invalid or previously used code." });
    }
    await transaction(async (client) => {
        await mfaModel.disable(user.id, client);
        await activityModel.record(user.id, "mfa_disabled", null, {}, client);
    });
    return res.json({ message: "Authenticator MFA disabled." });
}

module.exports = {
    register,
    login,
    verifyLoginMfa,
    setupMfa,
    enableMfa,
    disableMfa
};
