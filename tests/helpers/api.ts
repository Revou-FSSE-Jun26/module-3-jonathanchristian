// A thin, direct-to-Flask HTTP client used by tests for SETUP/SEEDING only.
//
// The user-facing journeys are driven through the real UI; this client exists
// so a test can quickly establish preconditions (log in to grab tokens, create
// a product/category, place a real order to trigger a 409, advance a status)
// without clicking through unrelated screens. It talks to the same real backend
// the app uses.

import { request, type APIRequestContext } from '@playwright/test';
import { apiBaseUrl, adminCredentials } from './env';
import type {
  Category,
  Order,
  Product,
  OrderStatus,
} from '../../lib/types';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  name: string;
}

/** A standalone request context pointed at the Flask API. Caller disposes it. */
export async function createApiContext(): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: apiBaseUrl(),
    extraHTTPHeaders: { Accept: 'application/json' },
  });
}

async function expectOk(
  res: Awaited<ReturnType<APIRequestContext['post']>>,
  action: string
): Promise<unknown> {
  if (!res.ok()) {
    const body = await res.text();
    throw new Error(
      `${action} failed (${res.status()} ${res.statusText()}): ${body}`
    );
  }
  return res.json();
}

/** Log in against the real API and return tokens + display name. */
export async function login(
  api: APIRequestContext,
  email: string,
  password: string
): Promise<Tokens> {
  const res = await api.post('/auth/login', { data: { email, password } });
  const body = (await expectOk(res, `login (${email})`)) as {
    access_token: string;
    refresh_token: string;
    name: string;
  };
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    name: body.name,
  };
}

/** Log in as the configured admin. */
export function loginAsAdmin(api: APIRequestContext): Promise<Tokens> {
  const { email, password } = adminCredentials();
  return login(api, email, password);
}

/** Register a new customer via the real API, returning the created email/password. */
export async function registerCustomer(
  api: APIRequestContext,
  input: {
    name: string;
    email: string;
    password: string;
    phone: string;
    address: string;
  }
): Promise<void> {
  const res = await api.post('/users/', { data: input });
  await expectOk(res, `register (${input.email})`);
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/** Create a category (admin). */
export async function createCategory(
  api: APIRequestContext,
  token: string,
  name: string,
  description = 'E2E seeded category'
): Promise<Category> {
  const res = await api.post('/categories/', {
    headers: authHeaders(token),
    data: { name, description },
  });
  const body = (await expectOk(res, `create category (${name})`)) as {
    category: Category;
  };
  return body.category;
}

/** Create a product (admin). */
export async function createProduct(
  api: APIRequestContext,
  token: string,
  input: {
    category_id: number;
    name: string;
    description?: string;
    price: number;
    stock: number;
  }
): Promise<Product> {
  const res = await api.post('/products/', {
    headers: authHeaders(token),
    data: {
      description: 'E2E seeded product',
      ...input,
    },
  });
  const body = (await expectOk(res, `create product (${input.name})`)) as {
    product: Product;
  };
  return body.product;
}

/** Place an order as a customer (returns the created order). */
export async function createOrder(
  api: APIRequestContext,
  token: string,
  items: { product_id: number; quantity: number }[]
): Promise<Order> {
  const res = await api.post('/orders/', {
    headers: authHeaders(token),
    data: { order_items: items },
  });
  const body = (await expectOk(res, 'create order')) as { order: Order };
  return body.order;
}

/** Update an order's status (admin or customer-cancel). */
export async function updateOrderStatus(
  api: APIRequestContext,
  token: string,
  orderId: number,
  status: OrderStatus
): Promise<Order> {
  const res = await api.put(`/orders/${orderId}`, {
    headers: authHeaders(token),
    data: { status },
  });
  const body = (await expectOk(res, `update order ${orderId}`)) as {
    order: Order;
  };
  return body.order;
}

/**
 * Ensure at least one in-stock product exists, creating a category + product if
 * needed. Returns a product guaranteed to have stock. Admin token required.
 */
export async function ensureSeededProduct(
  api: APIRequestContext,
  adminToken: string,
  name: string,
  categoryName: string,
  opts: { price?: number; stock?: number } = {}
): Promise<Product> {
  const category = await createCategory(api, adminToken, categoryName);
  return createProduct(api, adminToken, {
    category_id: category.id,
    name,
    price: opts.price ?? 150000,
    stock: opts.stock ?? 50,
  });
}
