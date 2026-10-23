// Order API calls.
// See local/openapi.yaml → Orders.

import type {
  CreateOrderRequest,
  Order,
  OrderListParams,
  OrderStatus,
  PaginatedOrders,
} from "../types";
import { apiDelete, apiGet, apiPost, apiPut } from "./client";

/**
 * List orders. Customers receive only their own; admins receive all and may
 * filter (e.g. by `user_id`, `status`). Paginated, newest first.
 */
export async function getOrders(
  params: OrderListParams = {}
): Promise<PaginatedOrders> {
  const data = await apiGet<PaginatedOrders>("/orders/", {
    auth: true,
    params: {
      user_id: params.user_id,
      status: params.status,
      min_amount: params.min_amount,
      max_amount: params.max_amount,
      start_date: params.start_date,
      end_date: params.end_date,
      product_id: params.product_id,
      page: params.page,
    },
  });
  return {
    orders: Array.isArray(data?.orders) ? data.orders : [],
    pagination: data.pagination,
  };
}

/** Get a single order by id (own order, or any for admin). */
export async function getOrder(id: number): Promise<Order> {
  const data = await apiGet<{ order: Order }>(`/orders/${id}`, { auth: true });
  return data.order;
}

/**
 * Place a new order (customer only). The server computes the total from
 * current prices, decrements stock, and creates it with status `pending`.
 */
export async function createOrder(input: CreateOrderRequest): Promise<Order> {
  const data = await apiPost<{ order: Order }>("/orders/", {
    auth: true,
    body: input,
  });
  return data.order;
}

/**
 * Update an order's status.
 * - Customer: cancel own `pending` order (`status: "cancelled"`).
 * - Admin: forward-only transitions.
 */
export async function updateOrderStatus(
  id: number,
  status: OrderStatus
): Promise<Order> {
  const data = await apiPut<{ order: Order }>(`/orders/${id}`, {
    auth: true,
    body: { status },
  });
  return data.order;
}

/**
 * Soft-delete an order (admin only). The backend blocks `processing`/
 * `delivering`; the UI further restricts this to `cancelled` orders.
 */
export async function deleteOrder(id: number): Promise<void> {
  await apiDelete(`/orders/${id}`, { auth: true });
}
