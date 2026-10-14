const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const jwt = require('jsonwebtoken');
test('SecureDocs against disposable PostgreSQL', async t => {
    assert.match(process.env.SECUREDOCS_TEST_DB || '', /^securedocs_test_[0-9]+$/, 'Use npm test to create an isolated database');
    const pool = require('../config/database');
    const actual = (await pool.query('SELECT current_database() AS name')).rows[0].name;
    assert.equal(actual, process.env.SECUREDOCS_TEST_DB);
    const uploads = await fs.mkdtemp(path.join(os.tmpdir(), 'securedocs-test-'));
    process.env.UPLOAD_DIR = uploads;
    process.env.JWT_SECRET = 'disposable-test-secret-never-use-in-production';
    let server;
    try {
        await pool.query(await fs.readFile(path.join(__dirname, 'legacy-schema.sql'), 'utf8'));
        await pool.query("INSERT INTO users (username,email,password_hash,totp_secret,is_admin) VALUES ('Legacy','legacy@example.test','preserved-hash','preserved-secret',true)");
        const migration = await fs.readFile(path.join(__dirname, '../migrations/001_activity_admin.sql'), 'utf8');
        await t.test('migration is additive and re-runnable', async () => {
            await pool.query("INSERT INTO files(owner_id, original_name, stored_name, file_path, mime_type, file_size) VALUES(1,'legacy.pdf','legacy.pdf','uploads/legacy.pdf','application/pdf',123)");
            await pool.query(migration); await pool.query(migration);
            const row = (await pool.query('SELECT * FROM users WHERE id=1')).rows[0];
            assert.equal(row.password_hash, 'preserved-hash'); assert.equal(row.totp_secret, 'preserved-secret'); assert.equal(row.is_admin, true);
            assert.equal(row.role, 'user'); assert.equal(row.is_active, true);
            assert.equal((await pool.query('SELECT count(*) FROM audit_logs')).rows[0].count, '0');
            assert.equal((await pool.query('SELECT file_path FROM files')).rows[0].file_path, 'uploads/legacy.pdf');
            await pool.query("DELETE FROM files WHERE original_name='legacy.pdf'");
        });
        server = require('../server').listen(0, '127.0.0.1');
        await new Promise(resolve => server.once('listening', resolve));
        const base = 'http://127.0.0.1:' + server.address().port;
        async function request(route, { token, body, method = 'GET', status = 200, raw = false } = {}) {
            const response = await fetch(base + route, { method, headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
            const data = raw ? await response.text() : await response.json();
            assert.equal(response.status, status, route + ': ' + JSON.stringify(data));
            if (!raw) assert.doesNotMatch(JSON.stringify(data), /password_hash|totp_secret|JWT_SECRET|preserved-secret|file_path|stored_name/);
            return data;
        }
        let owner, recipient, stranger, admin, file;
        const register = async name => {
            const email = name + '@example.test';
            const result = await request('/auth/register', { method: 'POST', status: 201, body: { username: name, email, password: 'test-password-123', role: 'admin', is_active: false } });
            assert.equal(result.user.role, 'user'); assert.equal(result.user.is_active, true);
            return (await request('/auth/login', { method: 'POST', body: { email, password: 'test-password-123' } }));
        };
        const upload = async name => {
            const form = new FormData(); form.append('file', new Blob(['%PDF-1.4\nSecureDocs test'], { type: 'application/pdf' }), name);
            return (await request('/files/upload', { token: owner.token, method: 'POST', body: form, status: 201 })).file;
        };
        await t.test('registration, login, database roles and secret-free responses', async () => {
            owner = await register('owner'); recipient = await register('recipient'); stranger = await register('stranger'); admin = await register('admin');
            await request('/auth/register', { method: 'POST', status: 409, body: { username: 'dupe', email: 'OWNER@example.test', password: 'test-password-123' } });
            await request('/auth/login', { method: 'POST', status: 401, body: { email: 'owner@example.test', password: 'incorrect' } });
            await pool.query("UPDATE users SET role='admin' WHERE id=$1", [admin.user.id]);
            await request('/users', { status: 401 });
            await request('/admin/overview', { token: owner.token, status: 403 });
            await request('/users', { token: owner.token, status: 403 });
            await request('/users', { token: admin.token });
            assert.equal((await request('/users/profile', { token: admin.token })).user.role, 'admin');
            const forged = jwt.sign({ id: owner.user.id, role: 'admin' }, process.env.JWT_SECRET);
            await request('/admin/users', { token: forged, status: 403 });
        });
        await t.test('upload, search, validation and owner-only operations', async () => {
            file = await upload('Review.pdf');
            assert.equal((await request('/files/search?q=Review', { token: owner.token })).files.length, 1);
            assert.equal((await request('/files', { token: stranger.token })).files.length, 0);
            await request('/files/search?q=' + encodeURIComponent("' OR 1=1 --"), { token: stranger.token });
            await request('/files/nope/download', { token: owner.token, status: 400 });
            await request('/files/' + file.id + '/download', { token: stranger.token, status: 404 });
            await request('/files/' + file.id, { token: owner.token, method: 'PATCH', status: 400, body: { original_name: '../bad' } });
            const oversized = new FormData(); oversized.append('file', new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'application/pdf' }), 'big.pdf');
            await request('/files/upload', { token: owner.token, method: 'POST', body: oversized, status: 400 });
            assert.equal((await fs.readdir(uploads)).length, 1);
        });
        let shareId;
        await t.test('sharing, recipient download-only access and activity isolation', async () => {
            await request('/files/' + file.id + '/share', { token: owner.token, method: 'POST', status: 201, body: { email: 'recipient@example.test' } });
            await request('/files/' + file.id + '/share', { token: owner.token, method: 'POST', status: 409, body: { email: 'recipient@example.test' } });
            const list = await request('/files/' + file.id + '/shares', { token: owner.token }); shareId = list.shares[0].id;
            assert.equal((await request('/files/shared', { token: recipient.token })).files.length, 1);
            for (const [route, method, body] of [[ '/files/' + file.id, 'PATCH', { original_name: 'bad.pdf' } ], ['/files/' + file.id, 'DELETE'], ['/files/' + file.id + '/share', 'POST', { email: 'stranger@example.test' }], ['/files/' + file.id + '/shares', 'GET'], ['/files/' + file.id + '/shares/' + shareId, 'DELETE']]) {
                await request(route, { token: recipient.token, method, body, status: 404 });
            }
            assert.match(await request('/files/' + file.id + '/download', { token: recipient.token, raw: true }), /SecureDocs test/);
            // Drain the post-send audit callback before checking its committed row.
            for (let i = 0; i < 40; i++) {
                if ((await pool.query("SELECT id FROM audit_logs WHERE action='download'")).rowCount) break;
                await new Promise(resolve => setTimeout(resolve, 25));
            }
            const history = (await request('/activity', { token: recipient.token })).activity;
            assert.deepEqual(history.map(e => e.action), ['download']);
            assert.equal((await request('/activity', { token: stranger.token })).activity.length, 0);
            assert.ok((await request('/activity', { token: owner.token })).activity.every(e => e.action !== 'download'));
        });
        await t.test('revocation immediately blocks future downloads', async () => {
            await request('/files/' + file.id + '/shares/' + shareId, { token: owner.token, method: 'DELETE' });
            await request('/files/' + file.id + '/download', { token: recipient.token, status: 404 });
            assert.equal((await request('/files/shared', { token: recipient.token })).files.length, 0);
        });
        await t.test('disabled accounts block login and existing tokens; admins are protected', async () => {
            await request('/admin/users/' + owner.user.id + '/status', { token: owner.token, method: 'PATCH', body: { is_active: false }, status: 403 });
            await request('/admin/users/' + admin.user.id + '/status', { token: admin.token, method: 'PATCH', body: { is_active: false }, status: 400 });
            await request('/admin/users/' + owner.user.id + '/status', { token: admin.token, method: 'PATCH', body: { is_active: false } });
            for (const route of ['/files', '/activity', '/users/profile', '/files/' + file.id + '/download']) await request(route, { token: owner.token, status: 403 });
            await request('/auth/login', { method: 'POST', body: { email: 'owner@example.test', password: 'test-password-123' }, status: 403 });
            await request('/admin/users/' + owner.user.id + '/status', { token: admin.token, method: 'PATCH', body: { is_active: true } });
            await request('/files', { token: owner.token });
            await pool.query("UPDATE users SET role='admin' WHERE id=$1", [stranger.user.id]);
            await request('/admin/users/' + stranger.user.id + '/status', { token: admin.token, method: 'PATCH', body: { is_active: false }, status: 404 });
            await pool.query('UPDATE users SET is_active=false WHERE id=$1', [admin.user.id]);
            await request('/admin/overview', { token: admin.token, status: 403 });
            await pool.query('UPDATE users SET is_active=true WHERE id=$1', [admin.user.id]);
        });
        await t.test('audit failure rolls back file, share and account mutations', async () => {
            const existingShare = await request('/files/' + file.id + '/share', { token: owner.token, method: 'POST', body: { email: 'recipient@example.test' }, status: 201 });
            await pool.query("CREATE FUNCTION fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test audit failure'; END $$; CREATE TRIGGER fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fail_audit()");
            try {
                await request('/files/' + file.id, { token: owner.token, method: 'PATCH', body: { original_name: 'rolled-back.pdf' }, status: 500 });
                await request('/files/' + file.id + '/share', { token: owner.token, method: 'POST', body: { email: 'stranger@example.test' }, status: 500 });
                await request('/files/' + file.id + '/shares/' + existingShare.share.id, { token: owner.token, method: 'DELETE', status: 500 });
                await request('/admin/users/' + owner.user.id + '/status', { token: admin.token, method: 'PATCH', body: { is_active: false }, status: 500 });
                await request('/files/' + file.id, { token: owner.token, method: 'DELETE', status: 500 });
                const form = new FormData(); form.append('file', new Blob(['test'], { type: 'application/pdf' }), 'rollback.pdf');
                await request('/files/upload', { token: owner.token, method: 'POST', body: form, status: 500 });
                assert.equal((await fs.readdir(uploads)).length, 1);
                assert.equal((await request('/files', { token: owner.token })).files[0].original_name, 'Review.pdf');
                assert.equal((await request('/files/' + file.id + '/shares', { token: owner.token })).shares.length, 1);
            } finally { await pool.query('DROP TRIGGER fail_audit ON audit_logs; DROP FUNCTION fail_audit()'); }
            await request('/files/' + file.id + '/shares/' + existingShare.share.id, { token: owner.token, method: 'DELETE' });
        });
        await t.test('failed download does not produce a successful download event', async () => {
            const missing = await upload('missing.pdf');
            const physical = (await pool.query('SELECT file_path FROM files WHERE id=$1', [missing.id])).rows[0].file_path;
            await fs.unlink(physical);
            await request('/files/' + missing.id + '/download', { token: owner.token, status: 404 });
            assert.equal((await pool.query("SELECT count(*) FROM audit_logs WHERE file_id=$1 AND action='download'", [missing.id])).rows[0].count, '0');
            await request('/files/' + missing.id, { token: owner.token, method: 'DELETE' });
        });
        await t.test('rename and delete preserve audit snapshots; aggregates use live data', async () => {
            await request('/files/' + file.id, { token: owner.token, method: 'PATCH', body: { original_name: 'Renamed.pdf' } });
            await request('/files/' + file.id + '/share', { token: owner.token, method: 'POST', body: { email: 'recipient@example.test' }, status: 201 });
            const overview = (await request('/admin/overview', { token: admin.token })).overview;
            assert.equal(overview.users, 5); assert.equal(overview.files, 1); assert.equal(overview.shares, 1); assert.equal(Number(overview.bytes_stored), file.file_size);
            await request('/files/' + file.id, { token: owner.token, method: 'DELETE' });
            assert.equal((await fs.readdir(uploads)).length, 0);
            assert.equal((await request('/files/shared', { token: recipient.token })).files.length, 0);
            const history = (await request('/activity', { token: owner.token })).activity;
            for (const action of ['upload', 'rename', 'delete', 'share', 'revoke']) assert.ok(history.some(e => e.action === action), action);
            assert.ok(history.every(e => e.file_id === null));
            assert.equal(history.find(e => e.action === 'delete').details.filename, 'Renamed.pdf');
            assert.equal(history.find(e => e.action === 'rename').details.previous_name, 'Review.pdf');
            const system = await request('/admin/activity', { token: admin.token });
            assert.ok(system.activity.some(e => e.action === 'account_disabled'));
            assert.equal(Number((await request('/admin/overview', { token: admin.token })).overview.bytes_stored), 0);
        });
    } finally {
        if (server) await new Promise(resolve => server.close(resolve));
        await pool.end();
        const resolved = path.resolve(uploads);
        assert.ok(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep + 'securedocs-test-'));
        await fs.rm(resolved, { recursive: true, force: true });
    }
});

