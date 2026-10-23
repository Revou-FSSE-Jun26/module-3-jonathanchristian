// Shared domain types for RevoShop.
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
  /** Optional category link (present on some responses / after create). */
  category_id?: number;
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
  role: Role;
  created_at?: string | null;
}

/** Credentials for `POST /auth/login`. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Response body from `POST /auth/login`. Role lives inside the access token. */
export interface LoginResponse {
  message: string;
  name: string;
  access_token: string;
  refresh_token: string;
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

/** The authenticated session we persist in localStorage. */
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
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
