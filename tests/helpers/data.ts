// Generators for unique test data. Because the suite runs against a real DB
// (with soft deletion), every run must use fresh names/emails to avoid
// colliding with rows left behind by previous runs.

let counter = 0;

/**
 * A suffix unique across parallel Playwright WORKERS (separate processes) and
 * repeated runs. Each worker is its own process, so a timestamp + per-process
 * counter is NOT enough (two workers can collide). We mix in the process id,
 * the worker index, and random entropy so generated emails/names never clash.
 */
export function uniqueSuffix(): string {
  counter += 1;
  const pid = typeof process !== 'undefined' ? process.pid : 0;
  const worker = process.env.TEST_WORKER_INDEX ?? '0';
  const rand = Math.random().toString(36).slice(2, 8);
  return `${Date.now().toString(36)}-${pid.toString(36)}-${worker}-${counter}-${rand}`;
}

/** A unique email such as `e2e-abc123-1@example.com`. */
export function uniqueEmail(prefix = 'e2e'): string {
  return `${prefix}-${uniqueSuffix()}@example.com`;
}

/** A unique human-ish name. */
export function uniqueName(prefix = 'E2E User'): string {
  return `${prefix} ${uniqueSuffix()}`;
}

/** A unique product name. */
export function uniqueProductName(prefix = 'E2E Product'): string {
  return `${prefix} ${uniqueSuffix()}`;
}

/** A unique category name. */
export function uniqueCategoryName(prefix = 'E2E Category'): string {
  return `${prefix} ${uniqueSuffix()}`;
}

/** A valid customer registration payload with unique identity fields. */
export function newCustomerInput(): {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
} {
  return {
    name: uniqueName(),
    email: uniqueEmail(),
    password: 'password123',
    phone: '+628123456789',
    address: '123 E2E Street, Test City',
  };
}
