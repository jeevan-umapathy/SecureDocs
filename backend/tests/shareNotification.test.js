const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { PGlite } = require("@electric-sql/pglite");
const shareModel = require("../models/shareModel");

test("share trigger creates one notification in the share transaction", async () => {
    const db = new PGlite();
    try {
        await db.exec(`
            CREATE TABLE users (id integer PRIMARY KEY);
            CREATE TABLE files (id integer PRIMARY KEY, original_name varchar(255) NOT NULL);
            CREATE TABLE shares (
                id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                file_id integer NOT NULL REFERENCES files(id),
                shared_with integer NOT NULL REFERENCES users(id),
                shared_at timestamptz DEFAULT now() NOT NULL,
                UNIQUE (file_id, shared_with)
            );
            CREATE TABLE notifications (
                id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                recipient_id integer NOT NULL REFERENCES users(id),
                file_id integer REFERENCES files(id),
                type varchar(30) NOT NULL,
                details jsonb DEFAULT '{}'::jsonb NOT NULL,
                is_read boolean DEFAULT false NOT NULL,
                created_at timestamptz DEFAULT now()
            );
            INSERT INTO users (id) VALUES (1), (2);
            INSERT INTO files (id, original_name) VALUES (10, 'report.pdf');
        `);

        const baseline = await fs.readFile(path.join(__dirname, "../migrations/000_baseline.sql"), "utf8");
        const triggerFunction = baseline.match(/CREATE FUNCTION public\.on_file_shared\(\) RETURNS trigger[\s\S]*?\$\$;/)[0];
        const trigger = baseline.match(/CREATE TRIGGER trg_file_shared[^;]*;/)[0];
        await db.exec(triggerFunction);
        await db.exec(trigger);

        const repair = await fs.readFile(path.join(__dirname, "../migrations/003_fix_file_received_notification.sql"), "utf8");
        await db.exec(repair);
        await db.exec(repair); // Production migration runner re-applies migrations on restart.

        await db.exec("BEGIN");
        const share = await shareModel.createShare(10, 2, db);
        assert.equal(share.file_id, 10);
        assert.equal(share.shared_with, 2);
        const notification = await db.query("SELECT recipient_id, file_id, type, details FROM notifications");
        assert.deepEqual(notification.rows, [{
            recipient_id: 2,
            file_id: 10,
            type: "file_received",
            details: { filename: "report.pdf", message: "A file was shared with you" }
        }]);
        await db.exec("COMMIT");

        assert.equal(await shareModel.createShare(10, 2, db), undefined);
        assert.equal((await db.query("SELECT count(*)::integer AS count FROM notifications")).rows[0].count, 1);

        await db.exec("INSERT INTO files (id, original_name) VALUES (11, 'draft.pdf')");
        await db.exec("BEGIN");
        await shareModel.createShare(11, 2, db);
        assert.equal((await db.query("SELECT count(*)::integer AS count FROM notifications")).rows[0].count, 2);
        await db.exec("ROLLBACK");
        assert.equal((await db.query("SELECT count(*)::integer AS count FROM shares")).rows[0].count, 1);
        assert.equal((await db.query("SELECT count(*)::integer AS count FROM notifications")).rows[0].count, 1);
    } finally {
        await db.close();
    }
});
