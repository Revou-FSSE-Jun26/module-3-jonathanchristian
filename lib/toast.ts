// Shared toast helpers so success/error notifications look consistent across
// the app. Thin wrapper over react-hot-toast plus a helper for turning an
// ApiError (or any thrown value) into a readable message.

import toast from "react-hot-toast";
import { ApiError } from "./api";

export function notifySuccess(message: string): void {
  toast.success(message);
}

export function notifyError(message: string): void {
  toast.error(message);
}

/** Extract a user-facing message from an unknown thrown value. */
export function errorMessage(err: unknown, fallback = "Something went wrong."): string {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === "string" && err.trim()) return err;
  return fallback;
}

/** Show an error toast derived from a thrown value. */
export function notifyFromError(err: unknown, fallback?: string): void {
  notifyError(errorMessage(err, fallback));
}

export { toast };
