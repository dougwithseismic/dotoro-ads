import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    testTimeout: 30000, // Integration tests may take longer
    hookTimeout: 30000,
    pool: "forks", // Use forks for better isolation with database connections
    poolOptions: {
      forks: {
        singleFork: true, // Run tests sequentially to avoid connection issues
      },
    },
  },
});
