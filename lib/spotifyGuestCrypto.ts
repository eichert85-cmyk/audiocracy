import crypto from "crypto";

// Cookie names
export const GUEST_SPOTIFY_ACCESS_COOKIE = "guest_spotify_access";
export const GUEST_SPOTIFY_REFRESH_COOKIE = "guest_spotify_refresh";
export const GUEST_SPOTIFY_EXPIRES_COOKIE = "guest_spotify_expires";

// Encryption config
const ALGO = "aes-256-gcm";

const SECRET = process.env.GUEST_SPOTIFY_COOKIE_SECRET!;
if (!SECRET || SECRET.length !== 32) {
  throw new Error("GUEST_SPOTIFY_COOKIE_SECRET must be 32 chars long");
}

export async function encrypt(text: string): Promise<string> {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, Buffer.from(SECRET), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export async function decrypt(payload: string): Promise<string> {
  const data = Buffer.from(payload, "base64");
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, Buffer.from(SECRET), iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted, undefined, "utf8") + decipher.final("utf8");
}
