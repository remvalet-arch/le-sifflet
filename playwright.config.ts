import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir:    "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,      // évite les conflits sur les données de test partagées
  forbidOnly: !!process.env.CI,
  retries:    process.env.CI ? 1 : 0,
  reporter:   process.env.CI ? "github" : "list",
  timeout:    30_000,

  use: {
    baseURL:      BASE_URL,
    storageState: "./tests/e2e/.auth/user.json",
    trace:        "on-first-retry",
    screenshot:   "only-on-failure",
    video:        "retain-on-failure",
    locale:       "fr-FR",
  },

  projects: [
    {
      name:  "chromium",
      use:   { ...devices["Pixel 7"] }, // simulation mobile (PWA mobile-first)
    },
  ],

  webServer: {
    command:              "npm run dev",
    url:                  BASE_URL,
    reuseExistingServer:  !process.env.CI,
    timeout:              60_000,
  },
});
