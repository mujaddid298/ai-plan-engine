import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recommended for GCM

function getSecretKey(): Buffer {
  const secret = process.env.APP_SECRET || "ai-plan-engine-default-app-secret-32b!";
  // Derive 32 bytes key using SHA-256
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypt plain text using AES-256-GCM
 * Returns string in format: iv:authTag:encryptedHex
 */
export function encryptApiKey(plainText: string): string {
  if (!plainText) return "";

  const key = getSecretKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${tag}:${encrypted}`;
}

/**
 * Decrypt text encrypted with encryptApiKey
 * Gracefully handles unencrypted text (for backward compatibility)
 */
export function decryptApiKey(encryptedData: string): string {
  if (!encryptedData) return "";

  // Check if format matches iv:tag:ciphertext
  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    // Legacy plain text
    return encryptedData;
  }

  const [ivHex, tagHex, encryptedHex] = parts;

  // Validate hex lengths
  if (ivHex.length !== IV_LENGTH * 2 || tagHex.length !== 32) {
    return encryptedData;
  }

  try {
    const key = getSecretKey();
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.warn("Decryption failed, assuming plain text or invalid key:", error);
    return encryptedData;
  }
}

/**
 * Mask an API key to display safely in the UI (e.g., ••••••••abcd)
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey) return "";
  const decrypted = decryptApiKey(apiKey);
  if (decrypted.length <= 4) return "••••";
  const lastFour = decrypted.slice(-4);
  return `••••••••••••${lastFour}`;
}
