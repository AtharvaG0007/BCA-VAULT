import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";
const GOOGLE_REFRESH_TOKEN = Deno.env.get("GOOGLE_REFRESH_TOKEN") ?? "";
const GOOGLE_REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI") ?? `${SUPABASE_URL}/functions/v1/email-admin/google/callback`;

const SENDER_EMAIL = "bcavault07@gmail.com";
const SENDER_NAME = "BCA Vault";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

function cors(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowed = origin.endsWith(".workers.dev") || origin.endsWith(".vercel.app") || origin.endsWith(".figma.site") || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "https://bca-vault.portalbcavault.workers.dev",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

function factsFor(eventType: string, p: Record<string, unknown>) {
  const student = esc(p.student_name ?? p.referrer_name ?? "Student");
  const course = esc(p.course ?? "BCA");
  const semester = esc(p.semester ?? "");
  const bundle = esc(p.bundle_name ?? "BCA Vault Bundle");
  const amount = esc(p.amount ?? "");
  const ref = esc(p.reference_id ? p.reference_id : (p.reference_last4 ? `••••${p.reference_last4}` : ""));
  const utr = esc(p.utr ?? "");
  const note = esc(p.admin_note ?? "");
  const approvedAt = esc(p.approved_at ? new Date(String(p.approved_at)).toLocaleDateString("en-IN") : "");

  if (eventType === "test_email") {
    return `Type: Operational Verification Test Email\nPlatform: BCA Vault\nSystem: Super Admin Email Console\nPurpose: Operational verification of Gmail API transactional delivery\nSender: ${SENDER_EMAIL}\nRecipient: ${esc(p.recipient_email ?? "Admin")}`;
  }
  if (eventType === "payment_approved") {
    return [
      `Recipient Email: ${esc(p.recipient_email ?? "")}`,
      `Student Name: ${student}`,
      `Course: ${course}`,
      `Semester: ${semester ? `Semester ${semester}` : "BCA"}`,
      `Bundle: ${bundle}`,
      `Amount Paid: ₹${amount}`,
      `Payment Reference: ${ref}`,
      utr ? `UTR / Transaction: ${utr}` : null,
      approvedAt ? `Approval Date: ${approvedAt}` : null,
      `Access Status: Active & Verified`,
      `Receipt: Official PDF Payment Receipt attached (BCA-Vault-Payment-Receipt-${ref || "BV"}.pdf)`
    ].filter(Boolean).join("\n");
  }
  if (eventType === "payment_rejected") return `Student: ${student}\nCourse: ${course}\nSemester: ${semester}\nBundle: ${bundle}\nReference: ${ref}\nStatus: Rejected\nReview note: ${note}`;
  if (eventType === "referral_reward_unlocked") return `Referrer: ${student}\nReferred student: ${esc(p.referred_student_name ?? "Student")}\nReward: Most Repeated Topics — Foundation of Computing, C Programming, HTML + CSS + JavaScript`;
  throw new Error(`Unsupported email event type: ${eventType}`);
}

async function generateEmail(eventType: string, payload: Record<string, unknown>) {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured.");
  const models = [
    "gemini-3.6-flash",
    "gemini-3.1-pro-preview",
    "gemini-3.0-pro",
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest"
  ];

  const isTest = eventType === "test_email";
  const prompt = isTest
    ? `You write professional transactional emails for BCA Vault, an Indian BCA study platform. Generate ONE concise, natural, professional test email from BCA Vault confirming that the BCA Vault email delivery system via Gmail API is operational. Do not invent facts, links, or promises. Return valid JSON only with keys subject, text, html. The subject must be: "BCA Vault — Gmail API Test Email". The html must be a clean, modern, complete email body with simple inline CSS styling, safe for Gmail. The text must be plain text.`
    : eventType === "payment_approved"
    ? `You write professional transactional emails for BCA Vault, an Indian BCA study platform.
You are writing an official payment approval and portal access activation email using VERIFIED PAYMENT FACTS.
CRITICAL RULES:
- Never alter, calculate, infer, or invent financial, student identity, course, or payment details.
- The database is the source of truth; preserve all supplied numbers and identifiers exactly.
- Use the student's verified name in the greeting.
- Confirm that their payment has been verified and their bundle access is activated on the platform.
- Clearly mention the bundle name, amount paid, and reference ID as provided in the facts.
- Explicitly inform the student that their official BCA Vault Payment Receipt is attached as a PDF.
- Tone: warm, encouraging, professional, and clear.
- Avoid saying the email was generated by AI.
- Return valid JSON only with keys: subject, text, html.
- Subject line must be clear and professional (e.g. "Payment Approved — BCA Vault Access Activated").
- The html must be a clean, modern email body with inline CSS styling suitable for Gmail.
- The text must be a clean plain text version.
\n\nVerified Facts:\n${factsFor(eventType, payload)}`
    : `You write professional transactional emails for BCA Vault, an Indian BCA study platform. Generate ONE concise, natural, human-sounding email. Do not invent facts, links, prices, dates, promises, or policies. Preserve all supplied facts. Tone: warm, professional, clear. Avoid saying the email was generated by AI. Return valid JSON only with keys subject, text, html. The html must be a complete email body fragment, not markdown, safe for Gmail, with simple inline styles. The text must be plain text.\n\nEvent: ${eventType}\nFacts:\n${factsFor(eventType, payload)}`;

  const errors: Record<string, string> = {};
  for (const model of models) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.35, responseMimeType: "application/json" },
          }),
        }
      );
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        errors[model] = d?.error?.message || `HTTP ${r.status}`;
        continue;
      }
      const raw = d?.candidates?.[0]?.content?.parts?.map((x: any) => x.text || "").join("") || "";
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, ""));
      }
      if (!parsed?.subject || !parsed?.text || !parsed?.html) {
        errors[model] = "Incomplete response";
        continue;
      }
      return {
        subject: String(parsed.subject).trim(),
        text_body: String(parsed.text).trim(),
        html_body: String(parsed.html).trim(),
      };
    } catch (e: any) {
      errors[model] = e?.message || String(e);
    }
  }
  throw new Error("Gemini generation failed: " + JSON.stringify(errors));
}

