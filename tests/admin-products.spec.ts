// Journey 3a — Admin CRUD: Products (create, validation, edit, delete, 409).
// Runs as ADMIN (the whole /dashboard tree requires requireRole="admin").
// Against the real backend. Deletes trigger window.confirm -> auto-accepted.

import { test, expect, type APIRequestContext } from '@playwright/test';
import {
  createApiContext,
  loginAsAdmin,
  registerCustomer,
  login as apiLogin,
  createCategory,
  createProduct,
  createOrder,
  type Tokens,
} from './helpers/api';
import { seedAdminSession } from './helpers/auth';
import {
  newCustomerInput,
  uniqueProductName,
  uniqueCategoryName,
} from './helpers/data';
import type { Category } from '../lib/types';

let api: APIRequestContext;
let adminTokens: Tokens;
let category: Category;

test.beforeAll(async () => {
  api = await createApiContext();
  adminTokens = await loginAsAdmin(api);
  // A category products can be filed under.
  category = await createCategory(
    api,
    adminTokens.csrfToken,
    uniqueCategoryName('Prod Admin Cat')
  );
});

test.afterAll(async () => {
  await api.dispose();
});

test.beforeEach(async ({ page }) => {
  await seedAdminSession(page, api);
  // Accept all window.confirm dialogs (used by delete).
  page.on('dialog', (dialog) => dialog.accept());
});

test.describe('Admin products CRUD', () => {
  test('create a product via the dashboard form', async ({ page }) => {
    const name = uniqueProductName();
    await page.goto('/dashboard');

    await page.getByRole('button', { name: 'New product' }).click();
    await page
      .locator('#create-product-category')
      .selectOption({ label: category.name });
    await page.locator('#create-product-name').fill(name);
    await page.locator('#create-product-price').fill('199000');
    await page.locator('#create-product-stock').fill('25');
    await page
      .locator('#create-product-description')
      .fill('Created by the E2E product CRUD test.');
    await page.getByRole('button', { name: 'Add product' }).click();

    await expect(page.getByText(`"${name}" created.`)).toBeVisible();
    // New row appears in the table.
    await expect(
      page.getByRole('cell', { name, exact: false }).first()
    ).toBeVisible();
  });

  test('create validation blocks an empty form', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'New product' }).click();
    await page.getByRole('button', { name: 'Add product' }).click();

    // Empty submit surfaces the "required/select" branch of validation.
    await expect(page.getByText('Select a category.')).toBeVisible();
    await expect(page.getByText('Name is required.')).toBeVisible();
    await expect(page.getByText('Description is required.')).toBeVisible();
    await expect(page.getByText('Price is required.')).toBeVisible();
    await expect(page.getByText('Stock is required.')).toBeVisible();
  });

  test('edit a product inline', async ({ page }) => {
    // Seed a product via API so the row is guaranteed present.
    const product = await createProduct(api, adminTokens.csrfToken, {
      category_id: category.id,
      name: uniqueProductName('Edit Me'),
      price: 100000,
      stock: 10,
    });
    const newName = uniqueProductName('Edited');

    await page.goto('/dashboard');

    const row = page.getByRole('row').filter({ hasText: product.name });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Edit' }).click();

    // Per-row edit field ids use the product id.
    await page.locator(`#edit-name-${product.id}`).fill(newName);
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText(`"${newName}" updated.`)).toBeVisible();
    await expect(
      page.getByRole('row').filter({ hasText: newName })
    ).toBeVisible();
  });

  test('delete a product (happy path)', async ({ page }) => {
    const product = await createProduct(api, adminTokens.csrfToken, {
      category_id: category.id,
      name: uniqueProductName('Delete Me'),
      price: 120000,
      stock: 5,
    });

    await page.goto('/dashboard');
    const row = page.getByRole('row').filter({ hasText: product.name });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText(`"${product.name}" deleted.`)).toBeVisible();
    await expect(
      page.getByRole('row').filter({ hasText: product.name })
    ).toHaveCount(0);
  });

  test('delete is blocked with 409 when the product has an order', async ({
    page,
  }) => {
    // Create a product, then place a REAL customer order referencing it so the
    // backend returns 409 on delete.
    const product = await createProduct(api, adminTokens.csrfToken, {
      category_id: category.id,
      name: uniqueProductName('Ordered'),
      price: 130000,
      stock: 10,
    });

    // Place the order through a dedicated customer context so the admin `api`
    // cookie jar is left intact.
    const customer = newCustomerInput();
    await registerCustomer(api, customer);
    const customerApi = await createApiContext();
    const customerTokens = await apiLogin(
      customerApi,
      customer.email,
      customer.password
    );
    await createOrder(customerApi, customerTokens.csrfToken, [
      { product_id: product.id, quantity: 1 },
    ]);
    await customerApi.dispose();

    await page.goto('/dashboard');
    const row = page.getByRole('row').filter({ hasText: product.name });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Delete' }).click();

    // The backend rejects the delete with 409. The app surfaces an error toast
    // (text comes from the server, so we don't assert exact wording) and MUST
    // keep the row. The behavioural guarantee is that the row survives and the
    // "deleted" success toast never appears.
    await expect(
      page.getByText(`"${product.name}" deleted.`)
    ).toHaveCount(0);
    await expect(
      page.getByRole('row').filter({ hasText: product.name })
    ).toBeVisible();
  });
});
