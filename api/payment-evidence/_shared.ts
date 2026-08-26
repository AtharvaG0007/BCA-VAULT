import { createHmac, randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

export const PAYMENT_EVIDENCE_BUCKET = process.env.SUPABASE_PAYMENT_EVIDENCE_BUCKET || "bca-payment-evidence";
export const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024;

export const allowedImageTypes: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export function paymentStorage() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Payment evidence storage is unavailable.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function newSubmissionId() {
  return `BV-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

export function safeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.startsWith("Payment evidence")) return error.message;
  return "Something went wrong. Please try again later.";
}

export function appsScriptSignature(timestamp: string, requestId: string, data: Record<string, unknown>) {
  const secret = process.env.APPS_SCRIPT_SECRET;
  if (!secret) throw new Error("Payment evidence delivery is unavailable.");
  return createHmac("sha256", secret)
    .update(`${timestamp}.${requestId}.${JSON.stringify(data)}`)
    .digest("hex");
}
