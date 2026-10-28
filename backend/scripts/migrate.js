const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const fs = require('fs/promises');
const pool = require('../config/database');
(async () => {
    const client = await pool.connect();
    try {
        for (const filename of ['001_activity_admin.sql', '002_mfa_folders.sql', '003_fix_file_received_notification.sql']) {
            await client.query(await fs.readFile(path.join(__dirname, '..', 'migrations', filename), 'utf8'));
            console.log('Applied', filename);
        }
        console.log('Migrations complete. Existing rows preserved.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Migration failed and rolled back:', error.message);
        process.exitCode = 1;
    } finally { client.release(); await pool.end(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; pool.end(); });

