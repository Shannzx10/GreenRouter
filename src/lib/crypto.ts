import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

// ---------- Enkripsi simetris untuk key hulu (AES-256-GCM) ----------
// Format simpan: base64(iv).base64(tag).base64(ciphertext) — sama seperti seed.
function encKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) throw new Error("ENCRYPTION_KEY belum di-set");
  return Buffer.from(hex, "hex");
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}

export function decryptSecret(stored: string): string {
  const [iv, tag, enc] = stored.split(".").map((s) => Buffer.from(s, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", encKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export function keyHint(key: string): string {
  return `${key.slice(0, 5)}…${key.slice(-4)}`;
}

// ---------- API key klien ----------
export function generateClientKey(): { full: string; prefix: string; hash: string } {
  const full = `gr-${randomBytes(24).toString("base64url")}`;
  return { full, prefix: full.slice(0, 10), hash: hashClientKey(full) };
}

export function hashClientKey(full: string): string {
  return createHash("sha256").update(full).digest("hex");
}

// ---------- Password admin (scrypt) ----------
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(expected, actual);
}

// ---------- Sesi login (cookie bertanda tangan HMAC) ----------
export type Session = { uid: string; email: string; role: string; exp: number };
export type AdminSession = Session;

function appSecret(): string {
  const s = process.env.APP_SECRET;
  if (!s) throw new Error("APP_SECRET belum di-set");
  return s;
}

export function signSession(data: Omit<Session, "exp">, ttlMs = 7 * 24 * 3600 * 1000): string {
  const payload: Session = { ...data, exp: Date.now() + ttlMs };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", appSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySession(token: string | undefined): Session | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", appSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Session;
    if (payload.exp < Date.now()) return null;
    if (!payload.uid || !payload.role) return null; // sesi lama tanpa role tidak berlaku
    return payload;
  } catch {
    return null;
  }
}
