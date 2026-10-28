import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Load environment variables from `.env` into process.env for the Playwright
 * runner (the config file runs outside Next.js, so Next's own .env loading does
 * not apply here). We use a tiny built-in parser to avoid adding a `dotenv`
 * dependency. Existing process.env values are never overwritten.
 *
 * Relevant vars (see .env.example / test-plan.md):
 *   NEXT_PUBLIC_API_BASE_URL  - the real Flask API base URL
 *   PW_ADMIN_EMAIL / PW_ADMIN_PASSWORD - a known admin account
 *   PW_PAYMENTS_MODE          - "stub" (default) or "real"
 *   PW_BASE_URL               - override the app URL (default http://localhost:3000)
 */
function loadEnvFile(file: string): void {
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf-8');
  } catch {
    return; // No .env file — rely on the real environment.
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Strip surrounding quotes if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.resolve(__dirname, '.env'));

// The dev server runs over HTTPS (`next dev --experimental-https`) because auth
// uses Secure cookies, so default the app URL to https.
const BASE_URL = process.env.PW_BASE_URL ?? 'https://localhost:3000';

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * These E2E tests run against the REAL Flask backend (NEXT_PUBLIC_API_BASE_URL)
 * plus the Next.js dev server on :3000. The only stubbed boundary is the
 * Midtrans redirect (see tests/helpers/payments.ts). Prerequisites and env vars
 * are documented in test-plan.md and .env.example.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/products')`. */
    baseURL: BASE_URL,

    /* The HTTPS dev server (and a locally-run HTTPS backend) use self-signed
     * certs, which the browser would otherwise reject. */
    ignoreHTTPSErrors: true,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  /* Start the Next.js dev server before the tests. The Flask API must be
   * started separately and reachable at NEXT_PUBLIC_API_BASE_URL. */
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    // The dev server uses a self-signed cert over HTTPS; don't fail readiness.
    ignoreHTTPSErrors: true,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
