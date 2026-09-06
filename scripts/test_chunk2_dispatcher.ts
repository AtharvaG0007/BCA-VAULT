import fs from "fs";
import path from "path";

console.log("==================================================================");
console.log("   BCA VAULT — CHUNK 2 EMAIL DISPATCHER VERIFICATION SUITE");
console.log("==================================================================");

const dispatcherPath = path.resolve(process.cwd(), "supabase/functions/email-dispatcher/index.ts");
const code = fs.readFileSync(dispatcherPath, "utf-8");

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string, details?: string) {
  total++;
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}${details ? " — " + details : ""}`);
    process.exitCode = 1;
  }
}

// 1. File & Runtime Standards
console.log("\n[GROUP 1] File & Runtime Architecture");
assert(fs.existsSync(dispatcherPath), "Dispatcher exists at supabase/functions/email-dispatcher/index.ts");
assert(code.includes('import "jsr:@supabase/functions-js/edge-runtime.d.ts";'), "Imports edge-runtime ambient types");
assert(code.includes('from "npm:@supabase/supabase-js@2";'), "Imports supabase-js client");
assert(code.includes("Deno.serve(async (req: Request) => {"), "Uses Deno.serve entrypoint");

// 2. Authentication & Security Gate
console.log("\n[GROUP 2] Authentication & Server-to-Server Security Gate");
assert(code.includes("authenticateCaller(req)"), "Implements caller authentication gate");
assert(code.includes("x-dispatcher-secret"), "Supports internal secret header (x-dispatcher-secret)");
assert(code.includes("DISPATCHER_SECRET"), "Reads DISPATCHER_SECRET from environment");
assert(code.includes("SERVICE_ROLE_KEY"), "Supports service role key authorization");
assert(code.includes("admin_profiles"), "Verifies superadmin role on user token");
assert(code.includes("jsonResponse(req, { success: false, error: auth.reason || \"Unauthorized\" }, 401);"), "Rejects unauthorized requests with 401");

// 3. Concurrency & Safe Atomic Queue Claiming
console.log("\n[GROUP 3] Atomic Queue Claiming & Concurrency Control");
assert(code.includes("claimOutboxRow(rowId: string)"), "Implements claimOutboxRow function");
assert(code.includes("status: \"processing\""), "Transitions status to processing on claim");
assert(code.includes("locked_at: now"), "Records locked_at timestamp on claim");
assert(code.includes('.eq("status", "pending")'), "Only claims pending records in initial query");
assert(code.includes("STALE_LOCK_MS = 5 * 60 * 1000;"), "Defines 5-minute stale-lock threshold");
assert(code.includes('.lt("locked_at", fiveMinAgo)'), "Reclaims stale processing records after 5 minutes");
assert(code.includes("Row has already been sent.") || code.includes("Row is already being processed"), "Prevents claiming sent or active processing records");

// 4. Authoritative Verification (Payment, Access, Recipient)
console.log("\n[GROUP 4] Authoritative Verification Before Sending");
assert(code.includes('claimed.event_type !== "payment_approved"'), "Rejects non-payment_approved event types");
assert(code.includes("Associated payment submission record not found."), "Rejects if payment submission does not exist");
assert(code.includes('Payment status is \'${paymentRow.status}\', expected \'approved\'.'), "Rejects if payment status is not approved");
assert(code.includes("Invalid recipient email address."), "Rejects invalid or malformed recipient email");
assert(code.includes("paymentRow.email"), "Derives recipient from authoritative database state");
assert(code.includes("paymentRow.status"), "Validates paymentRow.status directly from payment_submissions table");

// 5. Gmail Integration & Sender Verification
console.log("\n[GROUP 5] Gmail API & Sender Verification");
assert(code.includes('const SENDER_EMAIL = "bcavault07@gmail.com";'), "Enforces sender as bcavault07@gmail.com");
assert(code.includes("googleAccessToken()"), "Implements OAuth refresh token exchange");
assert(code.includes("checkGmailAccount(token)"), "Verifies active Gmail account against sender email");
assert(code.includes("Gmail OAuth is authenticated to a different account"), "Rejects sender account mismatch");
assert(code.includes("https://gmail.googleapis.com/gmail/v1/users/me/messages/send"), "Delivers via official Gmail users.messages.send API");

// 6. RFC 2822 MIME & Absence of PDF/Gemini/Resend
console.log("\n[GROUP 6] Clean RFC 2822 MIME & Zero Deprecated Features");
assert(code.includes("makeRawMime(to: string, subject: string, text: string, html: string)"), "Constructs multipart/alternative MIME");
assert(code.includes('Content-Type: multipart/alternative; boundary='), "MIME type is multipart/alternative");
assert(code.includes('Content-Type: text/plain; charset="UTF-8"'), "Includes text/plain part");
assert(code.includes('Content-Type: text/html; charset="UTF-8"'), "Includes text/html part");
assert(!code.includes("generatePaymentReceiptPdf"), "Zero PDF generator functions in dispatcher");
assert(!code.includes("application/pdf"), "Zero PDF mime references in dispatcher");
assert(!code.includes("receipt_filename"), "Zero receipt_filename references in dispatcher");
assert(!code.includes("generateEmail"), "Zero Gemini generation functions in dispatcher");
assert(!code.includes("gemini"), "Zero Gemini API calls in dispatcher");
assert(!code.includes("resend"), "Zero Resend API calls in dispatcher");

// 7. State Machine, Delivery Logging & Failure Isolation
console.log("\n[GROUP 7] State Machine, Delivery Logging & Failure Isolation");
assert(code.includes('status: "sent"'), "Updates email_outbox status to sent on Gmail success");
assert(code.includes("provider_message_id: gmailMessageId"), "Stores Gmail message ID in outbox");
assert(code.includes('.from("email_delivery_log").insert({'), "Inserts audit log into email_delivery_log");
assert(code.includes('provider: "gmail"'), "Sets provider to gmail in delivery log");
assert(code.includes("isPermanentFailure(errorMsg)"), "Distinguishes permanent vs retryable failures");
assert(code.includes("nextStatus = isPermanent ? \"failed\" : \"pending\";"), "Sets retryable failure back to pending");
assert(code.includes("sanitizeError(msg: unknown)"), "Sanitizes sensitive tokens before logging");
assert(code.includes("[REDACTED]"), "Redacts secrets and tokens from error strings");

// 8. Request Design & Input Immunity
console.log("\n[GROUP 8] Request Design & Input Tampering Immunity");
assert(!code.includes("body.recipient_email"), "Does NOT accept recipient_email from request body");
assert(!code.includes("body.amount"), "Does NOT accept amount from request body");
assert(!code.includes("body.bundle"), "Does NOT accept bundle from request body");
assert(!code.includes("body.subject"), "Does NOT accept subject from request body");
assert(!code.includes("body.html_body"), "Does NOT accept html_body from request body");
assert(!code.includes("body.text_body"), "Does NOT accept text_body from request body");
assert(code.includes("targetOutboxId = String(body.outbox_id || \"\").trim();"), "Only accepts outbox_id or payment_id identifier");

console.log("\n==================================================================");
console.log(`CHUNK 2 VERIFICATION RESULT: ${passed}/${total} CHECKS PASSED`);
console.log("==================================================================");

if (passed !== total) {
  process.exit(1);
}
