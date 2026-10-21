const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const jwt = require("jsonwebtoken");
const { PGlite } = require("@electric-sql/pglite");
const totp = require("../utils/totp");
const folderModel = require("../models/folderModel");
const fileModel = require("../models/fileModel");
const activityModel = require("../models/activityModel");
const shareModel = require("../models/shareModel");
const mfaModel = require("../models/mfaModel");
const storage = require("../services/storage");

const legacySchema = `
CREATE TABLE users (id SERIAL PRIMARY KEY, username TEXT NOT NULL, email TEXT NOT NULL,
    password_hash TEXT NOT NULL);
CREATE TABLE files (id SERIAL PRIMARY KEY, owner_id INTEGER REFERENCES users(id),
    original_name TEXT, stored_name TEXT, file_path TEXT, mime_type TEXT,
    file_size BIGINT, uploaded_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE shares (id SERIAL PRIMARY KEY, file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
    shared_with INTEGER REFERENCES users(id), shared_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (file_id, shared_with));
`;

test("migrations preserve existing rows and folder ownership", async () => {
    const db = new PGlite();
    try {
        await db.exec(legacySchema);
        await db.query("INSERT INTO users(username,email,password_hash) VALUES ('A','a@test','hash'),('B','b@test','hash')");
        await db.query(`INSERT INTO files(owner_id,original_name,stored_name,file_path,mime_type,file_size)
                        VALUES (1,'notes.pdf','n.pdf','uploads/n.pdf','application/pdf',5)`);
        await db.query("INSERT INTO shares(file_id,shared_with) VALUES (1,2)");

        for (let run = 0; run < 2; run++) {
            for (const name of ["001_activity_admin.sql", "002_mfa_folders.sql"]) {
                await db.exec(await fs.readFile(path.join(__dirname, "../migrations", name), "utf8"));
            }
        }
        assert.equal((await db.query("SELECT count(*)::integer AS count FROM files")).rows[0].count, 1);
        assert.equal((await db.query("SELECT count(*)::integer AS count FROM shares")).rows[0].count, 1);

        const own = await folderModel.create(1, "Project", null, db);
        const other = await folderModel.create(2, "Private", null, db);
        assert.equal(await folderModel.create(1, "Wrong parent", other.id, db), undefined);
        assert.equal(await fileModel.moveFile(1, 1, other.id, db), undefined);
        assert.equal((await fileModel.moveFile(1, 1, own.id, db)).folder_id, own.id);
        await assert.rejects(db.query("UPDATE files SET folder_id = $1 WHERE id = 1", [other.id]));
        assert.equal(await folderModel.remove(1, own.id, db), undefined);

        await db.query("UPDATE users SET mfa_enabled = true WHERE id = 1");
        assert.equal(await mfaModel.claimStep(1, 500, db), true);
        assert.equal(await mfaModel.claimStep(1, 500, db), false);
        assert.equal(await mfaModel.claimStep(1, 501, db), true);

        assert.equal(await shareModel.revokeShare(1, 1, 2, db), undefined);
        assert.equal((await db.query("SELECT count(*)::integer AS count FROM shares")).rows[0].count, 1);
        assert.equal((await shareModel.revokeShare(1, 1, 1, db)).email, "b@test");
        assert.equal((await db.query("SELECT count(*)::integer AS count FROM shares")).rows[0].count, 0);

        await activityModel.record(1, "delete", 1, { filename: "notes.pdf" }, db);
        await db.query("DELETE FROM files WHERE id = 1");
        const event = (await db.query("SELECT file_id, details FROM audit_logs WHERE action = 'delete'")).rows[0];
        assert.equal(event.file_id, null);
        assert.equal(event.details.filename, "notes.pdf");
    } finally { await db.close(); }
});

test("TOTP matches the RFC counter and encrypted secrets round-trip", () => {
    const original = process.env.MFA_ENCRYPTION_KEY;
    process.env.MFA_ENCRYPTION_KEY = "a1".repeat(32);
    try {
        const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
        assert.equal(totp.codeAt(secret, 1), "287082");
        assert.equal(totp.matchingStep(secret, "287082", 59000), 1);
        assert.equal(totp.matchingStep(secret, "000000", 59000), null);
        assert.equal(totp.decrypt(totp.encrypt(secret)), secret);
        const encrypted = totp.encrypt(secret);
        assert.notEqual(encrypted, totp.encrypt(secret));
    } finally {
        if (original === undefined) delete process.env.MFA_ENCRYPTION_KEY;
        else process.env.MFA_ENCRYPTION_KEY = original;
    }
});

test("MFA challenge cannot use protected routes", async () => {
    const original = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "test-secret";
    try {
        const middleware = require("../middleware/authMiddleware");
        const challenge = jwt.sign({ id: 1, purpose: "mfa" }, process.env.JWT_SECRET);
        let nextCalled = false;
        let status;
        const res = { status(code) { status = code; return this; }, json() { return this; } };
        await middleware({ headers: { authorization: `Bearer ${challenge}` } }, res,
            () => { nextCalled = true; });
        assert.equal(status, 401);
        assert.equal(nextCalled, false);
    } finally {
        if (original === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = original;
    }
});

test("private cloud storage keeps its secret in backend requests", async () => {
    const previous = { ...process.env };
    const originalFetch = global.fetch;
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "securedocs-"));
    const filename = path.join(dir, "temporary.pdf");
    await fs.writeFile(filename, "demo");
    process.env.STORAGE_DRIVER = "supabase";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_BUCKET = "private-files";
    process.env.SUPABASE_SECRET_KEY = "test-secret";
    const requests = [];
    global.fetch = async (url, options) => {
        requests.push({ url, options });
        return new Response("demo", { status: 200 });
    };
    try {
        const location = await storage.save({ path: filename, originalname: "file.pdf", mimetype: "application/pdf" });
        assert.match(location, /^supabase:\/\//);
        await assert.rejects(fs.stat(filename), { code: "ENOENT" });
        await storage.download(location);
        await storage.remove(location);
        assert.deepEqual(requests.map(item => item.options.method || "GET"), ["POST", "GET", "DELETE"]);
        assert.match(requests[1].url, /\/object\/authenticated\/private-files\//);
        assert.equal(requests[0].options.headers.apikey, "test-secret");
        assert.equal(requests[0].options.headers.Authorization, undefined);
    } finally {
        global.fetch = originalFetch;
        for (const key of ["STORAGE_DRIVER", "SUPABASE_URL", "SUPABASE_BUCKET", "SUPABASE_SECRET_KEY"]) {
            if (previous[key] === undefined) delete process.env[key];
            else process.env[key] = previous[key];
        }
        await fs.rm(dir, { recursive: true, force: true });
    }
});
