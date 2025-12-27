import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";

// Mock pg-boss before importing the module under test
vi.mock("pg-boss", () => {
  const mockBoss = {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    work: vi.fn(),
    send: vi.fn().mockResolvedValue("job-id-123"),
    getJobById: vi.fn(),
    on: vi.fn(), // Event handler registration
  };
  return {
    PgBoss: vi.fn(() => mockBoss),
  };
});

// Import after mocking
import {
  getJobQueue,
  getJobQueueReady,
  stopJobQueue,
  resetJobQueue,
  setHandlersRegistrationPromise,
  areHandlersRegistered,
} from "../queue.js";
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

  describe("getJobQueueReady", () => {
    it("should return queue immediately if handlers are registered", async () => {
      // First, set up a registration promise that resolves immediately
      setHandlersRegistrationPromise(Promise.resolve());

      // Wait a tick for the promise to settle
      await new Promise((resolve) => setImmediate(resolve));

      const queue = await getJobQueueReady();
      expect(queue).toBeDefined();
      expect(areHandlersRegistered()).toBe(true);
    });

    it("should wait for handlers registration before returning", async () => {
      let resolveRegistration: () => void;
      const registrationPromise = new Promise<void>((resolve) => {
        resolveRegistration = resolve;
      });

      setHandlersRegistrationPromise(registrationPromise);

      // Start getting the queue (it will wait for registration)
      let queueReceived = false;
      const queuePromise = getJobQueueReady().then((q) => {
        queueReceived = true;
        return q;
      });

      // At this point, registration hasn't completed
      await new Promise((resolve) => setImmediate(resolve));
      expect(queueReceived).toBe(false);
      expect(areHandlersRegistered()).toBe(false);

      // Now complete registration
      resolveRegistration!();
      await new Promise((resolve) => setImmediate(resolve));

      const queue = await queuePromise;
      expect(queue).toBeDefined();
      expect(queueReceived).toBe(true);
      expect(areHandlersRegistered()).toBe(true);
    });

    it("should warn but continue if no registration promise exists", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Call getJobQueueReady without setting registration promise
      const queue = await getJobQueueReady();

      expect(queue).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("getJobQueueReady called before")
      );

      consoleSpy.mockRestore();
    });
  });

  describe("areHandlersRegistered", () => {
    it("should return false initially", () => {
      expect(areHandlersRegistered()).toBe(false);
    });

    it("should return true after handlers are registered", async () => {
      setHandlersRegistrationPromise(Promise.resolve());

      // Wait for the promise to settle
      await new Promise((resolve) => setImmediate(resolve));

      expect(areHandlersRegistered()).toBe(true);
    });
  });

  describe("setHandlersRegistrationPromise", () => {
    it("should track registration state", async () => {
      expect(areHandlersRegistered()).toBe(false);

      setHandlersRegistrationPromise(Promise.resolve());

      // Wait for promise to settle
      await new Promise((resolve) => setImmediate(resolve));

      expect(areHandlersRegistered()).toBe(true);
    });

    it("should log when registration completes", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      setHandlersRegistrationPromise(Promise.resolve());

      // Wait for promise to settle
      await new Promise((resolve) => setImmediate(resolve));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("All job handlers registered")
      );

      consoleSpy.mockRestore();
    });
  });
});
