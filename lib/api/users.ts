// User self-service API calls.
// See openapi.yaml → Users.

import type { UpdateUserRequest, UpdateUserResponse, User } from "../types";
import { apiGet, apiPut } from "./client";

/**
 * Fetch the authenticated user's own profile. The backend resolves the user
 * from the JWT identity (read from the HttpOnly access cookie), so this always
 * returns the caller's own data — including the authoritative `role`.
 *
 * This is how the client learns its role now that the JWT is HttpOnly and can
 * no longer be decoded in the browser.
 */
export async function getCurrentUser(): Promise<User> {
  const data = await apiGet<{ user: User }>("/users/", { auth: true });
  return data.user;
}

/**
 * Update the authenticated user's own profile. The backend resolves the user
 * from the JWT identity, so a user can only update their own data.
 *
 * Only `name`, `password`, `phone`, and `address` may be sent, and only the
 * fields present in `payload` are changed — the rest are left untouched. Pass
 * just the fields the user actually edited.
 */
export async function updateCurrentUser(
  payload: UpdateUserRequest
): Promise<User> {
  const data = await apiPut<UpdateUserResponse>("/users/", {
    auth: true,
    body: payload,
  });
  return data.user;
}
