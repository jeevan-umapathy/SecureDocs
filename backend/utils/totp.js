const crypto = require("crypto");

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function generateSecret() {
    const bytes = crypto.randomBytes(20);
    let bits = 0;
    let value = 0;
    let output = "";
    for (const byte of bytes) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            output += ALPHABET[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits) output += ALPHABET[(value << (5 - bits)) & 31];
    return output;
}

function decodeSecret(secret) {
    let bits = 0;
    let value = 0;
    const bytes = [];
    for (const letter of secret.replace(/=+$/, "")) {
        const digit = ALPHABET.indexOf(letter);
        if (digit < 0) throw new Error("Invalid MFA secret");
        value = (value << 5) | digit;
        bits += 5;
        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }
    return Buffer.from(bytes);
}

function codeAt(secret, step) {
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(step));
    const hash = crypto.createHmac("sha1", decodeSecret(secret)).update(counter).digest();
    const offset = hash[hash.length - 1] & 15;
    return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, "0");
}

function matchingStep(secret, input, now = Date.now()) {
    if (typeof input !== "string" || !/^\d{6}$/.test(input)) return null;
    const step = Math.floor(now / 30000);
    for (const candidate of [step, step - 1, step + 1]) {
        if (candidate < 0) continue;
        if (crypto.timingSafeEqual(Buffer.from(codeAt(secret, candidate)), Buffer.from(input))) {
            return candidate;
        }
    }
    return null;
}

function encryptionKey() {
    const key = process.env.MFA_ENCRYPTION_KEY;
    if (!key || !/^[a-f0-9]{64}$/i.test(key)) {
        const error = new Error("MFA_ENCRYPTION_KEY must be 32 bytes in hex in backend/.env");
        error.status = 503;
        throw error;
    }
    return Buffer.from(key, "hex");
}

function encrypt(secret) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
    const data = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
    return [iv, cipher.getAuthTag(), data].map(part => part.toString("base64url")).join(".");
}

function decrypt(stored) {
    const [iv, tag, data] = stored.split(".").map(part => Buffer.from(part, "base64url"));
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

module.exports = { generateSecret, matchingStep, encrypt, decrypt, codeAt };
