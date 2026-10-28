// Journey 4 — Admin orders: STATUS UPDATE ONLY.
// Admin may advance an order's status (forward-only); no create/edit-details/
// delete coverage here. Runs as ADMIN against the real backend.

import { test, expect, type APIRequestContext } from '@playwright/test';
import {
  createApiContext,
  loginAsAdmin,
  registerCustomer,
  login as apiLogin,
  ensureSeededProduct,
  createOrder,
  type Tokens,
} from './helpers/api';
import { seedAdminSession } from './helpers/auth';
import {
  newCustomerInput,
  uniqueProductName,
  uniqueCategoryName,
} from './helpers/data';
import type { Order } from '../lib/types';

let api: APIRequestContext;
// Customer orders are seeded through a dedicated context so its cookie jar
// (holding the customer's auth cookies) is never overwritten by the admin
// re-login that happens in beforeEach on `api`.
let customerApi: APIRequestContext;
let adminTokens: Tokens;
let customerTokens: Tokens;
let productId: number;

test.beforeAll(async () => {
  api = await createApiContext();
  adminTokens = await loginAsAdmin(api);

  // A product with plenty of stock to support several seeded orders.
  const product = await ensureSeededProduct(
    api,
    adminTokens.csrfToken,
    uniqueProductName('Order Product'),
    uniqueCategoryName('Order Cat'),
    { price: 100000, stock: 200 }
  );
  productId = product.id;

  const customer = newCustomerInput();
  await registerCustomer(api, customer);
  customerApi = await createApiContext();
  customerTokens = await apiLogin(customerApi, customer.email, customer.password);
});

test.afterAll(async () => {
  await api.dispose();
  await customerApi.dispose();
});

test.beforeEach(async ({ page }) => {
  await seedAdminSession(page, api);
});

/** Place a fresh pending order and return it. */
async function seedPendingOrder(): Promise<Order> {
  return createOrder(customerApi, customerTokens.csrfToken, [
    { product_id: productId, quantity: 1 },
  ]);
}

/**
 * Locate the dashboard row for a given order id by the status select's unique
 * accessible name ("Update status for order <id>"). This is exact and avoids
 * the ambiguity of substring-matching "#<id>" across many rows. For terminal
 * orders (no select), fall back to matching the row's "#<id>" cell button.
 */
function orderRow(page: import('@playwright/test').Page, orderId: number) {
  return page
    .getByRole('row')
    .filter({ has: page.getByRole('button', { name: `#${orderId}`, exact: true }) });
}

/** The status <select> within an order's row (present only when transitionable). */
function statusSelectFor(
  page: import('@playwright/test').Page,
  orderId: number
) {
  return page.getByRole('combobox', {
    name: `Update status for order ${orderId}`,
  });
}

test.describe('Admin order status updates', () => {
  test('advance a pending order to processing', async ({ page }) => {
    const order = await seedPendingOrder();

    await page.goto('/dashboard/orders');
    // The seeded order is newest, so it appears on the first page.
    const select = statusSelectFor(page, order.id);
    await expect(select).toBeVisible();

    await select.selectOption('processing');

    // Assert the durable badge (optimistic in-memory update), not the transient
    // toast — the badge persists and is the real state signal.
    await expect(orderRow(page, order.id)).toContainText('Processing');
  });

  test('advance through processing -> delivering -> completed (terminal)', async ({
    page,
  }) => {
    const order = await seedPendingOrder();

    await page.goto('/dashboard/orders');

    const select = statusSelectFor(page, order.id);
    await expect(select).toBeVisible();

    // Assert the durable badge after each step (toasts are transient and flaky
    // to chain). The select's options also shrink to the new valid transitions,
    // so re-selecting the same locator naturally targets the updated control.
    await select.selectOption('processing');
    await expect(orderRow(page, order.id)).toContainText('Processing');

    await select.selectOption('delivering');
    await expect(orderRow(page, order.id)).toContainText('Out for delivery');

    await select.selectOption('completed');
    await expect(orderRow(page, order.id)).toContainText('Completed');

    // Completed is terminal: the status select is no longer rendered.
    await expect(statusSelectFor(page, order.id)).toHaveCount(0);
  });

  test('cancelling a pending order exposes a delete action (presence only)', async ({
    page,
  }) => {
    const order = await seedPendingOrder();

    await page.goto('/dashboard/orders');
    const select = statusSelectFor(page, order.id);
    await expect(select).toBeVisible();

    await select.selectOption('cancelled');

    await expect(orderRow(page, order.id)).toContainText('Cancelled');
    // A Delete button now appears for the cancelled order (we assert presence
    // only; deleting orders is out of scope for this journey).
    await expect(
      orderRow(page, order.id).getByRole('button', { name: 'Delete' })
    ).toBeVisible();
  });
});
