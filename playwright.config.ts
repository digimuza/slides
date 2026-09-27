import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  workers: process.env.CI ? 1 : undefined,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.TEST_URL || "http://localhost:3011",
    browserName: "chromium",
    channel: process.env.CI ? undefined : "chrome",
    headless: true,
    trace: "on-first-retry",
  },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  webServer: {
    command: "npm run start -- --port 3011",
    url: process.env.TEST_URL || "http://localhost:3011",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
