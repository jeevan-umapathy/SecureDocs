// Creates a new disposable database on the configured PostgreSQL server.
// Never migrates, resets, or deletes the configured application database.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { spawn } = require('child_process');
const pool = require('../config/database');
const name = 'securedocs_test_' + Date.now();
(async () => {
    let created = false;
    try {
        await pool.query('CREATE DATABASE "' + name + '"');
        created = true;
        const env = { ...process.env, DB_NAME: name, SECUREDOCS_TEST_DB: name };
        if (env.DATABASE_URL) { const url = new URL(env.DATABASE_URL); url.pathname = '/' + name; env.DATABASE_URL = url.toString(); }
        const child = spawn(process.execPath, ['--test', 'tests/integration.test.js'], { cwd: path.join(__dirname, '..'), env, stdio: 'inherit' });
        const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
        process.exitCode = code ?? 1;
    } finally {
        if (created && /^securedocs_test_[0-9]+$/.test(name)) await pool.query('DROP DATABASE "' + name + '"');
        await pool.end();
    }
})().catch(error => { console.error('Disposable PostgreSQL test failed:', error.message); process.exitCode = 1; pool.end().catch(() => {}); });

