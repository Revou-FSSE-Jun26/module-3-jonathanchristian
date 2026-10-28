// User self-service API calls.
// See openapi.yaml → Users.

import type { User } from "../types";
import { apiGet } from "./client";

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
