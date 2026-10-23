// Journey 1 — Registration / Login / Logout.
// Drives the real UI against the real Flask backend. Uses unique emails so
// re-runs never collide with the backend's "email already in use" (409).

import { test, expect, type APIRequestContext } from '@playwright/test';
import { createApiContext } from './helpers/api';
import { adminCredentials } from './helpers/env';
import { newCustomerInput } from './helpers/data';
import {
  loginViaUi,
  expectSignedIn,
  expectSignedOut,
  AUTH_STORAGE_KEY,
} from './helpers/auth';

let api: APIRequestContext;

test.beforeAll(async () => {
  api = await createApiContext();
});

test.afterAll(async () => {
  await api.dispose();
});

test.describe('Registration / Login', () => {
  test('register happy path logs in and lands on home', async ({ page }) => {
    const customer = newCustomerInput();

    await page.goto('/register');
    await page.locator('#register-name').fill(customer.name);
    await page.locator('#register-email').fill(customer.email);
    await page.locator('#register-password').fill(customer.password);
    await page.locator('#register-phone').fill(customer.phone);
    await page.locator('#register-address').fill(customer.address);
    await page.getByRole('button', { name: 'Create account' }).click();

    // Backend POST /users/ then auto-login; the app replaces to "/".
    await expect(page).toHaveURL('/');
    await expect(page.getByText(`Hi, ${customer.name}`)).toBeVisible();
    await expectSignedIn(page);
  });

  test('register validation blocks submit with field errors', async ({
    page,
  }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Name is required.')).toBeVisible();
    await expect(page.getByText('Email is required.')).toBeVisible();
    await expect(page.getByText('Password is required.')).toBeVisible();
    await expect(page.getByText('Phone number is required.')).toBeVisible();
    await expect(page.getByText('Address is required.')).toBeVisible();

    // Stayed on the register page; no navigation happened.
    await expect(page).toHaveURL(/\/register$/);
  });

  test('register with an already-used email surfaces an error', async ({
    page,
  }) => {
    const customer = newCustomerInput();

    const fillAndSubmit = async () => {
      await page.goto('/register');
      await page.locator('#register-name').fill(customer.name);
      await page.locator('#register-email').fill(customer.email);
      await page.locator('#register-password').fill(customer.password);
      await page.locator('#register-phone').fill(customer.phone);
      await page.locator('#register-address').fill(customer.address);
      await page.getByRole('button', { name: 'Create account' }).click();
    };

    // First registration succeeds and signs in.
    await fillAndSubmit();
    await expect(page).toHaveURL('/');

    // Sign out so we can attempt the duplicate registration cleanly.
    await page.getByRole('button', { name: 'Logout' }).first().click();
    await expect(page).toHaveURL(/\/login$/);

    // Second registration with the same email hits the backend 409. Scope to
    // the form's error paragraph (role=alert) — Next.js also renders a hidden
    // route-announcer with role=alert, so we filter to the visible styled one.
    await fillAndSubmit();
    await expect(
      page.locator('p[role="alert"]').filter({ hasText: /\S/ })
    ).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });

  test('customer login lands on home', async ({ page }) => {
    // Seed a fresh customer via the API, then log in through the UI.
    const customer = newCustomerInput();
    const res = await api.post('/users/', { data: customer });
    expect(res.ok()).toBeTruthy();

    await loginViaUi(page, customer.email, customer.password);

    await expect(page).toHaveURL('/');
    await expectSignedIn(page);
  });

  test('admin login lands on the dashboard', async ({ page }) => {
    const { email, password } = adminCredentials();

    await loginViaUi(page, email, password);

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole('heading', { name: 'Admin Dashboard' })
    ).toBeVisible();
  });

  test('login failure shows an error and stays on /login', async ({ page }) => {
    await loginViaUi(page, 'nobody-e2e@example.com', 'wrong-password');

    // The form renders a styled <p role="alert"> with the message. (Next.js
    // also adds a hidden route-announcer with role=alert, so match the <p>.)
    await expect(page.locator('p[role="alert"]')).toContainText(
      'Invalid email or password'
    );
    await expect(page).toHaveURL(/\/login$/);
  });

  test('logout clears the session and returns to /login', async ({ page }) => {
    const { email, password } = adminCredentials();
    await loginViaUi(page, email, password);
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole('button', { name: 'Logout' }).first().click();

    await expect(page).toHaveURL(/\/login$/);
    await expectSignedOut(page);

    const stored = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      AUTH_STORAGE_KEY
    );
    expect(stored).toBeNull();
  });
});
