const authModel = require('../models/authModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const publicUser = ({ id, username, email, role, is_active }) => ({ id, username, email, role, is_active });
async function register(req, res) {
    const { username, email, password } = req.body || {};
    if (typeof username !== 'string' || !username.trim() || username.trim().length > 100 ||
        typeof email !== 'string' || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) {
        return res.status(400).json({ message: 'Enter a name, valid email, and a password of at least 8 characters (maximum 72 bytes).' });
    }
    try {
        const normalized = email.trim().toLowerCase();
        if (await authModel.findUserByEmail(normalized)) return res.status(409).json({ message: 'Email already registered.' });
        const user = await authModel.createUser(username.trim(), normalized, await bcrypt.hash(password, 10));
        res.status(201).json({ message: 'Account created. Please sign in.', user: publicUser(user) });
    } catch (error) {
        if (error.code === '23505') return res.status(409).json({ message: 'Email or username already registered.' });
        throw error;
    }
}
async function login(req, res) {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || Buffer.byteLength(password) > 72) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }
    const user = await authModel.findUserByEmail(email.trim());
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ message: 'Invalid email or password.' });
    if (!user.is_active) return res.status(403).json({ message: 'This account is disabled.' });
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1h', algorithm: 'HS256' });
    res.json({ token, user: publicUser(user) });
}
module.exports = { register, login };

