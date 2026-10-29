// Shared domain types for KINETIC.
// These mirror the fields returned by the Flask API (see local/openapi.yaml).

/** User roles carried in the JWT `role` claim. */
export type Role = "customer" | "admin";

/** A product image as returned nested under a product (Cloudinary-backed). */
export interface ProductImage {
  id: number;
  product_id: number;
  url: string;
  public_id?: string | null;
  created_at?: string | null;
}

/** A product as returned by `GET /products` and `GET /products/{id}`. */
export interface Product {
  id: number;
  name: string;
  description: string;
  /** Price arrives as a decimal string, e.g. "320000.00". */
  price: string;
  stock: number;
  /** Category the product belongs to (returned by the products endpoints). */
  category_id?: number;
  /** Human-readable category name (returned alongside `category_id`). */
  category_name?: string;
  /** Optional nested images (Cloudinary). */
  images?: ProductImage[];
  created_at?: string;
}

/** A category as returned by `GET /categories`. */
export interface Category {
  id: number;
  name: string;
  description: string;
}

/** A single category with its products, as returned by `GET /categories/{id}`. */
export interface CategoryWithProducts extends Category {
  products: Product[];
}

/** A line item in the local (frontend-only) cart. */
export interface CartItem {
  product: Product;
  quantity: number;
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/** Pagination metadata returned by list endpoints (products, orders). */
export interface Pagination {
  page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

/** The paginated shape of `GET /products`. */
export interface PaginatedProducts {
  products: Product[];
  pagination: Pagination;
}

// ---------------------------------------------------------------------------
// Users & auth
// ---------------------------------------------------------------------------

/** Public representation of a user (never includes the password). */
export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  /** Shipping/contact address. Returned by `GET /users/` and updatable via PUT. */
  address?: string;
  role: Role;
  created_at?: string | null;
}

/**
 * Request body for `PUT /users/` (self-service profile update).
 *
 * All fields are optional; only the fields present are changed. The backend
 * rejects any other field (e.g. `email`, `role`). When `password` is provided
 * it must be at least 8 characters. Every provided field must be a non-empty,
 * non-whitespace string.
 */
export interface UpdateUserRequest {
  name?: string;
  password?: string;
  phone?: string;
  address?: string;
}

/** Response body from `PUT /users/`. */
export interface UpdateUserResponse {
  message: string;
  user: User;
  status: string;
}

/** Credentials for `POST /auth/login`. */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Response body from `POST /auth/login`. The JWT tokens are NOT in the body —
 * they are set as HttpOnly cookies. The body only carries the display name and
 * the access token lifetime. The role must be fetched via `GET /users/`.
 */
export interface LoginResponse {
  message: string;
  name: string;
  expires_in: number;
  status: string;
}

/** Request body for `POST /users/` (registration). */
export interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  address: string;
}

/** Response body from `POST /users/`. */
export interface RegisterResponse {
  message: string;
  user: User;
  status: string;
}

/**
 * The authenticated session snapshot we persist in localStorage.
 *
 * This no longer contains tokens — the JWT lives in HttpOnly cookies the client
 * can't read. We persist only the display name and role so the UI (header,
 * route guards) can render a signed-in state across refreshes and tabs without
 * a round-trip. The cookies remain the real source of auth; this snapshot is
 * UI-only and is cleared on logout or auth failure.
 */
export interface AuthSession {
  name: string;
  role: Role;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export type OrderStatus =
  | "pending"
  | "processing"
  | "delivering"
  | "completed"
  | "cancelled";

/** A line item within an order (price captured at order time). */
export interface OrderItem {
  product_id: number;
  quantity: number;
  unit_price: number;
}

/** An order as returned by the orders endpoints. */
export interface Order {
  id: number;
  user_id: number;
  total_amount: number;
  status: OrderStatus;
  order_items: OrderItem[];
  created_at?: string | null;
}

/** A single order item in a `POST /orders/` request. */
export interface OrderItemInput {
  product_id: number;
  quantity: number;
}

/** Request body for `POST /orders/`. */
export interface CreateOrderRequest {
  order_items: OrderItemInput[];
}

/** The paginated shape of `GET /orders/`. */
export interface PaginatedOrders {
  orders: Order[];
  pagination: Pagination;
}

/** Filters accepted by `GET /orders/` (admin has access to more). */
export interface OrderListParams {
  user_id?: number;
  status?: OrderStatus;
  min_amount?: number;
  max_amount?: number;
  start_date?: string;
  end_date?: string;
  product_id?: number;
  page?: number;
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

/** A payment attempt as returned by the payments endpoints. */
export interface Payment {
  id: number;
  order_id: number;
  amount: number;
  method?: string | null;
  status: string;
  transaction_id?: string | null;
  midtrans_order_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Response body from `POST /payments`. */
export interface CreatePaymentResponse {
  message: string;
  payment: Payment;
  snap_token: string;
  redirect_url: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Admin CRUD inputs
// ---------------------------------------------------------------------------

/** Request body for `POST /products/`. */
export interface CreateProductRequest {
  category_id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
}

/** Request body for `PUT /products/{id}` (all fields optional). */
export type UpdateProductRequest = Partial<CreateProductRequest>;

/** Request body for `POST /categories/`. */
export interface CreateCategoryRequest {
  name: string;
  description?: string;
}

/** Request body for `PUT /categories/{id}` (all fields optional). */
export type UpdateCategoryRequest = Partial<CreateCategoryRequest>;
