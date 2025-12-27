import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// ============================================================================
// Constants
// ============================================================================

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM (recommended by NIST)
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits = 64 hex characters
const HEX_KEY_LENGTH = KEY_LENGTH * 2; // 64 hex characters

// ============================================================================
// Key Validation
// ============================================================================

/**
 * Validates that a string is a valid hex string
 */
function isValidHexString(str: string): boolean {
  return /^[0-9a-fA-F]+$/.test(str);
}

/**
 * Validates the encryption key format
 * @returns Object with isValid boolean and optional error message
 */
function validateEncryptionKey(key: string | undefined): {
  isValid: boolean;
  error?: string;
} {
  if (!key || key.length === 0) {
    return {
      isValid: false,
      error: "ENCRYPTION_KEY environment variable is not set",
    };
  }

  if (key.length !== HEX_KEY_LENGTH) {
    return {
      isValid: false,
      error: `ENCRYPTION_KEY must be exactly 64 hex characters (256-bit key), got ${key.length} characters`,
    };
  }

  if (!isValidHexString(key)) {
    return {
      isValid: false,
      error: "ENCRYPTION_KEY must contain only valid hex characters (0-9, a-f, A-F)",
    };
  }

  return { isValid: true };
}

/**
 * Gets the encryption key from environment variable
 * @throws Error if ENCRYPTION_KEY is not set or invalid
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  const validation = validateEncryptionKey(key);

  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  return Buffer.from(key!, "hex");
}

// ============================================================================
// Encryption Functions
// ============================================================================

/**
 * Encrypt a plaintext string using AES-256-GCM
 *
 * @param plaintext - The string to encrypt
 * @returns Encrypted data in format: base64(iv):base64(authTag):base64(ciphertext)
 * @throws Error if ENCRYPTION_KEY is not configured or invalid
 *
 * @example
 * ```ts
 * const encrypted = encrypt("sensitive data");
 * // Returns: "abc123...:def456...:ghi789..."
 * ```
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext (all base64 encoded)
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
}

/**
 * Decrypt a ciphertext string using AES-256-GCM
 *
 * @param ciphertext - Encrypted data in format: base64(iv):base64(authTag):base64(ciphertext)
 * @returns The original plaintext string
 * @throws Error if ENCRYPTION_KEY is not configured, ciphertext is invalid, or authentication fails
 *
 * @example
 * ```ts
 * const decrypted = decrypt("abc123...:def456...:ghi789...");
 * // Returns: "sensitive data"
 * ```
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();

  // Validate format
  if (!ciphertext || ciphertext.length === 0) {
    throw new Error("Invalid ciphertext format: empty string");
  }

  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error(
      `Invalid ciphertext format: expected 3 parts (iv:authTag:ciphertext), got ${parts.length}`
    );
  }

  // TypeScript needs explicit assertions since split() returns string[]
  const ivBase64 = parts[0] as string;
  const authTagBase64 = parts[1] as string;
  const encryptedBase64 = parts[2] as string;

  // Parse and validate IV
  let iv: Buffer;
  try {
    iv = Buffer.from(ivBase64, "base64");
  } catch {
    throw new Error("Invalid ciphertext format: IV is not valid base64");
  }

  if (iv.length !== IV_LENGTH) {
    throw new Error(
      `Invalid ciphertext format: IV must be ${IV_LENGTH} bytes, got ${iv.length}`
    );
  }

  // Parse and validate auth tag
  let authTag: Buffer;
  try {
    authTag = Buffer.from(authTagBase64, "base64");
  } catch {
    throw new Error("Invalid ciphertext format: auth tag is not valid base64");
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error(
      `Invalid ciphertext format: auth tag must be ${AUTH_TAG_LENGTH} bytes, got ${authTag.length}`
    );
  }

  // Parse encrypted data
  let encrypted: Buffer;
  try {
    encrypted = Buffer.from(encryptedBase64, "base64");
  } catch {
    throw new Error("Invalid ciphertext format: encrypted data is not valid base64");
  }

  // Decrypt
  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  try {
    let decrypted = decipher.update(encrypted, undefined, "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    // GCM authentication failure
    if (error instanceof Error && error.message.includes("Unsupported state")) {
      throw new Error("Decryption failed: authentication tag mismatch (data may be tampered)");
    }
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}

/**
 * Check if encryption is properly configured
 *
 * @returns true if ENCRYPTION_KEY is set and valid, false otherwise
 *
 * @example
 * ```ts
 * if (!isEncryptionConfigured()) {
 *   console.warn("Encryption is not configured - tokens will not be stored securely");
 * }
 * ```
 */
export function isEncryptionConfigured(): boolean {
  const key = process.env.ENCRYPTION_KEY;
  const validation = validateEncryptionKey(key);
  return validation.isValid;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Encrypt an object by stringifying and encrypting
 *
 * @param obj - The object to encrypt
 * @returns Encrypted data in format: base64(iv):base64(authTag):base64(ciphertext)
 */
export function encryptObject<T>(obj: T): string {
  return encrypt(JSON.stringify(obj));
}

/**
 * Decrypt and parse an encrypted object
 *
 * WARNING: This performs an unsafe type cast. The caller is responsible
 * for ensuring the decrypted data matches type T, or using runtime validation.
 *
 * @param ciphertext - The encrypted string (from encryptObject)
 * @returns The decrypted and parsed object
 * @throws Error if decryption or JSON parsing fails
 */
export function decryptObject<T>(ciphertext: string): T {
  const decrypted = decrypt(ciphertext);
  return JSON.parse(decrypted) as T;
}

// ============================================================================
// Legacy Compatibility Types (for migration)
// ============================================================================

/**
 * @deprecated Use the string format directly. This type is kept for backwards compatibility.
 */
export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
}

/**
 * Convert legacy EncryptedData object to the new string format
 * @deprecated For migration purposes only
 */
export function legacyToString(data: EncryptedData): string {
  return `${data.iv}:${data.authTag}:${data.encrypted}`;
}

/**
 * Convert new string format to legacy EncryptedData object
 * @deprecated For migration purposes only
 */
export function stringToLegacy(ciphertext: string): EncryptedData {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid ciphertext format");
  }
  return {
    iv: parts[0] as string,
    authTag: parts[1] as string,
    encrypted: parts[2] as string,
  };
}
