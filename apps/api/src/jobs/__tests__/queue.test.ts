import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";

// Mock pg-boss before importing the module under test
vi.mock("pg-boss", () => {
  const mockBoss = {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    work: vi.fn(),
    send: vi.fn().mockResolvedValue("job-id-123"),
    getJobById: vi.fn(),
  };
  return {
    PgBoss: vi.fn(() => mockBoss),
  };
});

// Import after mocking
import { getJobQueue, stopJobQueue, resetJobQueue } from "../queue.js";
import { PgBoss } from "pg-boss";

describe("Job Queue Module", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeAll(() => {
    // Ensure DATABASE_URL is set for tests
    process.env.DATABASE_URL = "postgres://test:test@localhost:5432/testdb";
  });

  afterAll(() => {
    // Restore original DATABASE_URL
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the singleton between tests
    resetJobQueue();
  });

  afterEach(async () => {
    // Clean up after each test
    await stopJobQueue();
  });

  describe("getJobQueue", () => {
    it("should return a PgBoss instance", async () => {
      const queue = await getJobQueue();
      expect(queue).toBeDefined();
      expect(PgBoss).toHaveBeenCalled();
    });

    it("should return singleton instance on subsequent calls", async () => {
      const queue1 = await getJobQueue();
      const queue2 = await getJobQueue();

      // Should be the exact same instance
      expect(queue1).toBe(queue2);
      // PgBoss constructor should only be called once
      expect(PgBoss).toHaveBeenCalledTimes(1);
    });

    it("should return same instance for concurrent calls (race condition prevention)", async () => {
      // Simulate multiple concurrent calls to getJobQueue
      // This tests that the promise-based singleton prevents race conditions
      const concurrentCalls = Array.from({ length: 10 }, () => getJobQueue());
      const results = await Promise.all(concurrentCalls);

      // All results should be the exact same instance
      const firstResult = results[0];
      results.forEach((result) => {
        expect(result).toBe(firstResult);
      });

      // PgBoss constructor should only be called once despite concurrent calls
      expect(PgBoss).toHaveBeenCalledTimes(1);
    });

    it("should start the boss instance on first call", async () => {
      const queue = await getJobQueue();
      expect(queue.start).toHaveBeenCalledTimes(1);
    });

    it("should not start again on subsequent calls", async () => {
      await getJobQueue();
      await getJobQueue();

      const mockBoss = (PgBoss as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      expect(mockBoss.start).toHaveBeenCalledTimes(1);
    });

    it("should use DATABASE_URL from environment", async () => {
      const originalUrl = process.env.DATABASE_URL;
      process.env.DATABASE_URL = "postgres://test:test@localhost:5432/testdb";

      resetJobQueue();
      await getJobQueue();

      expect(PgBoss).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionString: "postgres://test:test@localhost:5432/testdb",
        })
      );

      process.env.DATABASE_URL = originalUrl;
    });

    it("should configure pg-boss with appropriate settings", async () => {
      await getJobQueue();

      expect(PgBoss).toHaveBeenCalledWith(
        expect.objectContaining({
          // Verify key configuration options
          retryLimit: expect.any(Number),
          retryDelay: expect.any(Number),
        })
      );
    });

    it("should throw error when DATABASE_URL is not set", async () => {
      const originalUrl = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      resetJobQueue();

      await expect(getJobQueue()).rejects.toThrow("DATABASE_URL");

      process.env.DATABASE_URL = originalUrl;
    });
  });

  describe("stopJobQueue", () => {
    it("should stop the boss instance if running", async () => {
      const queue = await getJobQueue();
      await stopJobQueue();

      expect(queue.stop).toHaveBeenCalledTimes(1);
    });

    it("should not throw if called when no instance exists", async () => {
      // Don't call getJobQueue first
      await expect(stopJobQueue()).resolves.not.toThrow();
    });

    it("should allow creating a new instance after stop", async () => {
      await getJobQueue();
      await stopJobQueue();
      resetJobQueue();

      const newQueue = await getJobQueue();
      expect(newQueue).toBeDefined();
      expect(PgBoss).toHaveBeenCalledTimes(2);
    });
  });

  describe("resetJobQueue", () => {
    it("should reset the singleton state", async () => {
      await getJobQueue();
      resetJobQueue();

      // Getting queue again should create new instance
      await getJobQueue();
      expect(PgBoss).toHaveBeenCalledTimes(2);
    });
  });
});
