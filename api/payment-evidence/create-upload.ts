import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../_supabaseAdmin";
import { allowedImageTypes, MAX_SCREENSHOT_SIZE, newSubmissionId, PAYMENT_EVIDENCE_BUCKET, paymentStorage, safeErrorMessage } from "./_shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const { contentType, size } = req.body ?? {};
    if (typeof contentType !== "string" || !allowedImageTypes[contentType]) {
      return res.status(400).json({ error: "Please upload a PNG, JPG, or WebP image." });
    }
    if (!Number.isInteger(size) || size < 1 || size > MAX_SCREENSHOT_SIZE) {
      return res.status(400).json({ error: "Payment screenshot must be 5 MB or smaller." });
    }

    const submissionId = newSubmissionId();
    const storagePath = `payment-evidence/${submissionId}/screenshot.${allowedImageTypes[contentType]}`;
    const { data, error } = await paymentStorage().storage
      .from(PAYMENT_EVIDENCE_BUCKET)
      .createSignedUploadUrl(storagePath);
    if (error || !data) throw new Error("Payment evidence storage is unavailable.");

    return res.status(200).json({ submissionId, storagePath, bucket: PAYMENT_EVIDENCE_BUCKET, token: data.token });
  } catch (error) {
    console.error("[payment-evidence/create-upload]", error);
    return res.status(500).json({ error: safeErrorMessage(error) });
  }
}
