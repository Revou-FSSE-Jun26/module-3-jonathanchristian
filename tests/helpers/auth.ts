// Auth helpers for E2E: drive the real login UI, or seed a signed-in session
// directly where login isn't the thing under test.
//
// Auth now lives in HttpOnly JWT cookies (plus readable CSRF cookies) set by
// the backend, and a UI-only { name, role } snapshot the app keeps in
// localStorage. So seeding a signed-in browser means two things:
//   1. put the backend's auth cookies into the browser context's cookie jar,
//      so credentialed API calls from the app succeed; and
//   2. seed the { name, role } snapshot so the header/guards render signed-in
//      immediately (the app otherwise only writes it after a login round-trip).

import { expect, type Page } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import type { AuthSession, Role } from '../../lib/types';
import { adminCredentials, appBaseUrl } from './env';
import { login as apiLogin } from './api';

/** The localStorage key the auth context persists the snapshot under. */
export const AUTH_STORAGE_KEY = 'kinetic.auth';

/** Cookie names the backend sets on login. */
const AUTH_COOKIE_NAMES = [
  'access_token_cookie',
  'refresh_token_cookie',
  'csrf_access_token',
  'csrf_refresh_token',
];

/** The readable role-hint cookie the app sets and the server proxy reads. */
const HINT_COOKIE = 'kinetic.auth_hint';

/**
 * Copy the backend auth cookies from a logged-in API context into the browser
 * context, and seed the { name, role } snapshot into localStorage before the
 * app loads. After this the browser is fully authenticated: the app's
 * credentialed fetches send the cookies, and the UI renders signed-in.
 */
async function seedSession(
  page: Page,
  api: APIRequestContext,
  name: string,
  role: Role
): Promise<void> {
  // 1. Transfer auth cookies from the API context's jar to the browser.
  const state = await api.storageState();
  const authCookies = state.cookies.filter((c) =>
    AUTH_COOKIE_NAMES.includes(c.name)
  );
  if (authCookies.length === 0) {
    throw new Error('No auth cookies found on the API context; login first.');
  }
  await page.context().addCookies(authCookies);

  // 2. Set the readable role-hint cookie on the APP origin so the server-side
  //    proxy guard lets the seeded session through (the backend auth cookies
  //    above live on the backend origin and the proxy can't see them).
  await page.context().addCookies([
    {
      name: HINT_COOKIE,
      value: role,
      url: appBaseUrl(),
      sameSite: 'Lax',
    },
  ]);

  // 3. Seed the UI snapshot so the header/guards start signed-in.
  const session: AuthSession = { name, role };
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [AUTH_STORAGE_KEY, JSON.stringify(session)] as const
  );
}

/** Seed an admin session (logs in via the API first to establish cookies). */
export async function seedAdminSession(
  page: Page,
  api: APIRequestContext
): Promise<void> {
  const { email, password } = adminCredentials();
  const tokens = await apiLogin(api, email, password);
  await seedSession(page, api, tokens.name, 'admin');
}

/**
 * Seed a customer session. Needs a logged-in API context (its cookie jar
 * supplies the auth cookies) plus the display name to show in the UI.
 */
export async function seedCustomerSession(
  page: Page,
  api: APIRequestContext,
  name: string
): Promise<void> {
  await seedSession(page, api, name, 'customer');
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
