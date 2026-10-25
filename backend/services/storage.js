const fs = require("fs").promises;
const path = require("path");
const { randomUUID } = require("crypto");

function isRemote(location) {
    return location.startsWith("supabase://");
}

function config() {
    const origin = process.env.SUPABASE_URL;
    const bucket = process.env.SUPABASE_BUCKET;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!origin || !/^https:\/\//.test(origin) || !bucket ||
        !/^[a-zA-Z0-9_-]+$/.test(bucket) || !key) {
        throw new Error("Configure SUPABASE_URL, SUPABASE_BUCKET and SUPABASE_SECRET_KEY in backend/.env");
    }
    return { origin: origin.replace(/\/$/, ""), bucket, key };
}

function objectUrl(location, authenticated = false) {
    const { origin, bucket } = config();
    const objectKey = location.slice("supabase://".length);
    const encoded = objectKey.split("/").map(encodeURIComponent).join("/");
    return `${origin}/storage/v1/object/${authenticated ? "authenticated/" : ""}${bucket}/${encoded}`;
}

function headers(extra = {}) {
    const { key } = config();
    // New sb_secret_* keys are API keys, not JWTs. A Bearer header rejects them.
    return { apikey: key, ...extra };
}

async function save(file) {
    if (process.env.STORAGE_DRIVER !== "supabase") return file.path;

    const key = `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`;
    const location = `supabase://${key}`;
    const response = await fetch(objectUrl(location), {
        method: "POST",
        headers: headers({ "Content-Type": file.mimetype, "x-upsert": "false" }),
        body: await fs.readFile(file.path),
        signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) {
        const body = await response.json().catch(() => ({}));

        console.error("Supabase upload:", {
            status: response.status,
            code: body.error || body.statusCode,
            message: body.message
        });

        throw new Error(
            `Cloud upload failed (${response.status}).`
        );
    }
    await fs.unlink(file.path);
    return location;
}

async function download(location) {
    const response = await fetch(objectUrl(location, true), {
        headers: headers(),
        signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) throw new Error(`Cloud download failed (${response.status}).`);
    return response;
}

async function remove(location) {
    if (!isRemote(location)) {
        const resolved = path.isAbsolute(location) ? location : path.resolve(__dirname, "..", location);
        try { await fs.unlink(resolved); }
        catch (error) { if (error.code !== "ENOENT") throw error; }
        return;
    }
    const response = await fetch(objectUrl(location), {
        method: "DELETE",
        headers: headers(),
        signal: AbortSignal.timeout(30000)
    });
    if (!response.ok && response.status !== 404) throw new Error(`Cloud delete failed (${response.status}).`);
}

module.exports = { save, download, remove, isRemote };
