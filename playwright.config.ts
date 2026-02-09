import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env") });

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    // USE 'setup' ONLY FOR TESTS WITH SHARED AUTHENTICATION
    //{ name: "setup", testMatch: "auth.setup.ts" },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        //  storageState: ".auth/authorizedUser.json", // USE ONLY FOR TESTS WITH SHARED AUTHENTICATION
      },
      //dependencies: ["setup"], // USE ONLY FOR TESTS WITH SHARED AUTHENTICATION
    },
    {
      name: "article-setup",
      use: { ...devices["Desktop Firefox"] },
      testMatch: "new-article.setup.ts",
      teardown: "delete-article",
    },
    {
      name: "delete-article",
      use: { ...devices["Desktop Firefox"], storageState: ".auth/user.json" },
      testMatch: "delete-article.setup.ts",
    },
    {
      name: "like-counter",
      testMatch: "likes-counter.spec.ts",
      use: { ...devices["Desktop Firefox"], storageState: ".auth/user.json" },
      dependencies: ["article-setup"],
    },
  ],
});
