// ==============================================================================
// Edge Function: email-dispatcher
// Purpose:
//   Server-side automated dispatcher for BCA Vault transactional payment approval emails.
//   Pulls pending payment_approved outbox records, atomically claims them,
//   validates authoritative database state, and delivers via Gmail API (bcavault07@gmail.com).
//
// Security & Invariants:
//   - Server-to-server only: Requires service role key, superadmin auth, or x-dispatcher-secret.
//   - Zero Gemini AI generation (uses deterministic fixed template).
//   - Zero PDF generation or attachment.
//   - Zero Resend dependency.
//   - Verified sender: strictly bcavault07@gmail.com.
//   - Atomic queue locking with 5-minute stale-lock reclaim.
//   - Idempotent: Never re-dispatches records with status = 'sent'.
// ==============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";
const GOOGLE_REFRESH_TOKEN = Deno.env.get("GOOGLE_REFRESH_TOKEN") ?? "";
const DISPATCHER_SECRET = Deno.env.get("DISPATCHER_SECRET") ?? Deno.env.get("CRON_SECRET") ?? "";

const SENDER_EMAIL = "bcavault07@gmail.com";
const SENDER_NAME = "BCA Vault";
const STALE_LOCK_MS = 5 * 60 * 1000; // 5 minutes

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowed =
    origin.endsWith(".workers.dev") ||
    origin.endsWith(".vercel.app") ||
    origin.endsWith(".figma.site") ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "https://bca-vault.portalbcavault.workers.dev",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-dispatcher-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(req) });
}

function sanitizeError(msg: unknown): string {
  let str = String(msg instanceof Error ? msg.message : msg ?? "Unknown error");
  if (GOOGLE_CLIENT_SECRET) str = str.replaceAll(GOOGLE_CLIENT_SECRET, "[REDACTED]");
  if (GOOGLE_REFRESH_TOKEN) str = str.replaceAll(GOOGLE_REFRESH_TOKEN, "[REDACTED]");
  if (SERVICE_ROLE_KEY) str = str.replaceAll(SERVICE_ROLE_KEY, "[REDACTED]");
  if (DISPATCHER_SECRET) str = str.replaceAll(DISPATCHER_SECRET, "[REDACTED]");
  return str.slice(0, 500);
}

function isPermanentFailure(errStr: string): boolean {
  const lower = errStr.toLowerCase();
  return (
    lower.includes("payment status is") ||
    lower.includes("payment submission record not found") ||
    lower.includes("invalid recipient email") ||
    lower.includes("recipient email is required") ||
    lower.includes("unsupported email event type")
  );
}

async function authenticateCaller(req: Request): Promise<{ authorized: boolean; reason?: string }> {
  // 1. Check x-dispatcher-secret header
  const secretHeader = req.headers.get("x-dispatcher-secret") || "";
  if (DISPATCHER_SECRET && secretHeader && secretHeader === DISPATCHER_SECRET) {
    return { authorized: true };
  }

  // 2. Check Authorization header
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return { authorized: false, reason: "Authentication credentials required." };
  }

  // 2a. Direct service_role key match (internal server-to-server)
  if (SERVICE_ROLE_KEY && token === SERVICE_ROLE_KEY) {
    return { authorized: true };
  }

  // 2b. Authenticated Super Admin user token
  try {
    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (!userErr && user) {
      const { data: profile } = await admin
        .from("admin_profiles")
        .select("role, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (profile && ["admin", "superadmin"].includes(profile.role)) {
        return { authorized: true };
      }
    }
  } catch {
    // fall through
  }

  return { authorized: false, reason: "Unauthorized: valid service role key, superadmin session, or dispatcher secret required." };
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function mimeHeader(v: string): string {
  return `=?UTF-8?B?${btoa(unescape(encodeURIComponent(v)))}?=`;
}

function makeRawMime(to: string, subject: string, text: string, html: string): string {
  const boundary = `bca_${crypto.randomUUID().replaceAll("-", "")}`;
  const body = [
    `From: ${SENDER_NAME} <${SENDER_EMAIL}>`,
    `To: ${to}`,
    `Subject: ${mimeHeader(subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    text,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    html,
    ``,
    `--${boundary}--`,
  ].join("\r\n");

  return base64url(new TextEncoder().encode(body));
}

async function googleAccessToken(): Promise<string> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error("Google Gmail OAuth credentials are not configured in Supabase secrets.");
  }
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) {
    throw new Error(d?.error_description || d?.error || `Google OAuth HTTP ${r.status}`);
  }
  return String(d.access_token);
}

async function checkGmailAccount(token: string): Promise<string | null> {
  try {
    const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.emailAddress) return String(d.emailAddress).trim();
  } catch {}
  try {
    const r2 = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${encodeURIComponent(token)}`);
    const d2 = await r2.json().catch(() => ({}));
    if (r2.ok && d2.email) return String(d2.email).trim();
  } catch {}
  return null;
}

