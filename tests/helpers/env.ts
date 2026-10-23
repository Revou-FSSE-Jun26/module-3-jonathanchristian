// Centralised access to the environment the E2E suite depends on.
// These are read from process.env (populated from .env by playwright.config.ts).

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Add it to .env (see .env.example).`
    );
  }
  return value;
}

/** Base URL of the real Flask API, trailing slash stripped. */
export function apiBaseUrl(): string {
  return required('NEXT_PUBLIC_API_BASE_URL').replace(/\/$/, '');
}

/** Admin credentials for the Playwright test database. */
export function adminCredentials(): { email: string; password: string } {
  return {
    email: required('PW_ADMIN_EMAIL'),
    password: required('PW_ADMIN_PASSWORD'),
  };
}

/** Payment mode: "stub" (default) or "real". */
export function paymentsMode(): 'stub' | 'real' {
  return process.env.PW_PAYMENTS_MODE === 'real' ? 'real' : 'stub';
}

/** The app URL Playwright drives. */
export function appBaseUrl(): string {
  return process.env.PW_BASE_URL ?? 'http://localhost:3000';
}
