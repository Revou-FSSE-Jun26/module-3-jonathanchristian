// Journey 2 — Full browsing: products list -> add to cart -> checkout.
// Runs as a CUSTOMER (buy controls and /cart,/checkout require that role).
// Against the real backend; only the Midtrans redirect is intercepted.

import { test, expect, type APIRequestContext } from '@playwright/test';
import {
  createApiContext,
  loginAsAdmin,
  registerCustomer,
  login as apiLogin,
  ensureSeededProduct,
  type Tokens,
} from './helpers/api';
import { seedCustomerSession } from './helpers/auth';
import { newCustomerInput, uniqueProductName, uniqueCategoryName } from './helpers/data';
import { interceptPayments, STUB_SNAP_HOST } from './helpers/payments';
import { paymentsMode } from './helpers/env';
import type { Product } from '../lib/types';

let api: APIRequestContext;
let customerTokens: Tokens;
let product: Product;

test.beforeAll(async () => {
  api = await createApiContext();

  // Seed a known in-stock product via the admin API so the catalogue is never
  // empty and we have a deterministic product to buy.
  const admin = await loginAsAdmin(api);
  product = await ensureSeededProduct(
    api,
    admin.accessToken,
    uniqueProductName('Browse Product'),
    uniqueCategoryName('Browse Cat'),
    { price: 150000, stock: 50 }
  );

  // Seed a customer account and grab real tokens for the session.
  const customer = newCustomerInput();
  await registerCustomer(api, customer);
  customerTokens = await apiLogin(api, customer.email, customer.password);
});

test.afterAll(async () => {
  await api.dispose();
});

test.beforeEach(async ({ page }) => {
  await seedCustomerSession(page, customerTokens);
});

test.describe('Browsing journey', () => {
  test('products list renders and search narrows results', async ({ page }) => {
    await page.goto('/products');

    // Wait for the hydrated list (result-count line is present once loaded).
    await expect(page.getByText(/Showing \d+.\d+ of \d+ products/)).toBeVisible();

    // Search for the seeded product by its unique name.
    const search = page.getByRole('searchbox', { name: 'Search products' });
    await search.fill(product.name);

    // The product's view link should appear; the URL reflects the query.
    await expect(
      page.getByRole('link', { name: `View ${product.name}` })
    ).toBeVisible();
    await expect(page).toHaveURL(/[?&]q=/);
  });

  test('add to cart from the product page updates the cart badge', async ({
    page,
  }) => {
    await page.goto(`/products/${product.id}`);

    // Post-hydration customer control.
    const addButton = page.getByRole('button', { name: 'Add to Cart' });
    await expect(addButton).toBeVisible();
    await addButton.click();

    await expect(page.getByText(`${product.name} added to cart.`)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Open cart, 1 items/ })
    ).toBeVisible();
  });

  test('full purchase: cart -> checkout -> payment redirect', async ({
    page,
  }) => {
    const payments = await interceptPayments(page);

    // Add the product from its detail page.
    await page.goto(`/products/${product.id}`);
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await expect(
      page.getByRole('button', { name: /Open cart, 1 items/ })
    ).toBeVisible();

    // Go to the cart and verify the line item.
    await page.goto('/cart');
    await expect(
      page.getByRole('heading', { name: 'Your Cart' })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: product.name }).first()
    ).toBeVisible();

    // Bump quantity and confirm the badge reflects 2 units.
    await page
      .getByRole('button', { name: `Increase ${product.name} quantity` })
      .click();
    await expect(
      page.getByRole('button', { name: /Open cart, 2 items/ })
    ).toBeVisible();

    // Proceed to checkout.
    await page.getByRole('button', { name: 'Proceed to checkout' }).click();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(
      page.getByRole('heading', { name: 'Checkout' })
    ).toBeVisible();
    await expect(page.getByText(/Total \(2 items\)/)).toBeVisible();

    // Pay. This fires a REAL POST /orders/, clears the cart, then creates a
    // payment (stubbed in stub mode) and attempts the Midtrans redirect, which
    // the interceptor captures instead of letting the browser leave the app.
    await page.getByRole('button', { name: /^Pay / }).click();

    // The cart is cleared server-side-confirmed order; assert local cart empty.
    await expect
      .poll(async () =>
        page.evaluate(() => window.localStorage.getItem('kinetic.cart'))
      )
      .toBeNull();

    // In stub mode we control the redirect URL, so we can assert on it.
    if (paymentsMode() === 'stub') {
      await expect
        .poll(() => payments.redirectUrl())
        .toContain(STUB_SNAP_HOST);
    } else {
      // In real mode, just assert a redirect toward a Midtrans domain was made.
      await expect.poll(() => payments.redirectUrl()).not.toBeNull();
    }
  });

  test('payment failure falls back to the order page (stub mode)', async ({
    page,
  }) => {
    test.skip(
      paymentsMode() !== 'stub',
      'Forced payment failure is only deterministic in stub mode.'
    );

    const payments = await interceptPayments(page, { forcePaymentError: true });

    await page.goto(`/products/${product.id}`);
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await page.goto('/checkout');
    await page.getByRole('button', { name: /^Pay / }).click();

    // Order was created for real, but payment creation failed -> the app sends
    // the user to the order detail page to retry payment from there.
    await expect(page).toHaveURL(/\/orders\/\d+$/);
    // The interceptor never saw a Snap redirect because payment creation failed.
    expect(payments.redirectUrl()).toBeNull();
  });
});
