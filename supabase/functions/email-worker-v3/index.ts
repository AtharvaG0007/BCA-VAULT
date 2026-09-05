import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_NAME = Deno.env.get("EMAIL_FROM_NAME") ?? "BCA Vault";
const FROM_ADDRESS = Deno.env.get("EMAIL_FROM_ADDRESS") ?? "no-reply@mail.bcavault.in";
const MAX_ATTEMPTS = 5;

function e(v: unknown) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function render(t: string, p: Record<string, unknown>) {
  const n = e(p.student_name ?? p.referrer_name ?? "Student");
  const c = e(p.course ?? "BCA");
  const s = e(p.semester ?? "");
  const b = e(p.bundle_name ?? "BCA Vault Bundle");
  const a = e(p.amount ?? "");
  const r = e(p.reference_last4 ? `••••${p.reference_last4}` : "");
  const note = e(p.admin_note ?? "");

  const sh = (x: string, y: string) =>
    `<!doctype html><html><body style="margin:0;background:#f6f7fb;font-family:Arial,sans-serif;color:#172033"><div style="max-width:620px;margin:32px auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden"><div style="padding:24px 28px;border-bottom:1px solid #eee"><strong style="font-size:22px">BCA Vault</strong></div><div style="padding:28px"><h1>${x}</h1>${y}<p style="margin-top:28px;color:#667085;font-size:13px">This is an automated transactional email from BCA Vault.</p></div></div></body></html>`;

  if (t === "payment_approved") {
    return {
      subject: "🎉 Your BCA Vault Payment Is Confirmed",
      html: sh(
        "Payment confirmed 🎉",
        `<p>Hi ${n},</p><p>Your payment has been successfully verified. Your purchased learning access is now active.</p><p><b>Course:</b> ${c}<br><b>Semester:</b> ${s}<br><b>Bundle:</b> ${b}<br><b>Amount:</b> ₹${a}<br><b>Reference:</b> ${r}<br><b>Status:</b> Approved</p>`
      ),
    };
  }

  if (t === "payment_rejected") {
    return {
      subject: "BCA Vault Payment Requires Attention",
      html: sh(
        "Payment requires attention",
        `<p>Hi ${n},</p><p>We could not approve your payment submission at this time.</p><p><b>Course:</b> ${c}<br><b>Semester:</b> ${s}<br><b>Bundle:</b> ${b}<br><b>Reference:</b> ${r}<br><b>Status:</b> Rejected</p>${note ? `<p><b>Review note:</b> ${note}</p>` : ""}`
      ),
    };
  }

  if (t === "referral_reward_unlocked") {
    const q = e(p.referred_student_name ?? "your referred student");
    return {
      subject: "🎁 Your BCA Vault Referral Reward Is Unlocked",
      html: sh(
        "Your referral reward is unlocked 🎁",
        `<p>Hi ${n},</p><p>Your referral for <b>${q}</b> has successfully qualified after payment verification.</p><p>Your reward is now unlocked: <b>Most Repeated Topics</b>.</p><ul><li>Foundation of Computing</li><li>C Programming</li><li>HTML + CSS + JavaScript</li></ul>`
      ),
    };
  }

  throw new Error(`Unsupported email event type: ${t}`);
}

function retry(x: number) {
  return new Date(Date.now() + [1, 5, 15, 60][Math.min(Math.max(x - 1, 0), 3)] * 60000).toISOString();
}

export default {
  fetch: withSupabase({ auth: "secret" }, async (req, ctx) => {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    if (!RESEND_API_KEY) return Response.json({ success: false, error: "RESEND_API_KEY is not configured." }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body.limit) || 10, 1), 50);
    const admin = ctx.supabaseAdmin;

    const { data: jobs, error } = await admin.rpc("claim_email_outbox", { p_limit: limit });
    if (error) return Response.json({ success: false, error: error.message }, { status: 500 });

    const results = [];
    for (const j of jobs ?? []) {
      try {
        const x = render(j.event_type, j.payload ?? {});
        const rr = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
            "Idempotency-Key": j.event_key,
          },
          body: JSON.stringify({
            from: `${FROM_NAME} <${FROM_ADDRESS}>`,
            to: [j.recipient_email],
            subject: x.subject,
            html: x.html,
          }),
        });

        const d = await rr.json().catch(() => ({}));
        if (!rr.ok) {
          const m = typeof d?.message === "string" ? d.message : `Resend HTTP ${rr.status}`;
          const terminal =
            j.attempt_count >= MAX_ATTEMPTS ||
            (rr.status >= 400 && rr.status < 500 && rr.status !== 408 && rr.status !== 429);

          await admin.from("email_delivery_log").insert({
            outbox_id: j.id,
            user_id: j.recipient_user_id,
            recipient_email: j.recipient_email,
            event_type: j.event_type,
            provider: "resend",
            status: "failed",
            failed_at: new Date().toISOString(),
            error_message: m,
          });

          await admin.from("email_outbox").update({
            status: terminal ? "failed" : "pending",
            available_at: terminal ? new Date().toISOString() : retry(j.attempt_count),
            failed_at: terminal ? new Date().toISOString() : null,
            locked_at: null,
            last_error: m,
          }).eq("id", j.id);

          results.push({ id: j.id, status: terminal ? "failed" : "retrying" });
          continue;
        }

        const id = d?.id ?? null;
        await admin.from("email_delivery_log").insert({
          outbox_id: j.id,
          user_id: j.recipient_user_id,
          recipient_email: j.recipient_email,
          event_type: j.event_type,
          provider: "resend",
          provider_message_id: id,
          status: "sent",
          sent_at: new Date().toISOString(),
        });

        await admin.from("email_outbox").update({
          status: "sent",
          sent_at: new Date().toISOString(),
          locked_at: null,
          last_error: null,
          provider_message_id: id,
        }).eq("id", j.id);

        results.push({ id: j.id, status: "sent", provider_message_id: id });
      } catch (err) {
        const m = err instanceof Error ? err.message : String(err);
        const terminal = j.attempt_count >= MAX_ATTEMPTS;

        await admin.from("email_delivery_log").insert({
          outbox_id: j.id,
          user_id: j.recipient_user_id,
          recipient_email: j.recipient_email,
          event_type: j.event_type,
          provider: "resend",
          status: "failed",
          failed_at: new Date().toISOString(),
          error_message: m,
        });

        await admin.from("email_outbox").update({
          status: terminal ? "failed" : "pending",
          available_at: terminal ? new Date().toISOString() : retry(j.attempt_count),
          failed_at: terminal ? new Date().toISOString() : null,
          locked_at: null,
          last_error: m,
        }).eq("id", j.id);

        results.push({ id: j.id, status: terminal ? "failed" : "retrying" });
      }
    }

    return Response.json({ success: true, claimed: jobs?.length ?? 0, results });
  }),
};