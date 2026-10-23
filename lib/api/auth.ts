// Authentication & registration API calls.
// See local/openapi.yaml → Auth, Users.

import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from "../types";
import { apiPost } from "./client";

/** Log in and obtain JWT tokens. The role is a claim inside the access token. */
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
 * Exchange a refresh token for a new access token. The refresh token is sent
 * as the bearer. (The client's transparent 401-retry handles this internally;
 * this is exposed for completeness / explicit refresh if ever needed.)
 */
export function refresh(refreshToken: string): Promise<{ access_token: string }> {
  return apiPost<{ access_token: string }>("/auth/refresh", {
    bearerOverride: refreshToken,
  });
}
