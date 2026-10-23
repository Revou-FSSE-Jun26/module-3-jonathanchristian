// Auth helpers for E2E: drive the real login UI, or seed a signed-in session
// directly into localStorage to skip login where it isn't the thing under test.

import { expect, type Page } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import type { AuthSession, Role } from '../../lib/types';
import { adminCredentials } from './env';
import { login as apiLogin, type Tokens } from './api';

/** The localStorage key the auth context persists the session under. */
export const AUTH_STORAGE_KEY = 'revoshop.auth';

/**
 * Seed a signed-in session into localStorage BEFORE the app loads, so pages
 * that require auth (customer: /cart,/checkout; admin: /dashboard/*) start
 * authenticated. Uses addInitScript so it applies to every navigation in the
 * context. Tokens are real (obtained from the backend), so API calls succeed.
 */
export async function seedSession(
  page: Page,
  tokens: Tokens,
  role: Role
): Promise<void> {
  const session: AuthSession = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    name: tokens.name,
    role,
  };
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [AUTH_STORAGE_KEY, JSON.stringify(session)] as const
  );
}

/** Seed an admin session (logs in via the API first to get real tokens). */
export async function seedAdminSession(
  page: Page,
  api: APIRequestContext
): Promise<Tokens> {
  const { email, password } = adminCredentials();
  const tokens = await apiLogin(api, email, password);
  await seedSession(page, tokens, 'admin');
  return tokens;
}

/** Seed a customer session from already-obtained tokens. */
export async function seedCustomerSession(
  page: Page,
  tokens: Tokens
): Promise<void> {
  await seedSession(page, tokens, 'customer');
}

/** Drive the real /login UI and wait for the post-login redirect. */
export async function loginViaUi(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
}

/** Assert the header reflects a signed-in session (post-hydration). */
export async function expectSignedIn(page: Page): Promise<void> {
  await expect(
    page.getByRole('button', { name: 'Logout' }).first()
  ).toBeVisible();
}

/** Assert the header reflects a signed-out session (post-hydration). */
export async function expectSignedOut(page: Page): Promise<void> {
  await expect(page.getByRole('link', { name: 'Login' }).first()).toBeVisible();
}
