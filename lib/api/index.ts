// Barrel for the KINETIC API layer.
//
// Import everything from `@/lib/api`. Each backend resource lives in its own
// module (auth, products, categories, orders, payments) with the shared HTTP
// client in `client.ts`.

export { ApiError, setTokenProvider } from "./client";
export type { TokenProvider } from "./client";

export * from "./auth";
export * from "./users";
export * from "./products";
export * from "./categories";
export * from "./orders";
export * from "./payments";
