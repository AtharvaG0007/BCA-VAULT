import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash } from "crypto";
import { requireAuth } from "./_firebaseAdmin";

// All secrets live here — never in VITE_ env vars
const CLOUD_NAME    = process.env.CLOUDINARY_CLOUD_NAME    ?? "";
const API_KEY       = process.env.CLOUDINARY_API_KEY       ?? "";
const API_SECRET    = process.env.CLOUDINARY_API_SECRET    ?? "";
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET ?? "";
const SCRIPT_URL    = process.env.APPS_SCRIPT_URL          ?? "";
const ADMIN_SECRET  = process.env.APPS_SCRIPT_SECRET       ?? "";

function generateOrderId(): string {
  return "ORD" + Date.now().toString().slice(-8);
}

function cloudinarySignature(params: Record<string, string>): string {
  const str = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(str + API_SECRET).digest("hex");
}

async function uploadToCloudinary(base64Data: string, mimeType: string): Promise<string> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const folder    = "bca-vault/payment-screenshots";

  const signParams: Record<string, string> = { folder, timestamp, upload_preset: UPLOAD_PRESET };
  const signature = cloudinarySignature(signParams);

  const formData = new FormData();
  formData.append("file",           `data:${mimeType};base64,${base64Data}`);
  formData.append("upload_preset",  UPLOAD_PRESET);
  formData.append("folder",         folder);
  formData.append("timestamp",      timestamp);
  formData.append("api_key",        API_KEY);
  formData.append("signature",      signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: "Upload failed" } }));
    throw new Error(err.error?.message ?? "Cloudinary upload failed");
  }

  const data = await res.json();
  return data.secure_url as string;
}

async function submitToGoogleSheets(payload: Record<string, unknown>): Promise<string> {
  if (!SCRIPT_URL) {
    console.warn("[API] APPS_SCRIPT_URL not set — skipping sheet submission");
    return generateOrderId();
  }

  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "submit", secret: ADMIN_SECRET, ...payload }),
  });

  if (!res.ok) throw new Error("Failed to reach Google Sheets backend");
  const data = await res.json();
  if (!data.success) throw new Error(data.error ?? "Sheet submission failed");
  return data.orderId ?? generateOrderId();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const caller = await requireAuth(req, res);
  if (!caller) return;

  try {
    const {
      fullName, phone, email, college, course, semester,
      bundleName, bundlePrice,
      screenshotBase64, screenshotMime,
    } = req.body as Record<string, string>;
    // The authenticated Firebase identity is authoritative; client email is only display data.
    const authenticatedEmail = caller.email ?? "";
    if (!authenticatedEmail) return res.status(403).json({ error: "A verified email is required" });

    // Validate required fields
    const missing = [
      !fullName && "fullName",
      !phone    && "phone",
      !email    && "email",
      !college  && "college",
      !course   && "course",
      !semester && "semester",
      !bundleName && "bundleName",
      !screenshotBase64 && "screenshotBase64",
    ].filter(Boolean);

    if (missing.length) {
      return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` });
    }

    // 1. Upload screenshot to Cloudinary (server-side)
    let screenshotUrl = "data:placeholder/not-configured";
    if (CLOUD_NAME && API_KEY && API_SECRET) {
      screenshotUrl = await uploadToCloudinary(screenshotBase64, screenshotMime ?? "image/jpeg");
    } else {
      console.warn("[API] Cloudinary not configured — skipping screenshot upload");
    }

    // 2. Submit order to Google Sheets (server-side)
    const orderId = await submitToGoogleSheets({
      fullName,
      phone,
      email: authenticatedEmail,
      college,
      course,
      semester,
      bundleName,
      bundlePrice: Number(bundlePrice),
      screenshotUrl,
    });

    return res.status(200).json({ success: true, orderId });
  } catch (err: any) {
    console.error("[API/submit-order]", err);
    return res.status(500).json({ error: err.message ?? "Internal server error" });
  }
}
