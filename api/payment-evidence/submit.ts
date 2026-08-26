import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser, supabaseAdmin } from "../_supabaseAdmin";
import { allowedImageTypes, MAX_SCREENSHOT_SIZE, PAYMENT_EVIDENCE_BUCKET, paymentStorage, safeErrorMessage } from "./_shared";

const amounts = new Set(["899", "849", "749", "Other"]);
const trim = (value: unknown) => typeof value === "string" ? value.trim() : "";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const fullName = trim(req.body?.fullName);
    const phone = trim(req.body?.phone).replace(/[\s-]/g, "");
    const course = trim(req.body?.course);
    const semester = trim(req.body?.semester);
    const amountPaid = trim(req.body?.amountPaid);
    const utr = trim(req.body?.utr).toUpperCase();
    const submissionId = trim(req.body?.submissionId);
    const storagePath = trim(req.body?.storagePath);
    const paymentConfirmation = req.body?.paymentConfirmation === true;
    const email = trim(req.body?.email).toLowerCase();

    if (!user.email || email !== user.email.toLowerCase()) return res.status(400).json({ error: "Use the email address registered to your BCA Vault account." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: "Please enter a valid email address." });
    if (fullName.length < 2 || fullName.length > 100) return res.status(400).json({ error: "Please enter your full name." });
    if (!/^\+?[0-9]{10,15}$/.test(phone)) return res.status(400).json({ error: "Please enter a valid phone number." });
    if (course.length < 2 || course.length > 80) return res.status(400).json({ error: "Please select your course." });
    if (!/^[1-6]$/.test(semester)) return res.status(400).json({ error: "Please select a valid semester." });
    if (!amounts.has(amountPaid)) return res.status(400).json({ error: "Please select a valid amount." });
    if (utr.length < 6 || utr.length > 64 || !/^[A-Z0-9-]+$/.test(utr)) return res.status(400).json({ error: "Please enter a valid UPI transaction ID / UTR." });
    if (!paymentConfirmation) return res.status(400).json({ error: "Please confirm that the payment details are correct." });
    if (!/^BV-[A-F0-9]{12}$/.test(submissionId)) return res.status(400).json({ error: "Your upload session is invalid. Please upload the screenshot again." });

    const expectedPrefix = `payment-evidence/${submissionId}/screenshot.`;
    if (!storagePath.startsWith(expectedPrefix) || !Object.values(allowedImageTypes).some((extension) => storagePath.endsWith(`.${extension}`))) {
      return res.status(400).json({ error: "Your uploaded screenshot could not be verified. Please try again." });
    }

    const fileName = storagePath.slice(storagePath.lastIndexOf("/") + 1);
    const folder = storagePath.slice(0, storagePath.lastIndexOf("/"));
    const { data: files, error: listError } = await paymentStorage().storage.from(PAYMENT_EVIDENCE_BUCKET).list(folder, { limit: 10 });
    if (listError) throw new Error("Payment evidence storage is unavailable.");
    const uploaded = files?.find((file) => file.name === fileName);
    const mimeType = uploaded?.metadata?.mimetype;
    const fileSize = Number(uploaded?.metadata?.size);
    if (!uploaded || !mimeType || !allowedImageTypes[mimeType] || !Number.isFinite(fileSize) || fileSize < 1 || fileSize > MAX_SCREENSHOT_SIZE) {
      return res.status(400).json({ error: "Your uploaded screenshot could not be verified. Please upload it again." });
    }

    const { error } = await supabaseAdmin().from("payment_submissions").insert({
      reference_id: submissionId, user_id: user.id, full_name: fullName, email, phone,
      course, semester: Number(semester), amount: amountPaid === "Other" ? 899 : Number(amountPaid),
      utr, screenshot_bucket: PAYMENT_EVIDENCE_BUCKET, screenshot_path: storagePath,
    });
    if (error?.code === "23505") return res.status(409).json({ error: "This payment reference or UTR has already been submitted." });
    if (error) throw error;
    return res.status(201).json({ success: true, submissionId });
  } catch (error) {
    console.error("[payment-evidence/submit]", error);
    return res.status(500).json({ error: safeErrorMessage(error) });
  }
}
