import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";
const GOOGLE_REFRESH_TOKEN = Deno.env.get("GOOGLE_REFRESH_TOKEN") ?? "";
const GOOGLE_REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI") ?? `${SUPABASE_URL}/functions/v1/email-admin/google/callback`;

const SENDER_EMAIL = "bcavault07@gmail.com";
const SENDER_NAME = "BCA Vault";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const ALLOWED_ORIGINS = new Set([
  "https://bca-vault.portalbcavault.workers.dev",
  "https://bcavault.in",
  "https://www.bcavault.in",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://localhost:4173",
]);

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (/^https:\/\/bca-vault(-[a-z0-9]+)?\.portalbcavault\.workers\.dev$/.test(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
}

function cors(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowOrigin = isAllowedOrigin(origin) ? origin : "https://bcavault.in";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "Content-Type": "application/json"
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors(req) });
}

function esc(v: unknown) {
  return String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

async function requireAdmin(req: Request) {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Authentication required.");
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) throw new Error("Authentication required or expired.");
  const { data: profile } = await admin.from("admin_profiles").select("user_id,role,status").eq("user_id", user.id).eq("status", "active").maybeSingle();
  if (!profile || !["admin", "superadmin"].includes(profile.role)) throw new Error("Admin access required.");
  return user;
}

function generateDeterministicEmail(eventType: string, payload: Record<string, unknown>) {
  if (eventType === "payment_approved") {
    const studentName = String(payload.student_name || "Student").trim();
    const course = String(payload.course || "BCA").trim();
    const rawAmount = payload.amount_paid ? String(payload.amount_paid) : payload.amount ? `₹${payload.amount}` : "₹349";
    const amountPaid = rawAmount.startsWith("₹") ? rawAmount : `₹${rawAmount}`;
    const bundleName = String(payload.bundle_name || "BCA Vault Bundle").trim();

    const subject = "BCA Vault — Payment Approved & Access Activated";
    const text_body = `Dear ${studentName},\n\nWe are pleased to inform you that your payment has been successfully approved.\n\nPayment Details\n\n• Course: ${course}\n• Bundle: ${bundleName}\n• Amount: ${amountPaid}\n• Status: Approved\n\nThank you for choosing BCA Vault for your studies.\n\nWarm regards,\n\nBCA Vault Team`;

    const html_body = `<div style="font-family: Arial, sans-serif; color: #333333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
  <h2 style="color: #2e7d32; margin-top: 0;">Payment Approved</h2>

  <p>Dear ${esc(studentName)},</p>

  <p>We are pleased to inform you that your payment has been successfully approved.</p>

  <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <p style="margin: 5px 0;"><strong>Course:</strong> ${esc(course)}</p>
    <p style="margin: 5px 0;"><strong>Bundle:</strong> ${esc(bundleName)}</p>
    <p style="margin: 5px 0;"><strong>Amount:</strong> ${esc(amountPaid)}</p>
    <p style="margin: 5px 0;">
      <strong>Status:</strong>
      <span style="color: #2e7d32; font-weight: bold;">Approved</span>
    </p>
  </div>

  <p>Thank you for choosing BCA Vault for your studies.</p>

  <p style="margin-bottom: 0;">
    Warm regards,<br>
    <strong>BCA Vault Team</strong>
  </p>
</div>`;

    return { subject, text_body, html_body };
  }

  // Default: test email or operational notification
  const recipient = esc(payload.recipient_email || "Admin");
  const subject = "BCA Vault — Gmail API Test Email";
  const text_body = `This is an operational test email from BCA Vault confirming that Gmail API transactional delivery is operational.\n\nRecipient: ${recipient}\nSender: ${SENDER_EMAIL}\n\nRegards,\nBCA Vault Team\nbcavault07@gmail.com`;
  const html_body = `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px;background:#0b0f19;color:#fff;"><div style="max-width:500px;margin:auto;background:#111827;padding:24px;border-radius:8px;border:1px solid #374151;"><h2>BCA Vault — Test Email</h2><p>Transactional delivery via Gmail API is operational.</p><p style="font-size:12px;color:#9ca3af;">Recipient: ${recipient}<br>Sender: ${SENDER_EMAIL}</p><p style="margin-top:24px;font-size:12px;color:#6b7280;">BCA Vault Team</p></div></body></html>`;

  return { subject, text_body, html_body };
}

