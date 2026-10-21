const jwt = require('jsonwebtoken');
const pool = require('../config/database');
module.exports = async function authMiddleware(req, res, next) {
    const match = /^Bearer (\S+)$/.exec(req.headers.authorization || '');
    if (!match) return res.status(401).json({ message: 'Access token required.' });
    let decoded;
    try { decoded = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ['HS256'] }); }
    catch { return res.status(401).json({ message: 'Invalid or expired token.' }); }
    if (!Number.isSafeInteger(decoded.id) || decoded.id <= 0 ||
        (decoded.purpose && decoded.purpose !== 'session')) {
        return res.status(401).json({ message: 'A completed sign-in is required.' });
    }
    try {
        const { rows } = await pool.query('SELECT id, username, email, role, is_active, mfa_enabled, token_version FROM users WHERE id = $1', [decoded.id]);
        if (!rows[0] || !rows[0].is_active) return res.status(403).json({ message: 'Account unavailable or disabled.', code: 'ACCOUNT_DISABLED' });
        if (decoded.version !== rows[0].token_version &&
            (rows[0].mfa_enabled || rows[0].token_version !== 0)) {
            return res.status(401).json({ message: 'Session ended. Sign in again.' });
        }
        req.user = rows[0];
        next();
    } catch (error) { next(error); }
};