const MAX_ATTEMPT_COUNT = 5;

function computeBackoffMs(attemptCount: number): number {
  // Bounded exponential backoff: 30s * 2^(attempt - 1), capped at 15 minutes (900s)
  const baseSeconds = 30;
  const backoffSec = Math.min(baseSeconds * Math.pow(2, Math.max(0, attemptCount - 1)), 15 * 60);
  return backoffSec * 1000;
}

function renderPaymentApprovedHtml(
  studentName: string,
  studentEmail: string,
  paymentRef: string,
  amountText: string,
  bundleTitle: string
): string {
  const escapeHtml = (s: string) =>
    s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

  const safeName = escapeHtml(studentName);
  const safeEmail = escapeHtml(studentEmail);
  const safeRef = escapeHtml(paymentRef);
  const safeAmount = escapeHtml(amountText);
  const safeBundle = escapeHtml(bundleTitle);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>BCA Vault — Payment Approved &amp; Access Activated</title></head><body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6;"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 16px;"><tr><td align="center"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);"><tr><td style="padding: 28px 32px 20px; background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); border-bottom: 1px solid #1f2937;"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td><span style="font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">BCA <span style="color: #6366f1;">VAULT</span></span></td><td align="right"><span style="display: inline-block; padding: 4px 12px; font-size: 11px; font-weight: 700; color: #10b981; background-color: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">Approved</span></td></tr></table><h1 style="margin: 20px 0 0; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3;">Payment Approved &amp; Access Activated</h1></td></tr><tr><td style="padding: 32px;"><p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #e5e7eb;">Hi <strong style="color: #ffffff;">${safeName}</strong>,</p><p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #9ca3af;">Your payment for BCA Vault has been successfully verified and approved.</p><div style="margin-bottom: 20px; background-color: #1a2234; border: 1px solid #283548; border-radius: 8px; padding: 18px 20px;"><h2 style="margin: 0 0 14px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #818cf8;">Payment Details</h2><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; line-height: 1.8;"><tr><td style="color: #9ca3af; width: 42%; padding: 3px 0;">• Student:</td><td style="color: #f3f4f6; font-weight: 600; padding: 3px 0;">${safeName}</td></tr><tr><td style="color: #9ca3af; padding: 3px 0;">• Email:</td><td style="color: #f3f4f6; padding: 3px 0;">${safeEmail}</td></tr><tr><td style="color: #9ca3af; padding: 3px 0;">• Payment Reference:</td><td style="color: #f3f4f6; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; padding: 3px 0;">${safeRef}</td></tr><tr><td style="color: #9ca3af; padding: 3px 0;">• Amount Paid:</td><td style="color: #34d399; font-weight: 700; padding: 3px 0;">${safeAmount}</td></tr><tr><td style="color: #9ca3af; padding: 3px 0;">• Payment Status:</td><td style="color: #10b981; font-weight: 700; padding: 3px 0;">Approved</td></tr></table></div><div style="margin-bottom: 24px; background-color: #1a2234; border: 1px solid #283548; border-radius: 8px; padding: 18px 20px;"><h2 style="margin: 0 0 14px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #818cf8;">Access Details</h2><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; line-height: 1.8;"><tr><td style="color: #9ca3af; width: 42%; padding: 3px 0;">• Bundle:</td><td style="color: #f3f4f6; font-weight: 600; padding: 3px 0;">${safeBundle}</td></tr><tr><td style="color: #9ca3af; padding: 3px 0;">• Access Status:</td><td style="color: #10b981; font-weight: 700; padding: 3px 0;">Activated</td></tr></table><p style="margin: 12px 0 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">• Your BCA Vault resources are now available in your account.</p></div><p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #e5e7eb;">You can now log in to BCA Vault and access your assigned study materials.</p><table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;"><tr><td align="center" style="border-radius: 6px; background-color: #4f46e5;"><a href="https://bca-vault.portalbcavault.workers.dev" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">Go to BCA Vault</a></td></tr></table><div style="border-top: 1px solid #1f2937; padding-top: 20px; font-size: 13px; line-height: 1.6; color: #9ca3af;"><p style="margin: 0;">Regards,<br><strong style="color: #ffffff;">BCA Vault Team</strong><br><a href="mailto:bcavault07@gmail.com" style="color: #818cf8; text-decoration: none;">bcavault07@gmail.com</a></p></div></td></tr></table></td></tr></table></body></html>`;
}

