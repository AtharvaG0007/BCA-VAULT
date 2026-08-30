/**
 * Centralized error normalization and user-friendly error formatting for BCA Vault
 */

export type ErrorCategory =
  | "AUTH_REQUIRED"
  | "INVALID_CREDENTIALS"
  | "ACCESS_DENIED"
  | "BUNDLE_NOT_FOUND"
  | "NOTE_NOT_FOUND"
  | "PAYMENT_DUPLICATE_UTR"
  | "PAYMENT_EVIDENCE_INVALID"
  | "STORAGE_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export interface NormalizedError {
  category: ErrorCategory;
  message: string;
  originalError?: unknown;
}

export function normalizeError(error: unknown): NormalizedError {
  if (!error) {
    return {
      category: "UNKNOWN_ERROR",
      message: "An unexpected error occurred. Please try again.",
    };
  }

  const rawMessage =
    typeof error === "string"
      ? error
      : (error as any)?.message || (error as any)?.error || JSON.stringify(error);

  const lower = rawMessage.toLowerCase();

  if (lower.includes("invalid login") || lower.includes("invalid_credentials") || lower.includes("invalid email or password")) {
    return {
      category: "INVALID_CREDENTIALS",
      message: "Incorrect email address or password. Please verify your credentials.",
      originalError: error,
    };
  }

  if (lower.includes("superadmin") || lower.includes("admin authorization required") || lower.includes("unauthorized") || lower.includes("access required")) {
    return {
      category: "ACCESS_DENIED",
      message: "Administrative privileges are required for this action.",
      originalError: error,
    };
  }

  if (lower.includes("23505") || lower.includes("already been submitted") || lower.includes("duplicate key")) {
    return {
      category: "PAYMENT_DUPLICATE_UTR",
      message: "This UPI transaction ID / UTR has already been submitted for verification.",
      originalError: error,
    };
  }

  if (lower.includes("storage") || lower.includes("bucket") || lower.includes("signed url")) {
    return {
      category: "STORAGE_ERROR",
      message: "Unable to access file storage at this time. Please try again in a few moments.",
      originalError: error,
    };
  }

  if (lower.includes("jwt") || lower.includes("token") || lower.includes("session expired") || lower.includes("auth token")) {
    return {
      category: "AUTH_REQUIRED",
      message: "Your session has expired. Please sign in again to continue.",
      originalError: error,
    };
  }

  return {
    category: "UNKNOWN_ERROR",
    message: rawMessage || "An unexpected error occurred. Please contact bcavault07@gmail.com if this persists.",
    originalError: error,
  };
}
