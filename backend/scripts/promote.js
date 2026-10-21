const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const pool = require('../config/database');
(async () => {
    const email = process.argv[2]?.trim();
    if (!email) throw new Error('Usage: npm run promote -- your-existing-email@example.com');
    const result = await pool.query("UPDATE users SET role = 'admin', is_active = true WHERE lower(email) = lower($1) RETURNING id, username, email, role", [email]);
    if (result.rowCount !== 1) throw new Error('No matching account. Register first, then use its email.');
    console.log('Promoted existing account:', result.rows[0].email);
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
