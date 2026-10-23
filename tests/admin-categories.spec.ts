// Journey 3b — Admin CRUD: Categories (create, validation, edit, delete, 409).
// Runs as ADMIN. Against the real backend. Deletes trigger window.confirm.

import { test, expect, type APIRequestContext } from '@playwright/test';
import {
  createApiContext,
  loginAsAdmin,
  createCategory,
  createProduct,
  type Tokens,
} from './helpers/api';
import { seedAdminSession } from './helpers/auth';
import { uniqueCategoryName, uniqueProductName } from './helpers/data';

let api: APIRequestContext;
let adminTokens: Tokens;

test.beforeAll(async () => {
  api = await createApiContext();
  adminTokens = await loginAsAdmin(api);
});

test.afterAll(async () => {
  await api.dispose();
});

test.beforeEach(async ({ page }) => {
  await seedAdminSession(page, api);
  page.on('dialog', (dialog) => dialog.accept());
});

test.describe('Admin categories CRUD', () => {
  test('create a category via the dashboard form', async ({ page }) => {
    const name = uniqueCategoryName();
    await page.goto('/dashboard/categories');

    await page.getByRole('button', { name: 'New category' }).click();
    await page.locator('#create-category-name').fill(name);
    await page
      .locator('#create-category-description')
      .fill('Created by the E2E category CRUD test.');
    await page.getByRole('button', { name: 'Add category' }).click();

    await expect(page.getByText(`"${name}" created.`)).toBeVisible();
    await expect(
      page.getByRole('row').filter({ hasText: name })
    ).toBeVisible();
  });

  test('create validation blocks an empty form', async ({ page }) => {
    await page.goto('/dashboard/categories');
    await page.getByRole('button', { name: 'New category' }).click();
    await page.getByRole('button', { name: 'Add category' }).click();

    await expect(page.getByText('Name is required.')).toBeVisible();
  });

  test('edit a category inline', async ({ page }) => {
    const category = await createCategory(
      api,
      adminTokens.accessToken,
      uniqueCategoryName('Edit Cat')
    );
    const newName = uniqueCategoryName('Edited Cat');

    await page.goto('/dashboard/categories');
    const row = page.getByRole('row').filter({ hasText: category.name });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Edit' }).click();

    await page.locator(`#edit-cat-name-${category.id}`).fill(newName);
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText(`"${newName}" updated.`)).toBeVisible();
    await expect(
      page.getByRole('row').filter({ hasText: newName })
    ).toBeVisible();
  });

  test('delete an empty category (happy path)', async ({ page }) => {
    const category = await createCategory(
      api,
      adminTokens.accessToken,
      uniqueCategoryName('Delete Cat')
    );

    await page.goto('/dashboard/categories');
    const row = page.getByRole('row').filter({ hasText: category.name });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText(`"${category.name}" deleted.`)).toBeVisible();
    await expect(
      page.getByRole('row').filter({ hasText: category.name })
    ).toHaveCount(0);
  });

  test('delete is blocked with 409 when the category has a product', async ({
    page,
  }) => {
    const category = await createCategory(
      api,
      adminTokens.accessToken,
      uniqueCategoryName('Non-empty Cat')
    );
    // Add a product to the category so the backend returns 409 on delete.
    await createProduct(api, adminTokens.accessToken, {
      category_id: category.id,
      name: uniqueProductName('Blocks Delete'),
      price: 90000,
      stock: 3,
    });

    await page.goto('/dashboard/categories');
    const row = page.getByRole('row').filter({ hasText: category.name });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Delete' }).click();

    // Backend rejects with 409. The app shows a server-driven error toast and
    // keeps the row; the "deleted" success toast must never appear.
    await expect(
      page.getByText(`"${category.name}" deleted.`)
    ).toHaveCount(0);
    await expect(
      page.getByRole('row').filter({ hasText: category.name })
    ).toBeVisible();
  });
});