async function ensureOutboxEntryForPayment(paymentId: string) {
  try {
    const eventKey = `payment-approved:${paymentId}`;
    const { data: existing } = await admin
      .from("email_outbox")
      .select("id, status")
      .eq("event_key", eventKey)
      .maybeSingle();

    if (existing) {
      return existing;
    }

    const { data: payment } = await admin
      .from("payment_submissions")
      .select("id, status, amount, reference_id, utr, bundle_id, user_id, email, full_name, verified_by, bundles(title)")
      .eq("id", paymentId)
      .maybeSingle();

    if (!payment || payment.status !== "approved") return null;

    let targetUserId = payment.user_id;
    let studentProf: any = null;
    if (targetUserId) {
      const { data: p } = await admin
        .from("profiles")
        .select("user_id, full_name, email")
        .eq("user_id", targetUserId)
        .maybeSingle();
      studentProf = p;
    } else if (payment.email) {
      const { data: p } = await admin
        .from("profiles")
        .select("user_id, full_name, email")
        .ilike("email", payment.email)
        .maybeSingle();
      studentProf = p;
      if (p?.user_id) targetUserId = p.user_id;
    }

    const studentName = studentProf?.full_name?.trim() || payment.full_name?.trim() || "Student";
    const studentEmail = studentProf?.email?.trim() || payment.email?.trim();
    if (!studentEmail) return null;

    const paymentRef = payment.reference_id || payment.utr || payment.id;
    const rawAmount = payment.amount != null ? String(payment.amount).trim() : "";
    const amountText = !rawAmount ? "₹0" : (rawAmount.startsWith("₹") ? rawAmount : `₹${rawAmount}`);
    const bundleTitle = (Array.isArray(payment.bundles) ? payment.bundles[0]?.title : payment.bundles?.title) || "BCA Vault Bundle";

    const payload = {
      payment_id: payment.id,
      user_id: targetUserId,
      bundle_id: payment.bundle_id,
      semester: payment.semester,
      student_name: studentName,
      student_email: studentEmail,
      payment_reference: paymentRef,
      amount_paid: amountText,
      bundle_name: bundleTitle,
      approved_at: new Date().toISOString(),
      verified_by: payment.verified_by || null,
      access_granted: true,
    };

    const fixedTextBody = `Hi ${studentName},\n\nYour payment for BCA Vault has been successfully verified and approved.\n\nPayment Details\n\n• Student: ${studentName}\n• Email: ${studentEmail}\n• Payment Reference: ${paymentRef}\n• Amount Paid: ${amountText}\n• Payment Status: Approved\n\nAccess Details\n\n• Bundle: ${bundleTitle}\n• Access Status: Activated\n• Your BCA Vault resources are now available in your account.\n\nYou can now log in to BCA Vault and access your assigned study materials.\n\nRegards,\n\nBCA Vault Team\nbcavault07@gmail.com`;

    const fixedHtmlBody = renderPaymentApprovedHtml(studentName, studentEmail, paymentRef, amountText, bundleTitle);

    const { data: inserted } = await admin
      .from("email_outbox")
      .insert({
        event_key: eventKey,
        event_type: "payment_approved",
        recipient_user_id: targetUserId,
        recipient_email: studentEmail,
        sender_name: "BCA Vault",
        sender_email: "bcavault07@gmail.com",
        status: "pending",
        subject: "BCA Vault — Payment Approved & Access Activated",
        text_body: fixedTextBody,
        html_body: fixedHtmlBody,
        payload,
        approved_at: new Date().toISOString(),
        approved_by: payment.verified_by || null,
      })
      .select("id, status")
      .maybeSingle();

    return inserted;
  } catch (err) {
    console.warn("[email-dispatcher] ensureOutboxEntryForPayment notice:", err);
    return null;
  }
}