function escapePdfString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, ""); // Strip non-ASCII to prevent PDF rendering errors
}

export interface PaymentReceiptData {
  payment_id?: string;
  reference_id?: string;
  student_name?: string;
  recipient_email?: string;
  course?: string;
  semester?: string | number;
  bundle_name?: string;
  amount?: string | number;
  utr?: string;
  payment_status?: string;
  approved_at?: string;
  receipt_filename?: string;
}

function generatePaymentReceiptPdf(data: PaymentReceiptData): Uint8Array {
  const refId = String(data.reference_id || data.payment_id || "BV-REF");
  const student = String(data.student_name || "Student");
  const email = String(data.recipient_email || "N/A");
  const course = String(data.course || "BCA");
  const semester = data.semester ? `Semester ${data.semester}` : "N/A";
  const bundle = String(data.bundle_name || "BCA Vault Bundle");
  const amountStr = data.amount !== undefined && data.amount !== null ? `INR ${data.amount}` : "N/A";
  const utr = String(data.utr || "Verified via Portal");
  const status = String(data.payment_status || "APPROVED").toUpperCase();
  const approvedAt = data.approved_at
    ? new Date(data.approved_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })
    : new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
  const generatedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

  const W = 595.28;
  const H = 841.89;
  const stream: string[] = [];

  function fillRect(x: number, y: number, w: number, h: number, r: number, g: number, b: number) {
    stream.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
    stream.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
    stream.push("f");
  }

  function strokeRect(x: number, y: number, w: number, h: number, r: number, g: number, b: number, lineWidth = 1) {
    stream.push(`${lineWidth.toFixed(2)} w`);
    stream.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`);
    stream.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
    stream.push("S");
  }

  function drawLine(x1: number, y1: number, x2: number, y2: number, r: number, g: number, b: number, lineWidth = 1) {
    stream.push(`${lineWidth.toFixed(2)} w`);
    stream.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`);
    stream.push(`${x1.toFixed(2)} ${y1.toFixed(2)} m`);
    stream.push(`${x2.toFixed(2)} ${y2.toFixed(2)} l`);
    stream.push("S");
  }

  function drawText(text: string, x: number, y: number, font: "F1" | "F2", size: number, r: number, g: number, b: number) {
    const escaped = escapePdfString(text);
    stream.push("BT");
    stream.push(`/${font} ${size} Tf`);
    stream.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
    stream.push(`${x.toFixed(2)} ${y.toFixed(2)} Td`);
    stream.push(`(${escaped}) Tj`);
    stream.push("ET");
  }

  // Background
  fillRect(0, 0, W, H, 0.98, 0.98, 0.99);

  // Outer border
  strokeRect(20, 20, W - 40, H - 40, 0.88, 0.90, 0.93, 1.5);

  // Header Banner
  const headerH = 110;
  const headerY = H - 20 - headerH;
  fillRect(20, headerY, W - 40, headerH, 0.06, 0.09, 0.16);
  fillRect(20, headerY - 4, W - 40, 4, 0.06, 0.72, 0.50);

  drawText("BCA VAULT", 45, H - 65, "F2", 24, 1, 1, 1);
  drawText("OFFICIAL PAYMENT RECEIPT", 45, H - 90, "F2", 12, 0.06, 0.72, 0.50);
  drawText("Student Resource Portal  *  Verified Access Token", 45, H - 110, "F1", 9, 0.75, 0.80, 0.88);

  fillRect(W - 170, H - 85, 125, 30, 0.06, 0.72, 0.50);
  drawText("PAYMENT VERIFIED", W - 160, H - 72, "F2", 10, 1, 1, 1);

  // Reference Box
  const refBoxY = headerY - 55;
  fillRect(40, refBoxY, W - 80, 40, 0.93, 0.95, 0.98);
  strokeRect(40, refBoxY, W - 80, 40, 0.80, 0.85, 0.92, 1);
  drawText("RECEIPT / PAYMENT REFERENCE:", 55, refBoxY + 24, "F2", 9, 0.35, 0.40, 0.48);
  drawText(refId, 55, refBoxY + 9, "F2", 12, 0.06, 0.09, 0.16);

  drawText("STATUS:", W - 180, refBoxY + 24, "F2", 9, 0.35, 0.40, 0.48);
  drawText(status, W - 180, refBoxY + 9, "F2", 12, 0.06, 0.60, 0.40);

  // Details Card
  const cardY = 320;
  const cardH = 340;
  fillRect(40, cardY, W - 80, cardH, 1, 1, 1);
  strokeRect(40, cardY, W - 80, cardH, 0.85, 0.88, 0.92, 1);

  fillRect(40, cardY + cardH - 35, W - 80, 35, 0.96, 0.97, 0.99);
  drawLine(40, cardY + cardH - 35, W - 40, cardY + cardH - 35, 0.85, 0.88, 0.92, 1);
  drawText("PAYMENT & ENROLLMENT DETAILS", 55, cardY + cardH - 23, "F2", 11, 0.15, 0.20, 0.30);

  const rows = [
    { label: "Student Full Name", value: student },
    { label: "Registered Email", value: email },
    { label: "Course / Degree", value: course },
    { label: "Academic Semester", value: semester },
    { label: "Bundle Enrolled", value: bundle },
    { label: "Transaction / UTR No.", value: utr },
    { label: "Payment Approved At", value: approvedAt },
    { label: "Receipt Generated At", value: generatedAt }
  ];

  let currentY = cardY + cardH - 65;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (i % 2 === 1) {
      fillRect(42, currentY - 6, W - 84, 26, 0.98, 0.985, 0.995);
    }
    drawText(row.label, 55, currentY + 3, "F1", 10, 0.40, 0.45, 0.52);
    drawText(row.value, 230, currentY + 3, "F2", 10, 0.10, 0.14, 0.22);
    drawLine(45, currentY - 6, W - 45, currentY - 6, 0.92, 0.93, 0.95, 0.5);
    currentY -= 32;
  }

  // Amount Box
  const amountBoxY = 210;
  const amountBoxH = 80;
  fillRect(40, amountBoxY, W - 80, amountBoxH, 0.95, 0.98, 0.96);
  strokeRect(40, amountBoxY, W - 80, amountBoxH, 0.70, 0.88, 0.78, 1.5);

  drawText("TOTAL AMOUNT PAID", 55, amountBoxY + 50, "F2", 11, 0.15, 0.45, 0.28);
  drawText("Full Access Granted * One-Time Payment", 55, amountBoxY + 30, "F1", 9, 0.35, 0.50, 0.40);
  drawText(amountStr, W - 200, amountBoxY + 34, "F2", 22, 0.05, 0.55, 0.32);

  // Footer
  const footerY = 70;
  drawLine(40, footerY + 90, W - 40, footerY + 90, 0.85, 0.88, 0.92, 1);

  drawText("AUTHENTICITY & VERIFICATION GUARANTEE", 55, footerY + 70, "F2", 9, 0.20, 0.25, 0.35);
  drawText("This is an official system-generated payment receipt issued by BCA Vault.", 55, footerY + 54, "F1", 8.5, 0.45, 0.50, 0.58);
  drawText("All access permissions associated with this reference ID have been cryptographically verified and granted.", 55, footerY + 41, "F1", 8.5, 0.45, 0.50, 0.58);
  drawText("No physical signature is required. For inquiries, reach out to bcavault07@gmail.com.", 55, footerY + 28, "F1", 8.5, 0.45, 0.50, 0.58);

  fillRect(20, 20, W - 40, 25, 0.06, 0.09, 0.16);
  drawText("BCA Vault  *  Empowering BCA Excellence", 35, 29, "F1", 8, 0.70, 0.75, 0.85);
  drawText("https://bca-vault.portalbcavault.workers.dev", W - 210, 29, "F2", 8, 0.06, 0.72, 0.50);

  const contentStream = stream.join("\n");
  const encoder = new TextEncoder();
  const contentBytes = encoder.encode(contentStream);
  const contentLen = contentBytes.length;

  const objects: string[] = [];
  objects[1] = `1 0 obj\n<<\n  /Type /Catalog\n  /Pages 2 0 R\n>>\nendobj`;
  objects[2] = `2 0 obj\n<<\n  /Type /Pages\n  /Kids [3 0 R]\n  /Count 1\n>>\nendobj`;
  objects[3] = `3 0 obj\n<<\n  /Type /Page\n  /Parent 2 0 R\n  /MediaBox [0 0 ${W.toFixed(2)} ${H.toFixed(2)}]\n  /Resources <<\n    /Font <<\n      /F1 4 0 R\n      /F2 5 0 R\n    >>\n  >>\n  /Contents 6 0 R\n>>\nendobj`;
  objects[4] = `4 0 obj\n<<\n  /Type /Font\n  /Subtype /Type1\n  /BaseFont /Helvetica\n  /Encoding /WinAnsiEncoding\n>>\nendobj`;
  objects[5] = `5 0 obj\n<<\n  /Type /Font\n  /Subtype /Type1\n  /BaseFont /Helvetica-Bold\n  /Encoding /WinAnsiEncoding\n>>\nendobj`;
  objects[6] = `6 0 obj\n<<\n  /Length ${contentLen}\n>>\nstream\n${contentStream}\nendstream\nendobj`;

  let out = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [];
  for (let i = 1; i <= 6; i++) {
    offsets[i] = encoder.encode(out).length;
    out += objects[i] + "\n";
  }

  const xrefOffset = encoder.encode(out).length;
  out += "xref\n0 7\n";
  out += "0000000000 65535 f \n";
  for (let i = 1; i <= 6; i++) {
    const offStr = String(offsets[i]).padStart(10, "0");
    out += `${offStr} 00000 n \n`;
  }

  out += `trailer\n<<\n  /Size 7\n  /Root 1 0 R\n>>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return encoder.encode(out);
}

function base64url(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
  }
  return btoa(binary);
}

function mimeHeader(v: string) {
  return `=?UTF-8?B?${btoa(unescape(encodeURIComponent(v)))}?=`;
}

interface EmailAttachment {
  filename: string;
  mimeType: string;
  contentBytes: Uint8Array;
}

function makeRaw(
  fromEmail: string,
  subject: string,
  text: string,
  html: string,
  to: string,
  attachment?: EmailAttachment
) {
  if (!attachment) {
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

  const mixedBoundary = `bca_mixed_${crypto.randomUUID().replaceAll("-", "")}`;
  const altBoundary = `bca_alt_${crypto.randomUUID().replaceAll("-", "")}`;

  const cleanFilename = attachment.filename.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const attachmentBase64 = toBase64(attachment.contentBytes);
  const formattedAttachment = attachmentBase64.replace(/(.{76})/g, "$1\r\n");

  const body = [
    `From: ${SENDER_NAME} <${fromEmail}>`,
    `To: ${to}`,
    `Subject: ${mimeHeader(subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    ``,
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    ``,
    `--${altBoundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    text,
    ``,
    `--${altBoundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    html,
    ``,
    `--${altBoundary}--`,
    ``,
    `--${mixedBoundary}`,
    `Content-Type: ${attachment.mimeType}; name="${cleanFilename}"`,
    `Content-Description: ${cleanFilename}`,
    `Content-Disposition: attachment; filename="${cleanFilename}"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    formattedAttachment,
    ``,
    `--${mixedBoundary}--`
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
        const draft = await generateEmail(job.event_type, job.payload ?? { recipient_email: job.recipient_email });
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
        const draft = await generateEmail(eventType, body.payload ?? { recipient_email: recipientEmail });
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

      let attachment: EmailAttachment | undefined = undefined;

      // Server-side validation and PDF receipt generation for payment_approved emails
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

          // Use verified database values for the receipt
          payload.amount = paymentRow.amount;
          payload.reference_id = paymentRow.reference_id;
          payload.payment_status = paymentRow.status;
          if (paymentRow.approved_at) payload.approved_at = paymentRow.approved_at;
          if (paymentRow.utr) payload.utr = paymentRow.utr;
        }

        const ref = payload.reference_id || `BV-${claimed.id.slice(0, 8).toUpperCase()}`;
        const filename = payload.receipt_filename || `BCA-Vault-Payment-Receipt-${ref}.pdf`;
        const cleanFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, "_");

        try {
          const pdfBytes = generatePaymentReceiptPdf({
            payment_id: paymentId,
            reference_id: ref,
            student_name: payload.student_name,
            recipient_email: claimed.recipient_email,
            course: payload.course || "BCA",
            semester: payload.semester,
            bundle_name: payload.bundle_name,
            amount: payload.amount,
            utr: payload.utr,
            payment_status: "APPROVED",
            approved_at: payload.approved_at || claimed.created_at,
            receipt_filename: cleanFilename
          });

          attachment = {
            filename: cleanFilename,
            mimeType: "application/pdf",
            contentBytes: pdfBytes
          };
        } catch (pdfErr: any) {
          const msg = `PDF receipt generation failed: ${pdfErr?.message || String(pdfErr)}`;
          await admin.from("email_outbox").update({ status: "pending", locked_at: null, last_error: msg }).eq("id", id);
          return json(req, { success: false, error: msg }, 500);
        }
      }

      try {
        const token = await googleAccessToken();
        const account = await checkGmailAccount(token);
        if (account && account.toLowerCase() !== SENDER_EMAIL.toLowerCase()) {
          throw new Error(`Gmail OAuth is authenticated to a different account (${account}). Please authorize ${SENDER_EMAIL}.`);
        }

        const raw = makeRaw(SENDER_EMAIL, claimed.subject, claimed.text_body, claimed.html_body, claimed.recipient_email, attachment);
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

        const updatedPayload = {
          ...(claimed.payload && typeof claimed.payload === "object" ? claimed.payload : {}),
          ...(attachment ? {
            receipt_attached: true,
            receipt_filename: attachment.filename,
            receipt_generated_at: now
          } : {})
        };

        const { data: sentRow } = await admin.from("email_outbox").update({
          status: "sent",
          sent_at: now,
          locked_at: null,
          last_error: null,
          provider_message_id: d.id,
          payload: updatedPayload
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
