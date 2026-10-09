// Shared domain types for RevoShop.
// These mirror the fields returned by the Flask API.

/** A product as returned by `GET /products` and `GET /products/{id}`. */
export interface Product {
  id: number;
  name: string;
  description: string;
  /** Price arrives as a decimal string, e.g. "320000.00". */
  price: string;
  stock: number;
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