// Atomically claim a pending or stale-processing outbox row
async function claimOutboxRow(rowId: string) {
  const fiveMinAgo = new Date(Date.now() - STALE_LOCK_MS).toISOString();
  const now = new Date().toISOString();

  // 1. Try to claim pending row where available_at <= now or available_at is null
  const { data: claimedPending, error: e1 } = await admin
    .from("email_outbox")
    .update({
      status: "processing",
      locked_at: now,
    })
    .eq("id", rowId)
    .eq("status", "pending")
    .or(`available_at.is.null,available_at.lte.${now}`)
    .select("*")
    .maybeSingle();

  if (claimedPending) return { claimed: claimedPending, error: null };
  if (e1) return { claimed: null, error: e1.message };

  // 2. Try to reclaim stale processing row (> 5 minutes locked)
  const { data: claimedStale, error: e2 } = await admin
    .from("email_outbox")
    .update({
      status: "processing",
      locked_at: now,
    })
    .eq("id", rowId)
    .eq("status", "processing")
    .lt("locked_at", fiveMinAgo)
    .select("*")
    .maybeSingle();

  if (claimedStale) return { claimed: claimedStale, error: null };
  if (e2) return { claimed: null, error: e2.message };

  // 3. Check if already sent
  const { data: existing } = await admin
    .from("email_outbox")
    .select("id, status, provider_message_id")
    .eq("id", rowId)
    .maybeSingle();

  if (existing?.status === "sent") {
    return { claimed: null, error: "Row has already been sent.", alreadySent: true };
  }

  return { claimed: null, error: "Row is currently locked by another worker or in retry backoff." };
}

