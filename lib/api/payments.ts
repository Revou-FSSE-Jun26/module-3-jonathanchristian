// Payment API calls (Midtrans-backed).
// See local/openapi.yaml → Payments.

import type { CreatePaymentResponse, Payment } from "../types";
import { apiGet, apiPost } from "./client";

/**
 * Create a Midtrans Snap payment for a `pending` order you own (customer only).
 * Returns a `snap_token` and `redirect_url` for completing payment.
 */
export function createPayment(orderId: number): Promise<CreatePaymentResponse> {
  return apiPost<CreatePaymentResponse>("/payments", {
    auth: true,
    body: { order_id: orderId },
  });
}

/** Get a single payment by id (own order's payment, or any for admin). */
export async function getPayment(id: number): Promise<Payment> {
  const data = await apiGet<{ payment: Payment }>(`/payments/${id}`, {
    auth: true,
  });
  return data.payment;
}

/** List all payment attempts for an order, newest first. */
export async function getOrderPayments(orderId: number): Promise<Payment[]> {
  const data = await apiGet<{ payments: Payment[] }>(
    `/orders/${orderId}/payments`,
    { auth: true }
  );
  return Array.isArray(data?.payments) ? data.payments : [];
}
