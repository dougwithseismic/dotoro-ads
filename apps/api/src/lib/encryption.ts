import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

// ============================================================================
// Constants
// ============================================================================

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

// ============================================================================
// Key Management
// ============================================================================

let cachedKey: Buffer | null = null;
let cachedSalt: Buffer | null = null;

/**
 * Get or derive encryption key from environment variable
 * Uses scrypt to derive a secure key from the ENCRYPTION_KEY environment variable
 *
 * Security: Uses ENCRYPTION_SALT environment variable for key derivation.
 * Generate a salt with: openssl rand -hex 16
 */
function getEncryptionKey(): Buffer {
  if (cachedKey && cachedSalt) {
    return cachedKey;
  }

  const encryptionSecret = process.env.ENCRYPTION_KEY;
  if (!encryptionSecret) {
    throw new Error(
      "ENCRYPTION_KEY environment variable must be set for token encryption"
    );
  }

  // Use salt from environment variable for secure key derivation
  const saltHex = process.env.ENCRYPTION_SALT;
  if (!saltHex || saltHex.length < 32) {
    throw new Error(
      "ENCRYPTION_SALT must be set (min 32 hex characters). Generate with: openssl rand -hex 16"
    );
  }
  cachedSalt = Buffer.from(saltHex, "hex");

  // Derive key using scrypt
  cachedKey = scryptSync(encryptionSecret, cachedSalt, KEY_LENGTH);

  return cachedKey;
}

// ============================================================================
// Encryption Functions
// ============================================================================

export interface EncryptedData {
  encrypted: string; // base64 encoded
  iv: string; // base64 encoded
  authTag: string; // base64 encoded
}

/**
 * Encrypt a string using AES-256-GCM
 */
export function encrypt(plaintext: string): EncryptedData {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

/**
 * Decrypt data encrypted with AES-256-GCM
 */
export function decrypt(data: EncryptedData): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(data.iv, "base64");
  const authTag = Buffer.from(data.authTag, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(data.encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Encrypt an object by stringifying and encrypting
 */
export function encryptObject<T>(obj: T): EncryptedData {
  return encrypt(JSON.stringify(obj));
}

/**
 * Decrypt and parse an encrypted object
 */
export function decryptObject<T>(data: EncryptedData): T {
  const decrypted = decrypt(data);
  return JSON.parse(decrypted) as T;
}

// ============================================================================
// Testing Utilities
// ============================================================================

/**
 * Reset cached key for testing purposes
 * This should only be used in tests
 */
export function resetEncryptionKey(): void {
  cachedKey = null;
  cachedSalt = null;
}
