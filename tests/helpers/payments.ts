// Payment-flow interception for checkout tests.
//
// The app's checkout (app/checkout/page.tsx):
//   1. POST /orders/            -> creates the order (real backend)
//   2. clearCart()
//   3. POST /payments           -> backend mints a Midtrans Snap tx, returns redirect_url
//   4. window.location.href = redirect_url  -> navigates to Midtrans (external)
//
// We must NEVER let the browser reach the real Midtrans site. This helper:
//   - In "stub" mode: intercepts POST /payments and returns a canned 201 with a
//     redirect_url we control (the backend's Midtrans creds aren't set up yet).
//   - In both modes: intercepts the navigation to the redirect_url and fulfils
//     it with a tiny stub page, capturing the URL the app tried to visit.

import type { Page, Route } from '@playwright/test';
import { paymentsMode } from './env';

/** A sentinel host we route the Snap redirect to, so it never hits Midtrans. */
export const STUB_SNAP_HOST = 'e2e-midtrans-stub.local';
export const STUB_REDIRECT_URL = `https://${STUB_SNAP_HOST}/snap/v2/vtweb/e2e-token`;

export interface PaymentInterception {
  /** Resolves with the redirect URL the app attempted to navigate to. */
  redirectUrl: () => string | null;
}

/**
 * Install payment interception for a checkout test.
 *
 * @param page       the page under test
 * @param options.forcePaymentError  (stub mode only) make POST /payments fail
 *                   so the app takes its payment-failure fallback branch.
 */
export async function interceptPayments(
  page: Page,
  options: { forcePaymentError?: boolean } = {}
): Promise<PaymentInterception> {
  const mode = paymentsMode();
  let capturedRedirect: string | null = null;

  // (A) Stub the backend's POST /payments in stub mode.
  if (mode === 'stub') {
    await page.route('**/payments', async (route: Route) => {
      if (route.request().method() !== 'POST') return route.fallback();

      if (options.forcePaymentError) {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'error',
            message: 'E2E forced payment failure.',
          }),
        });
      }

      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Payment created',
          payment: {
            id: 999999,
            order_id: 0,
            amount: 0,
            status: 'pending',
          },
          snap_token: 'e2e-snap-token',
          redirect_url: STUB_REDIRECT_URL,
          status: 'ok',
        }),
      });
    });
  }

  // (B) Catch the outbound navigation to the Snap page (both modes). We match
  // the stub host and the real Midtrans Snap domains and fulfil with a blank
  // page so the browser stays put. The URL is captured for assertions.
  const snapPatterns = [
    `**://${STUB_SNAP_HOST}/**`,
    '**://app.sandbox.midtrans.com/**',
    '**://app.midtrans.com/**',
  ];
  for (const pattern of snapPatterns) {
    await page.route(pattern, async (route: Route) => {
      capturedRedirect = route.request().url();
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><title>E2E payment stub</title><h1>Payment stub</h1>',
      });
    });
  }

  return {
    redirectUrl: () => capturedRedirect,
  };
}