function base64url(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function mimeHeader(v: string) {
  return `=?UTF-8?B?${btoa(unescape(encodeURIComponent(v)))}?=`;
}

function makeRaw(
  fromEmail: string,
  subject: string,
  text: string,
  html: string,
  to: string
) {
  const boundary = `bca_${crypto.randomUUID().replaceAll("-", "")}`;
  const body = [
    `From: ${SENDER_NAME} <${fromEmail}>`,
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
    `--${boundary}--`
  ].join("\r\n");
  return base64url(new TextEncoder().encode(body));
}

async function googleAccessToken() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error("Google Gmail OAuth credentials are not configured.");
  }
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token"
    })
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
      headers: { Authorization: `Bearer ${token}` }
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: cors(req) });
  try {
    const rawPath = new URL(req.url).pathname;
    const path = rawPath
      .replace(/^\/functions\/v1\/email-admin/, "")
      .replace(/^\/email-admin/, "")
      .replace(/\/$/, "") || "/";

    const isGoogleStart = rawPath.endsWith("/google/start") || path === "/google/start";
    const isGoogleCallback = rawPath.endsWith("/google/callback") || path === "/google/callback";
    const matchRoute = (route: string) => rawPath.endsWith(route) || path === route;

    // OAuth bootstrap/callback MUST remain public. These routes intentionally do not call requireAdmin().
    if (isGoogleStart && req.method === "GET") {
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return new Response("Google OAuth client credentials are not configured.", { status: 500 });
      }
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_REDIRECT_URI,
        response_type: "code",
        access_type: "offline",
        prompt: "consent",
        scope: "https://www.googleapis.com/auth/gmail.send"
      });
      return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, 302);
    }

    if (isGoogleCallback && req.method === "GET") {
      const error = new URL(req.url).searchParams.get("error");
      if (error) return new Response(`Google OAuth failed: ${error}`, { status: 400 });
      const code = new URL(req.url).searchParams.get("code");
      if (!code) return new Response("Google OAuth failed: missing code.", { status: 400 });
      const r = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: GOOGLE_REDIRECT_URI,
          grant_type: "authorization_code"
        })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.refresh_token) {
        return new Response(`Google OAuth failed: ${d?.error_description || d?.error || "No refresh token returned"}`, { status: 400 });
      }
      return new Response(`OAuth complete. Copy this refresh token into the Supabase Edge Function secret GOOGLE_REFRESH_TOKEN:\n\n${d.refresh_token}\n`, {
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    const user = await requireAdmin(req);
    const body = await req.json().catch(() => ({}));

    if (matchRoute("/verify-gmail") && req.method === "POST") {
      try {
        const token = await googleAccessToken();
        const account = await checkGmailAccount(token);
        if (account && account.toLowerCase() !== SENDER_EMAIL.toLowerCase()) {
          return json(req, {
            success: false,
            error: `Gmail OAuth is authenticated to a different account (${account}). Please authorize ${SENDER_EMAIL}.`
          }, 400);
        }
        return json(req, {
          success: true,
          from: SENDER_EMAIL,
          provider: "Gmail API",
          verified: true
        });
      } catch (err: any) {
        return json(req, { success: false, error: err.message }, 400);
      }
    }

    if (matchRoute("/list") && req.method === "POST") {
      const { data, error } = await admin
        .from("email_outbox")
        .select("id,event_key,event_type,recipient_user_id,recipient_email,sender_name,status,subject,html_body,text_body,generated_at,generated_by,approved_at,approved_by,attempt_count,last_error,provider_message_id,created_at,sent_at,failed_at,payload")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return json(req, { success: true, data });
    }

    if (matchRoute("/generate") && req.method === "POST") {
      const id = String(body.id || "").trim();
      const eventType = String(body.event_type || "").trim();
      const recipientEmail = String(body.recipient_email || "").trim();

      if (id) {
        const { data: job, error: fetchError } = await admin.from("email_outbox").select("*").eq("id", id).single();
        if (fetchError || !job) return json(req, { success: false, error: "Email job not found." }, 404);
        if (job.status === "sent") return json(req, { success: false, error: "This email has already been sent." }, 409);
        const draft = generateDeterministicEmail(job.event_type, (job.payload && typeof job.payload === "object" ? job.payload : {}) as Record<string, unknown>);
        const { data, error } = await admin.from("email_outbox").update({
          ...draft,
          generated_at: new Date().toISOString(),
          generated_by: user.id,
          approved_at: null,
          approved_by: null,
          status: "pending",
          locked_at: null,
          last_error: null
        }).eq("id", id).select("*").single();
        if (error) throw new Error(error.message);
        return json(req, { success: true, data });
      } else if (eventType) {
        const draft = generateDeterministicEmail(eventType, (body.payload && typeof body.payload === "object" ? body.payload : { recipient_email: recipientEmail }) as Record<string, unknown>);
        return json(req, { success: true, data: draft });
      } else {
        return json(req, { success: false, error: "Email job ID or event_type is required." }, 400);
      }
    }

    if (matchRoute("/save") && req.method === "POST") {
      const id = String(body.id || "").trim();
      const subject = String(body.subject || "").trim();
      const html = String(body.html_body || "").trim();
      const text = String(body.text_body || "").trim();
      const recipientEmail = String(body.recipient_email || "").trim().toLowerCase();
      const eventType = String(body.event_type || "test_email").trim();

      if (!subject || !html || !text) {
        return json(req, { success: false, error: "Subject, HTML body and text body are required." }, 400);
      }

      if (id) {
        const { data, error } = await admin
          .from("email_outbox")
          .update({
            subject,
            html_body: html,
            text_body: text,
            ...(recipientEmail ? { recipient_email: recipientEmail } : {}),
            generated_at: new Date().toISOString(),
            generated_by: user.id,
            approved_at: new Date().toISOString(),
            approved_by: user.id,
            status: "pending",
            locked_at: null,
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .neq("status", "sent")
          .select("*")
          .single();
        if (error || !data) throw new Error(error?.message || "Email draft could not be saved.");
        return json(req, { success: true, data });
      } else {
        if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
          return json(req, { success: false, error: "A valid recipient email is required to save a new draft." }, 400);
        }
        const eventKey = `manual-test-${crypto.randomUUID()}`;
        const { data, error } = await admin
          .from("email_outbox")
          .insert({
            event_key: eventKey,
            event_type: eventType,
            recipient_email: recipientEmail,
            sender_name: SENDER_NAME,
            sender_email: SENDER_EMAIL,
            subject,
            html_body: html,
            text_body: text,
            status: "pending",
            payload: body.payload || { recipient_email: recipientEmail },
            generated_at: new Date().toISOString(),
            generated_by: user.id,
            approved_at: new Date().toISOString(),
            approved_by: user.id,
          })
          .select("*")
          .single();
        if (error || !data) throw new Error(error?.message || "Failed to create email draft.");
        return json(req, { success: true, data });
      }
    }

    if (matchRoute("/send") && req.method === "POST") {
      const id = String(body.id || "").trim();
      if (!id) return json(req, { success: false, error: "Email job ID is required." }, 400);

      const { data: claimed, error: claimError } = await admin
        .from("email_outbox")
        .update({
          status: "processing",
          locked_at: new Date().toISOString(),
          approved_at: new Date().toISOString(),
          approved_by: user.id
        })
        .eq("id", id)
        .eq("status", "pending")
        .select("*")
        .single();

      if (claimError || !claimed) {
        return json(req, { success: false, error: "Email is not ready to send, or it was already sent/claimed." }, 409);
      }

      if (!claimed.recipient_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claimed.recipient_email)) {
        await admin.from("email_outbox").update({ status: "pending", locked_at: null, last_error: "Recipient email is invalid." }).eq("id", id);
        return json(req, { success: false, error: "Recipient email is invalid." }, 400);
      }

      if (!claimed.subject || !claimed.html_body || !claimed.text_body) {
        await admin.from("email_outbox").update({ status: "pending", locked_at: null, last_error: "Generate and save the email before sending." }).eq("id", id);
        return json(req, { success: false, error: "Generate and save the email before sending." }, 400);
      }

      // Server-side validation for payment_approved emails
      if (claimed.event_type === "payment_approved") {
        const payload = (claimed.payload && typeof claimed.payload === "object" ? claimed.payload : {}) as Record<string, any>;
        const paymentId = payload.payment_id;

        // Verify payment in database if payment_id is present
        if (paymentId) {
          const { data: paymentRow, error: pErr } = await admin
            .from("payment_submissions")
            .select("id, status, amount, reference_id, utr, bundle_id, user_id, approved_at")
            .eq("id", paymentId)
            .single();

          if (pErr || !paymentRow) {
            const err = "Associated payment record could not be verified in database.";
            await admin.from("email_outbox").update({ status: "pending", locked_at: null, last_error: err }).eq("id", id);
            return json(req, { success: false, error: err }, 400);
          }

          if (paymentRow.status !== "approved") {
            const err = `Cannot send approval email: payment status is '${paymentRow.status}', expected 'approved'.`;
            await admin.from("email_outbox").update({ status: "pending", locked_at: null, last_error: err }).eq("id", id);
            return json(req, { success: false, error: err }, 400);
          }
        }
      }

      try {
        const token = await googleAccessToken();
        const account = await checkGmailAccount(token);
        if (account && account.toLowerCase() !== SENDER_EMAIL.toLowerCase()) {
          throw new Error(`Gmail OAuth is authenticated to a different account (${account}). Please authorize ${SENDER_EMAIL}.`);
        }

        const raw = makeRaw(SENDER_EMAIL, claimed.subject, claimed.text_body, claimed.html_body, claimed.recipient_email);
        const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ raw })
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || !d.id) {
          throw new Error(d?.error?.message || `Gmail HTTP ${r.status}`);
        }

        const now = new Date().toISOString();
        await admin.from("email_delivery_log").insert({
          outbox_id: id,
          user_id: claimed.recipient_user_id,
          recipient_email: claimed.recipient_email,
          event_type: claimed.event_type,
          provider: "gmail",
          provider_message_id: d.id,
          status: "sent",
          sent_at: now
        });

        const { data: sentRow } = await admin.from("email_outbox").update({
          status: "sent",
          sent_at: now,
          locked_at: null,
          last_error: null,
          provider_message_id: d.id
        }).eq("id", id).select("*").single();

        return json(req, { success: true, data: sentRow, provider_message_id: d.id });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const now = new Date().toISOString();
        await admin.from("email_delivery_log").insert({
          outbox_id: id,
          user_id: claimed.recipient_user_id,
          recipient_email: claimed.recipient_email,
          event_type: claimed.event_type,
          provider: "gmail",
          status: "failed",
          failed_at: now,
          error_message: message
        });
        await admin.from("email_outbox").update({
          status: "failed",
          failed_at: now,
          locked_at: null,
          last_error: message
        }).eq("id", id);
        return json(req, { success: false, error: message }, 502);
      }
    }

    return json(req, { success: false, error: "Not found." }, 404);
  } catch (err) {
    return json(req, { success: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