// Dispatch a single claimed payment_approved outbox record
async function dispatchClaimedRow(claimed: Record<string, any>) {
  const rowId = claimed.id;
  const payload = (claimed.payload && typeof claimed.payload === "object" ? claimed.payload : {}) as Record<string, any>;
  const paymentId = payload.payment_id || String(claimed.event_key || "").replace(/^payment-approved:/, "");

  try {
    // 1. Validate event_type
    if (claimed.event_type !== "payment_approved") {
      throw new Error(`Unsupported email event type: ${claimed.event_type}`);
    }

    // 2. Validate sender
    if (claimed.sender_email && claimed.sender_email.toLowerCase() !== SENDER_EMAIL.toLowerCase()) {
      throw new Error(`Sender mismatch: expected ${SENDER_EMAIL}, got ${claimed.sender_email}`);
    }

    // 3. Re-read and verify authoritative payment record from database
    if (!paymentId) {
      throw new Error("Missing payment_id in outbox payload.");
    }

    const { data: paymentRow, error: pErr } = await admin
      .from("payment_submissions")
      .select("id, status, amount, reference_id, utr, bundle_id, user_id, email, full_name, bundles(title)")
      .eq("id", paymentId)
      .maybeSingle();

    if (pErr || !paymentRow) {
      throw new Error("Associated payment submission record not found.");
    }

    if (paymentRow.status !== "approved") {
      throw new Error(`Payment status is '${paymentRow.status}', expected 'approved'.`);
    }

    // 4. Validate authoritative recipient email
    const recipientEmail = (claimed.recipient_email || paymentRow.email || "").trim().toLowerCase();
    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      throw new Error("Invalid recipient email address.");
    }

    // 5. Ensure fixed subject and body (with deterministic fallback rendering)
    const subject = claimed.subject || "BCA Vault — Payment Approved & Access Activated";
    let textBody = claimed.text_body;
    let htmlBody = claimed.html_body;

    if (!textBody || !htmlBody) {
      const studentName = payload.student_name || paymentRow.full_name || "Student";
      const studentEmail = recipientEmail;
      const paymentRef = payload.payment_reference || paymentRow.reference_id || paymentRow.utr || paymentRow.id;
      const rawAmount = payload.amount_paid || (paymentRow.amount ? `₹${paymentRow.amount}` : "₹0");
      const amountText = String(rawAmount).startsWith("₹") ? String(rawAmount) : `₹${rawAmount}`;
      const bundleTitle = payload.bundle_name || (Array.isArray(paymentRow.bundles) ? paymentRow.bundles[0]?.title : paymentRow.bundles?.title) || "BCA Vault Bundle";

      textBody = textBody || `Hi ${studentName},\n\nYour payment for BCA Vault has been successfully verified and approved.\n\nPayment Details\n\n• Student: ${studentName}\n• Email: ${studentEmail}\n• Payment Reference: ${paymentRef}\n• Amount Paid: ${amountText}\n• Payment Status: Approved\n\nAccess Details\n\n• Bundle: ${bundleTitle}\n• Access Status: Activated\n• Your BCA Vault resources are now available in your account.\n\nYou can now log in to BCA Vault and access your assigned study materials.\n\nRegards,\n\nBCA Vault Team\nbcavault07@gmail.com`;

      htmlBody = htmlBody || renderPaymentApprovedHtml(studentName, studentEmail, paymentRef, amountText, bundleTitle);
    }

    // 6. Obtain and verify Gmail OAuth credentials
    const token = await googleAccessToken();
    const activeAccount = await checkGmailAccount(token);
    if (activeAccount && activeAccount.toLowerCase() !== SENDER_EMAIL.toLowerCase()) {
      throw new Error(`Gmail OAuth is authenticated to a different account (${activeAccount}). Please authorize ${SENDER_EMAIL}.`);
    }

    // 7. Construct RFC 2822 MIME message (multipart/alternative, no attachments)
    const raw = makeRawMime(recipientEmail, subject, textBody, htmlBody);

    // 8. Deliver via Gmail API
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });

    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.id) {
      throw new Error(d?.error?.message || `Gmail API error HTTP ${res.status}`);
    }

    const gmailMessageId = String(d.id);
    const now = new Date().toISOString();

    // 9. Record delivery success in email_outbox
    // Note on external delivery semantics:
    // If Gmail accepts the message and returns HTTP 200 with message ID, delivery succeeded.
    // We atomically mark status = 'sent', store provider_message_id, and clear locked_at.
    const { data: sentRow } = await admin
      .from("email_outbox")
      .update({
        status: "sent",
        sent_at: now,
        locked_at: null,
        last_error: null,
        provider_message_id: gmailMessageId,
        attempt_count: (claimed.attempt_count || 0) + 1,
        updated_at: now,
      })
      .eq("id", rowId)
      .select("*")
      .single();

    // 10. Record delivery success in email_delivery_log
    await admin.from("email_delivery_log").insert({
      outbox_id: rowId,
      user_id: claimed.recipient_user_id || paymentRow.user_id,
      recipient_email: recipientEmail,
      event_type: claimed.event_type,
      provider: "gmail",
      provider_message_id: gmailMessageId,
      status: "sent",
      sent_at: now,
    });

    return { success: true, outbox_id: rowId, provider_message_id: gmailMessageId, sentRow };
  } catch (err: any) {
    const errorMsg = sanitizeError(err);
    const now = new Date().toISOString();
    const nextAttemptCount = (claimed.attempt_count || 0) + 1;
    const isPermanent = isPermanentFailure(errorMsg) || nextAttemptCount >= MAX_ATTEMPT_COUNT;
    const nextStatus = isPermanent ? "failed" : "pending";
    const backoffMs = computeBackoffMs(nextAttemptCount);
    // email_outbox.available_at has a NOT NULL constraint, so keep timestamp for both states
    const nextAvailableAt = isPermanent ? now : new Date(Date.now() + backoffMs).toISOString();
    const finalErrorMsg = isPermanent && nextAttemptCount >= MAX_ATTEMPT_COUNT
      ? `Exceeded maximum retry attempts (${MAX_ATTEMPT_COUNT}): ${errorMsg}`
      : errorMsg;

    // Failure isolation: payment status and student bundle access are NEVER altered on email failure.
    // Record error state in email_outbox:
    const { error: outboxUpdateErr } = await admin
      .from("email_outbox")
      .update({
        status: nextStatus,
        locked_at: null,
        failed_at: isPermanent ? now : null,
        available_at: nextAvailableAt,
        last_error: finalErrorMsg,
        attempt_count: nextAttemptCount,
        updated_at: now,
      })
      .eq("id", rowId);

    if (outboxUpdateErr) {
      console.warn("[email-dispatcher] outbox error status update notice:", outboxUpdateErr);
    }

    // Record failure in email_delivery_log (safe user_id or null to respect foreign key):
    const safeUserId = claimed.recipient_user_id || null;
    await admin.from("email_delivery_log").insert({
      outbox_id: rowId,
      user_id: safeUserId,
      recipient_email: claimed.recipient_email || payload.student_email || "unknown@unknown.com",
      event_type: claimed.event_type || "payment_approved",
      provider: "gmail",
      status: "failed",
      failed_at: now,
      error_message: finalErrorMsg,
    });

    return { success: false, outbox_id: rowId, error: finalErrorMsg, retryable: !isPermanent };
  }
}

