import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "node:crypto";
import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import { getDb } from "@/lib/db";

function getEncryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET must be configured before admin MFA can be used.");
  return scryptSync(secret, "momenique-admin-totp-v1", 32);
}

/** Encrypts authenticator secrets at rest using an app-secret-derived key. */
export function encryptMfaSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

/** Decrypts an authenticator secret stored by the server, never by the client. */
export function decryptMfaSecret(value: string): string {
  const [iv, tag, encrypted, ...rest] = value.split(".");
  if (!iv || !tag || !encrypted || rest.length) throw new Error("Stored MFA secret is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

/** Creates the QR data and otpauth URI used to enroll an administrator device. */
export async function createMfaEnrollment(email: string) {
  const secret = generateSecret();
  const uri = generateURI({ issuer: "my e-Wish", label: email, secret });
  return { secret, uri, qrCode: await QRCode.toDataURL(uri, { margin: 1, width: 220 }) };
}

/** Verifies an authenticator code once; short-lived unique records prevent TOTP replay. */
export async function verifyTotpOnce(userId: string, encryptedSecret: string, token: string): Promise<boolean> {
  if (!/^\d{6}$/.test(token) || !/^[a-f\d]{24}$/i.test(userId)) return false;
  const secret = decryptMfaSecret(encryptedSecret);
  const result = await verify({ secret, token, epochTolerance: 1 });
  if (!result.valid) return false;

  const db = await getDb();
  const replayId = createHash("sha256").update(`${userId}:${token}`).digest("hex");
  try {
    await db.collection<{ _id: string; expiresAt: Date }>("mfaUsedCodes").insertOne({ _id: replayId, expiresAt: new Date(Date.now() + 2 * 60 * 1000) });
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) return false;
    throw error;
  }
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

export function createRecoveryCodes(): string[] {
  return Array.from({ length: 10 }, () => randomBytes(6).toString("hex").toUpperCase());
}
