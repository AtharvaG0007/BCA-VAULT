import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";
const fromName = Deno.env.get("EMAIL_FROM_NAME") ?? "BCA Vault";
const fromAddress = Deno.env.get("EMAIL_FROM_ADDRESS") ?? "bcavault07@gmail.com";
const MAX_ATTEMPTS = 5;
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const esc = (v: unknown) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const retryAt = (attempt: number) => new Date(Date.now() + [1, 5, 15, 60][Math.min(Math.max(attempt - 1, 0), 3)] * 60000).toISOString();

function render(type: string, p: Record<string, unknown>) {
  const name = esc(p.student_name ?? p.referrer_name ?? "Student");
  const shell = (title: string, body: string) => `<!doctype html><html><body style="margin:0;background:#f6f7fb;font-family:Arial,sans-serif;color:#172033"><div style="max-width:620px;margin:32px auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden"><div style="padding:24px 28px;border-bottom:1px solid #eee"><strong style="font-size:22px">BCA Vault</strong></div><div style="padding:28px"><h1>${title}</h1>${body}<p style="margin-top:28px;color:#667085;font-size:13px">Automated transactional email from BCA Vault.</p></div></div></body></html>`;
  if (type === "payment_approved") return { subject: "🎉 Your BCA Vault Payment Is Confirmed", html: shell("Payment confirmed 🎉", `<p>Hi ${name},</p><p>Your payment has been verified and your purchased learning access is now active.</p><p><b>Course:</b> ${esc(p.course)}<br><b>Semester:</b> ${esc(p.semester)}<br><b>Bundle:</b> ${esc(p.bundle_name)}<br><b>Amount:</b> ₹${esc(p.amount)}<br><b>Reference:</b> ••••${esc(p.reference_id)}<br><b>Status:</b> Approved</p><p>You can now sign in to BCA Vault and access your purchased resources.</p>`)};
  if (type === "payment_rejected") return { subject: "BCA Vault Payment Requires Attention", html: shell("Payment requires attention", `<p>Hi ${name},</p><p>We could not approve your payment submission at this time.</p><p><b>Course:</b> ${esc(p.course)}<br><b>Semester:</b> ${esc(p.semester)}<br><b>Bundle:</b> ${esc(p.bundle_name)}<br><b>Reference:</b> ••••${esc(p.reference_id)}<br><b>Status:</b> Rejected</p>${p.admin_note ? `<p><b>Review note:</b> ${esc(p.admin_note)}</p>` : ""}<p>Please review your payment details in the BCA Vault dashboard and resubmit if required.</p>`)};
  if (type === "referral_reward_unlocked") return { subject: "🎁 Your BCA Vault Referral Reward Is Unlocked", html: shell("Your referral reward is unlocked 🎁", `<p>Hi ${name},</p><p>Your referral for <b>${esc(p.referred_student_name)}</b> has qualified after payment verification.</p><p>Your <b>Most Repeated Topics</b> reward is unlocked:</p><ul><li>Foundation of Computing</li><li>C Programming</li><li>HTML + CSS + JavaScript</li></ul><p>This reward does <b>not</b> grant full Semester 1 bundle access.</p>`)};
  throw new Error(`Unsupported email event type: ${type}`);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  if (!url || !serviceKey || !resendKey) return Response.json({ success: false, error: "Email worker secrets are not configured." }, { status: 500 });
  const body = await req.json().catch(() => ({}));
  const limit = Math.min(Math.max(Number(body.limit) || 10, 1), 50);
  const { data: jobs, error: claimError } = await admin.rpc("claim_email_outbox", { p_limit: limit });
  if (claimError) return Response.json({ success: false, error: claimError.message }, { status: 500 });
  const results = [];
  for (const job of jobs ?? []) {
    try {
      const mail = render(job.event_type, job.payload ?? {});
      const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json", "Idempotency-Key": job.event_key }, body: JSON.stringify({ from: `${fromName} <${fromAddress}>`, to: [job.recipient_email], subject: mail.subject, html: mail.html }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = typeof data?.message === "string" ? data.message : `Resend HTTP ${response.status}`;
        const terminal = job.attempt_count >= MAX_ATTEMPTS || (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429);
        await admin.from("email_delivery_log").insert({ outbox_id: job.id, user_id: job.recipient_user_id, recipient_email: job.recipient_email, event_type: job.event_type, provider: "resend", status: "failed", failed_at: new Date().toISOString(), error_message: message });
        await admin.from("email_outbox").update({ status: terminal ? "failed" : "pending", available_at: terminal ? new Date().toISOString() : retryAt(job.attempt_count), failed_at: terminal ? new Date().toISOString() : null, locked_at: null, last_error: message }).eq("id", job.id);
        results.push({ id: job.id, status: terminal ? "failed" : "retrying" });
        continue;
      }
      const providerId = data?.id ?? null;
      await admin.from("email_delivery_log").insert({ outbox_id: job.id, user_id: job.recipient_user_id, recipient_email: job.recipient_email, event_type: job.event_type, provider: "resend", provider_message_id: providerId, status: "sent", sent_at: new Date().toISOString() });
      await admin.from("email_outbox").update({ status: "sent", sent_at: new Date().toISOString(), locked_at: null, last_error: null, provider_message_id: providerId }).eq("id", job.id);
      results.push({ id: job.id, status: "sent", provider_message_id: providerId });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const terminal = job.attempt_count >= MAX_ATTEMPTS;
      await admin.from("email_delivery_log").insert({ outbox_id: job.id, user_id: job.recipient_user_id, recipient_email: job.recipient_email, event_type: job.event_type, provider: "resend", status: "failed", failed_at: new Date().toISOString(), error_message: message });
      await admin.from("email_outbox").update({ status: terminal ? "failed" : "pending", available_at: terminal ? new Date().toISOString() : retryAt(job.attempt_count), failed_at: terminal ? new Date().toISOString() : null, locked_at: null, last_error: message }).eq("id", job.id);
      results.push({ id: job.id, status: terminal ? "failed" : "retrying" });
    }
  }
  return Response.json({ success: true, claimed: jobs?.length ?? 0, results });
});