// Find candidate IDs for background sweep
async function findEligibleOutboxIds(limit = 10): Promise<string[]> {
  const fiveMinAgo = new Date(Date.now() - STALE_LOCK_MS).toISOString();
  const now = new Date().toISOString();

  // Also discover any approved payments lacking an outbox entry to guarantee delivery
  try {
    const { data: recentApproved } = await admin
      .from("payment_submissions")
      .select("id")
      .eq("status", "approved")
      .order("verified_at", { ascending: false })
      .limit(5);

    if (recentApproved && recentApproved.length > 0) {
      for (const p of recentApproved) {
        const eventKey = `payment-approved:${p.id}`;
        const { data: existing } = await admin
          .from("email_outbox")
          .select("id")
          .eq("event_key", eventKey)
          .maybeSingle();
        if (!existing) {
          await ensureOutboxEntryForPayment(p.id);
        }
      }
    }
  } catch (discoveryErr) {
    console.warn("[email-dispatcher] sweep discovery notice:", discoveryErr);
  }

  // Query eligible outbox IDs:
  // (status = pending AND (available_at is null OR available_at <= now))
  // OR (status = processing AND locked_at < fiveMinAgo)
  const { data, error } = await admin
    .from("email_outbox")
    .select("id")
    .eq("event_type", "payment_approved")
    .or(`and(status.eq.pending,or(available_at.is.null,available_at.lte.${now})),and(status.eq.processing,locked_at.lt.${fiveMinAgo})`)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return data.map((r: any) => r.id);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, { success: false, error: "Method not allowed. Use POST." }, 405);
  }

  // Security Gate: authenticate caller (server-to-server secret or superadmin JWT)
  const auth = await authenticateCaller(req);
  if (!auth.authorized) {
    return jsonResponse(req, { success: false, error: auth.reason || "Unauthorized" }, 401);
  }

  try {
    const body = await req.json().catch(() => ({}));
    let targetOutboxId = String(body.outbox_id || "").trim();
    const paymentId = String(body.payment_id || "").trim();

    // If payment_id provided, look up the deterministic event_key
    if (!targetOutboxId && paymentId) {
      const eventKey = `payment-approved:${paymentId}`;
      let { data: outboxRow } = await admin
        .from("email_outbox")
        .select("id, status")
        .eq("event_key", eventKey)
        .maybeSingle();

      if (!outboxRow) {
        const created = await ensureOutboxEntryForPayment(paymentId);
        if (created) {
          outboxRow = { id: created.id, status: created.status };
        }
      }

      if (outboxRow) {
        if (outboxRow.status === "sent") {
          return jsonResponse(req, {
            success: true,
            message: "Email for this payment was already delivered.",
            outbox_id: outboxRow.id,
            already_sent: true,
          }, 200);
        }
        targetOutboxId = outboxRow.id;
      }
    }

    // Case 1: Targeted single outbox dispatch
    if (targetOutboxId) {
      const { claimed, error: claimErr } = await claimOutboxRow(targetOutboxId);
      if (claimErr || !claimed) {
        return jsonResponse(req, {
          success: false,
          error: claimErr || "Outbox record could not be claimed.",
        }, 409);
      }

      const result = await dispatchClaimedRow(claimed);
      const statusCode = result.success ? 200 : result.retryable ? 502 : 400;
      return jsonResponse(req, result, statusCode);
    }

    // Case 2: Sweep mode (process eligible pending or stale-lock payment approval emails)
    const eligibleIds = await findEligibleOutboxIds(5);
    if (eligibleIds.length === 0) {
      return jsonResponse(req, { success: true, message: "No pending payment-approved emails to dispatch.", processed: 0 }, 200);
    }

    const results = [];
    for (const id of eligibleIds) {
      const { claimed } = await claimOutboxRow(id);
      if (claimed) {
        const res = await dispatchClaimedRow(claimed);
        results.push(res);
      }
    }

    return jsonResponse(req, {
      success: true,
      processed: results.length,
      results,
    }, 200);
  } catch (err: any) {
    const message = sanitizeError(err);
    return jsonResponse(req, { success: false, error: message }, 500);
  }
});
