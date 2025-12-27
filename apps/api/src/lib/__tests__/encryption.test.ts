import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// We'll dynamically import the module to test environment variable handling
const TEST_ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("encryption", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    // Reset modules to ensure clean state
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    vi.resetModules();
  });

  describe("encrypt and decrypt - round trip", () => {
    it("encrypts and decrypts a simple string successfully", async () => {
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      const { encrypt, decrypt } = await import("../encryption.js");

      const plaintext = "Hello, World!";
      const ciphertext = encrypt(plaintext);
      const decrypted = decrypt(ciphertext);

      expect(decrypted).toBe(plaintext);
    });

    it("encrypts and decrypts an empty string", async () => {
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      const { encrypt, decrypt } = await import("../encryption.js");

      const plaintext = "";
      const ciphertext = encrypt(plaintext);
      const decrypted = decrypt(ciphertext);

      expect(decrypted).toBe(plaintext);
    });

    it("encrypts and decrypts unicode characters", async () => {
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      const { encrypt, decrypt } = await import("../encryption.js");

      const plaintext = "Hello, World! Привет мир! \u0048\u0065\u006C\u006C\u006F";
      const ciphertext = encrypt(plaintext);
      const decrypted = decrypt(ciphertext);

      expect(decrypted).toBe(plaintext);
    });

    it("encrypts and decrypts special characters", async () => {
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      const { encrypt, decrypt } = await import("../encryption.js");

      const plaintext = "Special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?";
      const ciphertext = encrypt(plaintext);
      const decrypted = decrypt(ciphertext);

      expect(decrypted).toBe(plaintext);
    });

    it("encrypts and decrypts JSON data", async () => {
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      const { encrypt, decrypt } = await import("../encryption.js");

      const jsonData = {
        accessToken: "ya29.abc123",
        refreshToken: "1//0def456",
        expiresAt: 1234567890,
      };
      const plaintext = JSON.stringify(jsonData);
      const ciphertext = encrypt(plaintext);
      const decrypted = decrypt(ciphertext);

      expect(decrypted).toBe(plaintext);
      expect(JSON.parse(decrypted)).toEqual(jsonData);
    });

    it("encrypts and decrypts long strings", async () => {
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      const { encrypt, decrypt } = await import("../encryption.js");

      const plaintext = "a".repeat(10000);
      const ciphertext = encrypt(plaintext);
      const decrypted = decrypt(ciphertext);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe("ciphertext format", () => {
    it("produces ciphertext in correct format: iv:authTag:ciphertext", async () => {
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      const { encrypt } = await import("../encryption.js");

      const ciphertext = encrypt("test");
      const parts = ciphertext.split(":");

      expect(parts).toHaveLength(3);
      // Each part should be valid base64
      parts.forEach((part) => {
        expect(() => Buffer.from(part, "base64")).not.toThrow();
      });
    });

    it("IV is 12 bytes (16 chars base64)", async () => {
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      const { encrypt } = await import("../encryption.js");

      const ciphertext = encrypt("test");
      const [iv] = ciphertext.split(":");
      const ivBuffer = Buffer.from(iv, "base64");

      expect(ivBuffer.length).toBe(12);
    });

    it("auth tag is 16 bytes", async () => {
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      const { encrypt } = await import("../encryption.js");

      const ciphertext = encrypt("test");
      const [, authTag] = ciphertext.split(":");
      const authTagBuffer = Buffer.from(authTag, "base64");

      expect(authTagBuffer.length).toBe(16);
    });
  });

  describe("ciphertext uniqueness", () => {
    it("different plaintexts produce different ciphertexts", async () => {
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      const { encrypt } = await import("../encryption.js");

      const ciphertext1 = encrypt("plaintext1");
      const ciphertext2 = encrypt("plaintext2");

      expect(ciphertext1).not.toBe(ciphertext2);
    });

    it("same plaintext encrypted twice produces different ciphertexts (random IV)", async () => {
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      const { encrypt } = await import("../encryption.js");

      const plaintext = "same plaintext";
      const ciphertext1 = encrypt(plaintext);
      const ciphertext2 = encrypt(plaintext);

      expect(ciphertext1).not.toBe(ciphertext2);

      // But both should decrypt to the same plaintext
      const { decrypt } = await import("../encryption.js");
      expect(decrypt(ciphertext1)).toBe(plaintext);
      expect(decrypt(ciphertext2)).toBe(plaintext);
    });

    it("IVs are different for multiple encryptions", async () => {
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      const { encrypt } = await import("../encryption.js");

      const ciphertext1 = encrypt("test");
      const ciphertext2 = encrypt("test");

      const [iv1] = ciphertext1.split(":");
      const [iv2] = ciphertext2.split(":");

      expect(iv1).not.toBe(iv2);
    });
  });

  describe("tampered ciphertext detection", () => {
    it("throws authentication error when ciphertext is tampered", async () => {
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      const { encrypt, decrypt } = await import("../encryption.js");

      const ciphertext = encrypt("sensitive data");
      const [iv, authTag, encryptedData] = ciphertext.split(":");

      // Tamper with the encrypted data
      const tamperedBuffer = Buffer.from(encryptedData, "base64");
      tamperedBuffer[0] = tamperedBuffer[0] ^ 0xff; // Flip bits
      const tamperedCiphertext = `${iv}:${authTag}:${tamperedBuffer.toString("base64")}`;

      expect(() => decrypt(tamperedCiphertext)).toThrow(/authentication|decrypt|tag/i);
    });

    it("throws authentication error when IV is tampered", async () => {
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      const { encrypt, decrypt } = await import("../encryption.js");

      const ciphertext = encrypt("sensitive data");
      const [iv, authTag, encryptedData] = ciphertext.split(":");

      // Tamper with the IV
      const tamperedIvBuffer = Buffer.from(iv, "base64");
      tamperedIvBuffer[0] = tamperedIvBuffer[0] ^ 0xff;
      const tamperedCiphertext = `${tamperedIvBuffer.toString("base64")}:${authTag}:${encryptedData}`;

      expect(() => decrypt(tamperedCiphertext)).toThrow(/authentication|decrypt|tag/i);
    });

    it("throws authentication error when auth tag is tampered", async () => {
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      const { encrypt, decrypt } = await import("../encryption.js");

      const ciphertext = encrypt("sensitive data");
      const [iv, authTag, encryptedData] = ciphertext.split(":");

      // Tamper with the auth tag
      const tamperedTagBuffer = Buffer.from(authTag, "base64");
      tamperedTagBuffer[0] = tamperedTagBuffer[0] ^ 0xff;
      const tamperedCiphertext = `${iv}:${tamperedTagBuffer.toString("base64")}:${encryptedData}`;

      expect(() => decrypt(tamperedCiphertext)).toThrow(/authentication|decrypt|tag/i);
    });
  });

  describe("invalid ciphertext format", () => {
    it("throws descriptive error for missing parts", async () => {
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      const { decrypt } = await import("../encryption.js");

      expect(() => decrypt("onlyonepart")).toThrow(/invalid.*format/i);
      expect(() => decrypt("two:parts")).toThrow(/invalid.*format/i);
    });

    it("throws descriptive error for invalid base64 in IV", async () => {
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      const { decrypt } = await import("../encryption.js");

      expect(() => decrypt("not-valid-b64!!!:AAAA:BBBB")).toThrow(/invalid|base64|IV/i);
    });

    it("throws descriptive error for empty ciphertext", async () => {
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      const { decrypt } = await import("../encryption.js");

      expect(() => decrypt("")).toThrow(/invalid.*format/i);
    });

    it("throws descriptive error for wrong IV length", async () => {
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      const { decrypt } = await import("../encryption.js");

      // IV should be 12 bytes, this is only 8 bytes
      const shortIv = Buffer.from("12345678").toString("base64");
      const authTag = Buffer.alloc(16).toString("base64");
      const data = Buffer.from("test").toString("base64");

      expect(() => decrypt(`${shortIv}:${authTag}:${data}`)).toThrow(/IV|length|12/i);
    });

    it("throws descriptive error for wrong auth tag length", async () => {
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      const { decrypt } = await import("../encryption.js");

      // Auth tag should be 16 bytes, this is only 8 bytes
      const iv = Buffer.alloc(12).toString("base64");
      const shortAuthTag = Buffer.from("12345678").toString("base64");
      const data = Buffer.from("test").toString("base64");

      expect(() => decrypt(`${iv}:${shortAuthTag}:${data}`)).toThrow(
        /auth.*tag|length|16/i
      );
    });
  });

  describe("missing ENCRYPTION_KEY", () => {
    it("throws configuration error when ENCRYPTION_KEY is not set", async () => {
      delete process.env.ENCRYPTION_KEY;
      const { encrypt } = await import("../encryption.js");

      expect(() => encrypt("test")).toThrow(/ENCRYPTION_KEY.*not.*set|configuration/i);
    });

    it("throws configuration error on decrypt when ENCRYPTION_KEY is not set", async () => {
      delete process.env.ENCRYPTION_KEY;
      const { decrypt } = await import("../encryption.js");

      expect(() => decrypt("any:cipher:text")).toThrow(
        /ENCRYPTION_KEY.*not.*set|configuration/i
      );
    });

    it("throws configuration error when ENCRYPTION_KEY is empty", async () => {
      process.env.ENCRYPTION_KEY = "";
      const { encrypt } = await import("../encryption.js");

      expect(() => encrypt("test")).toThrow(/ENCRYPTION_KEY.*not.*set|configuration/i);
    });
  });

  describe("invalid ENCRYPTION_KEY length", () => {
    it("throws error when ENCRYPTION_KEY is too short", async () => {
      process.env.ENCRYPTION_KEY = "0123456789abcdef"; // 16 chars = 64 bits, should be 64 chars
      const { encrypt } = await import("../encryption.js");

      expect(() => encrypt("test")).toThrow(/ENCRYPTION_KEY.*64.*hex|length|256.*bit/i);
    });

    it("throws error when ENCRYPTION_KEY is too long", async () => {
      process.env.ENCRYPTION_KEY = "0".repeat(128); // 128 chars, should be 64 chars
      const { encrypt } = await import("../encryption.js");

      expect(() => encrypt("test")).toThrow(/ENCRYPTION_KEY.*64.*hex|length|256.*bit/i);
    });

    it("throws error when ENCRYPTION_KEY contains non-hex characters", async () => {
      process.env.ENCRYPTION_KEY =
        "ghijklmnopqrstuv0123456789abcdef0123456789abcdef0123456789abcdef";
      const { encrypt } = await import("../encryption.js");

      expect(() => encrypt("test")).toThrow(/ENCRYPTION_KEY.*hex|invalid/i);
    });
  });

  describe("isEncryptionConfigured", () => {
    it("returns true when ENCRYPTION_KEY is properly configured", async () => {
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      const { isEncryptionConfigured } = await import("../encryption.js");

      expect(isEncryptionConfigured()).toBe(true);
    });

    it("returns false when ENCRYPTION_KEY is not set", async () => {
      delete process.env.ENCRYPTION_KEY;
      const { isEncryptionConfigured } = await import("../encryption.js");

      expect(isEncryptionConfigured()).toBe(false);
    });

    it("returns false when ENCRYPTION_KEY is empty", async () => {
      process.env.ENCRYPTION_KEY = "";
      const { isEncryptionConfigured } = await import("../encryption.js");

      expect(isEncryptionConfigured()).toBe(false);
    });

    it("returns false when ENCRYPTION_KEY is wrong length", async () => {
      process.env.ENCRYPTION_KEY = "0123456789abcdef"; // 16 chars, should be 64
      const { isEncryptionConfigured } = await import("../encryption.js");

      expect(isEncryptionConfigured()).toBe(false);
    });

    it("returns false when ENCRYPTION_KEY contains non-hex characters", async () => {
      process.env.ENCRYPTION_KEY =
        "ghijklmnopqrstuv0123456789abcdef0123456789abcdef0123456789abcdef";
      const { isEncryptionConfigured } = await import("../encryption.js");

      expect(isEncryptionConfigured()).toBe(false);
    });
  });

  describe("encryptObject and decryptObject", () => {
    it("encrypts and decrypts an object successfully", async () => {
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      const { encryptObject, decryptObject } = await import("../encryption.js");

      const obj = { accessToken: "ya29.xxx", refreshToken: "1//xxx", expiresAt: 1234567890 };
      const encrypted = encryptObject(obj);
      const decrypted = decryptObject<typeof obj>(encrypted);

      expect(decrypted).toEqual(obj);
    });

    it("encrypts and decrypts nested objects", async () => {
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      const { encryptObject, decryptObject } = await import("../encryption.js");

      const obj = {
        user: { id: 1, name: "Test" },
        tokens: { access: "abc", refresh: "def" },
        metadata: { nested: { deep: { value: true } } },
      };
      const encrypted = encryptObject(obj);
      const decrypted = decryptObject<typeof obj>(encrypted);

      expect(decrypted).toEqual(obj);
    });

    it("encrypts and decrypts arrays", async () => {
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      const { encryptObject, decryptObject } = await import("../encryption.js");

      const arr = [1, 2, 3, "four", { five: 5 }];
      const encrypted = encryptObject(arr);
      const decrypted = decryptObject<typeof arr>(encrypted);

      expect(decrypted).toEqual(arr);
    });

    it("throws on invalid JSON during decryptObject", async () => {
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      const { encrypt, decryptObject } = await import("../encryption.js");

      const encrypted = encrypt("not valid json");
      expect(() => decryptObject(encrypted)).toThrow(/JSON/i);
    });

    it("handles null values in objects", async () => {
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      const { encryptObject, decryptObject } = await import("../encryption.js");

      const obj = { value: null, other: "data" };
      const encrypted = encryptObject(obj);
      const decrypted = decryptObject<typeof obj>(encrypted);

      expect(decrypted).toEqual(obj);
    });
  });

  describe("legacy compatibility", () => {
    it("converts between legacy and string formats", async () => {
      const { legacyToString, stringToLegacy } = await import("../encryption.js");

      const legacy = { iv: "abc", authTag: "def", encrypted: "ghi" };
      const str = legacyToString(legacy);
      expect(str).toBe("abc:def:ghi");
      expect(stringToLegacy(str)).toEqual(legacy);
    });

    it("handles real encrypted data in legacy format", async () => {
      process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      const { encrypt, decrypt, legacyToString, stringToLegacy } = await import(
        "../encryption.js"
      );

      const plaintext = "test data";
      const ciphertext = encrypt(plaintext);

      // Convert to legacy and back
      const legacy = stringToLegacy(ciphertext);
      expect(legacy).toHaveProperty("iv");
      expect(legacy).toHaveProperty("authTag");
      expect(legacy).toHaveProperty("encrypted");

      const backToString = legacyToString(legacy);
      expect(backToString).toBe(ciphertext);

      // Verify decryption still works
      expect(decrypt(backToString)).toBe(plaintext);
    });

    it("throws for invalid ciphertext format in stringToLegacy", async () => {
      const { stringToLegacy } = await import("../encryption.js");

      expect(() => stringToLegacy("only:two")).toThrow(/invalid.*format/i);
      expect(() => stringToLegacy("one")).toThrow(/invalid.*format/i);
    });
  });
});
