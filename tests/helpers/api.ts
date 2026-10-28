// A thin, direct-to-Flask HTTP client used by tests for SETUP/SEEDING only.
//
// The user-facing journeys are driven through the real UI; this client exists
// so a test can quickly establish preconditions (log in to grab a session,
// create a product/category, place a real order to trigger a 409, advance a
// status) without clicking through unrelated screens. It talks to the same real
// backend the app uses.
//
// Auth is cookie-based: the backend sets HttpOnly JWT cookies plus readable
// CSRF cookies on login. Playwright's APIRequestContext keeps its own cookie
// jar, so once a context has logged in it automatically sends the auth cookies
// on subsequent requests. For state-changing requests we must also echo the
// `csrf_access_token` cookie in the `X-CSRF-TOKEN` header — hence `login`
// returns the CSRF token and the seeding helpers forward it.

import { request, type APIRequestContext } from '@playwright/test';
import { apiBaseUrl, adminCredentials } from './env';
import type {
  Category,
  Order,
  Product,
  OrderStatus,
} from '../../lib/types';

/**
 * A logged-in session for the seeding client. The auth tokens live in the
 * context's cookie jar (HttpOnly); we only surface the display name and the
 * CSRF token the caller must echo on POST/PUT/DELETE.
 */
export interface Tokens {
  /** csrf_access_token value, echoed in X-CSRF-TOKEN on state-changing calls. */
  csrfToken: string;
  /** csrf_refresh_token value (for /auth/refresh). */
  csrfRefreshToken: string;
  /** Display name returned by login. */
  name: string;
}

/** A standalone request context pointed at the Flask API. Caller disposes it. */
export async function createApiContext(): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: apiBaseUrl(),
    extraHTTPHeaders: { Accept: 'application/json' },
    // The locally-run HTTPS backend uses a self-signed cert.
    ignoreHTTPSErrors: true,
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

/** Read a cookie value from the context's current storage state. */
async function cookieValue(
  api: APIRequestContext,
  name: string
): Promise<string> {
  const state = await api.storageState();
  const cookie = state.cookies.find((c) => c.name === name);
  if (!cookie) {
    throw new Error(`Expected cookie "${name}" was not set by the backend.`);
  }
  return cookie.value;
}

/** Log in against the real API. Cookies are stored in the context's jar. */
export async function login(
  api: APIRequestContext,
  email: string,
  password: string
): Promise<Tokens> {
  const res = await api.post('/auth/login', { data: { email, password } });
  const body = (await expectOk(res, `login (${email})`)) as { name: string };
  return {
    csrfToken: await cookieValue(api, 'csrf_access_token'),
    csrfRefreshToken: await cookieValue(api, 'csrf_refresh_token'),
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

/** Headers for a state-changing request: echo the CSRF token. */
function csrfHeaders(csrfToken: string): Record<string, string> {
  return { 'X-CSRF-TOKEN': csrfToken };
}

/** Create a category (admin). */
export async function createCategory(
  api: APIRequestContext,
  csrfToken: string,
  name: string,
  description = 'E2E seeded category'
): Promise<Category> {
  const res = await api.post('/categories/', {
    headers: csrfHeaders(csrfToken),
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
  csrfToken: string,
  input: {
    category_id: number;
    name: string;
    description?: string;
    price: number;
    stock: number;
  }
): Promise<Product> {
  const res = await api.post('/products/', {
    headers: csrfHeaders(csrfToken),
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
  csrfToken: string,
  items: { product_id: number; quantity: number }[]
): Promise<Order> {
  const res = await api.post('/orders/', {
    headers: csrfHeaders(csrfToken),
    data: { order_items: items },
  });
  const body = (await expectOk(res, 'create order')) as { order: Order };
  return body.order;
}

/** Update an order's status (admin or customer-cancel). */
export async function updateOrderStatus(
  api: APIRequestContext,
  csrfToken: string,
  orderId: number,
  status: OrderStatus
): Promise<Order> {
  const res = await api.put(`/orders/${orderId}`, {
    headers: csrfHeaders(csrfToken),
    data: { status },
  });
  const body = (await expectOk(res, `update order ${orderId}`)) as {
    order: Order;
  };
  return body.order;
}

/**
 * Ensure at least one in-stock product exists, creating a category + product if
 * needed. Returns a product guaranteed to have stock. Admin CSRF token required.
 */
export async function ensureSeededProduct(
  api: APIRequestContext,
  csrfToken: string,
  name: string,
  categoryName: string,
  opts: { price?: number; stock?: number } = {}
): Promise<Product> {
  const category = await createCategory(api, csrfToken, categoryName);
  return createProduct(api, csrfToken, {
    category_id: category.id,
    name,
    price: opts.price ?? 150000,
    stock: opts.stock ?? 50,
  });
}
