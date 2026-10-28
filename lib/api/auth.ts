// Authentication & registration API calls.
// See openapi.yaml → Auth, Users.

import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from "../types";
import { apiPost } from "./client";

/**
 * Log in. On success the backend sets the JWT access/refresh tokens and the
 * CSRF tokens as cookies via Set-Cookie; the response body only carries the
 * display name and token lifetime. The caller must look up the user's role
 * separately (see `getCurrentUser`) since the JWT is HttpOnly and unreadable.
 */
export function login(credentials: LoginRequest): Promise<LoginResponse> {
  return apiPost<LoginResponse>("/auth/login", { body: credentials });
}

/**
 * Register a new user. The backend always assigns the `customer` role.
 * Note the trailing slash on `/users/` per the backend contract.
 */
export function register(input: RegisterRequest): Promise<RegisterResponse> {
  return apiPost<RegisterResponse>("/users/", { body: input });
}

/**
 * Exchange the refresh cookie for a new access cookie. The refresh token is
 * sent automatically as an HttpOnly cookie; the request carries the refresh
 * CSRF token in the X-CSRF-TOKEN header. The new access token is returned as
 * an updated cookie, not in the body. (The client's transparent 401-retry
 * handles this internally; exposed here for completeness.)
 */
export function refresh(): Promise<{ expires_in: number; status: string }> {
  return apiPost<{ expires_in: number; status: string }>("/auth/refresh", {
    auth: true,
    useRefreshCsrf: true,
  });
}

/**
 * Log out. Clears the JWT and CSRF cookies server-side (the client cannot
 * delete HttpOnly cookies itself). Requires no token.
 */
export function logout(): Promise<{ message: string; status: string }> {
  return apiPost<{ message: string; status: string }>("/auth/logout");
}
