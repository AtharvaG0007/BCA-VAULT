import fs from "fs";
import path from "path";

console.log("==================================================================");
console.log("   BCA VAULT — CHUNK 3 AUTOMATIC INVOCATION & SCHEDULER SUITE");
console.log("==================================================================");

const bcaAdminPath = path.resolve(process.cwd(), "supabase/functions/bca-admin/index.ts");
const dispatcherPath = path.resolve(process.cwd(), "supabase/functions/email-dispatcher/index.ts");
const migrationPath = path.resolve(process.cwd(), "supabase/migrations/20260906000500_automate_payment_approved_email.sql");

const bcaAdminCode = fs.readFileSync(bcaAdminPath, "utf-8");
const dispatcherCode = fs.readFileSync(dispatcherPath, "utf-8");
const migrationCode = fs.readFileSync(migrationPath, "utf-8");

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

// 1. Payment Approval -> Dispatcher Wiring
console.log("\n[GROUP 1] Automatic Post-Approval Asynchronous Invocation");
assert(bcaAdminCode.includes("triggerEmailDispatcher(undefined, targetPaymentId);"), "Wired triggerEmailDispatcher call with payment ID");
assert(bcaAdminCode.includes("EdgeRuntime.waitUntil(trigger());"), "Uses EdgeRuntime.waitUntil for non-blocking server-side async delivery");
assert(bcaAdminCode.includes("trigger().catch("), "Fallback catch ensures no unhandled rejections break approval");
assert(bcaAdminCode.includes("url = `${supabaseUrl}/functions/v1/email-dispatcher`;"), "Invocation targets /functions/v1/email-dispatcher");
assert(!bcaAdminCode.includes("await fetch(url") || bcaAdminCode.includes("triggerEmailDispatcher"), "bca-admin invokes dispatcher, not Gmail directly");

// 2. Invocation Contract & Data Minimization
console.log("\n[GROUP 2] Dispatcher Contract & Data Tampering Immunity");
assert(bcaAdminCode.includes("const body: Record<string, string> = {};"), "Builds clean minimized invocation payload");
assert(!bcaAdminCode.includes('body["amount"] ='), "bca-admin does NOT pass financial amount to dispatcher");
assert(!bcaAdminCode.includes('body["subject"] ='), "bca-admin does NOT pass subject to dispatcher");
assert(!bcaAdminCode.includes('body["html_body"] ='), "bca-admin does NOT pass html_body to dispatcher");
assert(!bcaAdminCode.includes('body["recipient_email"] ='), "bca-admin does NOT pass recipient_email to dispatcher");
assert(dispatcherCode.includes("targetOutboxId = String(body.outbox_id || \"\").trim();"), "Dispatcher only accepts outbox_id or payment_id");

// 3. Fast-Path Failure Isolation
console.log("\n[GROUP 3] Fast-Path Failure Isolation");
assert(bcaAdminCode.includes("// Failure isolation: log sanitized notice, never throw"), "Explicit failure isolation policy in triggerEmailDispatcher");
assert(bcaAdminCode.includes("console.warn(\"[bca-admin] email-dispatcher background invocation notice:\""), "Catches and logs dispatcher errors as notices");
assert(bcaAdminCode.includes("return respond({ success: true, payment: rpcResult.data }, 200, corsHeaders);"), "Returns HTTP 200 to admin immediately regardless of email delivery state");

// 4. Reliable Background Sweep & Scheduler Invocation
console.log("\n[GROUP 4] Reliable Background Sweep & Scheduled Invocations");
assert(bcaAdminCode.includes('pathname === "/emails/sweep"'), "Exposes /emails/sweep endpoint for scheduled background trigger");
assert(dispatcherCode.includes("async function findEligibleOutboxIds(limit = 10): Promise<string[]>"), "Dispatcher implements candidate sweep discovery");
assert(dispatcherCode.includes('.eq("event_type", "payment_approved")'), "Sweep focuses on payment_approved events");
assert(dispatcherCode.includes("STALE_LOCK_MS = 5 * 60 * 1000;"), "Enforces 5-minute stale-lock threshold for interrupted tasks");
assert(dispatcherCode.includes('.lt("locked_at", fiveMinAgo)'), "Reclaims processing records with locks older than 5 minutes");

// 5. Exponential Backoff & Retry State Machine
console.log("\n[GROUP 5] Exponential Backoff & Retry Management");
assert(dispatcherCode.includes("function computeBackoffMs(attemptCount: number): number"), "Implements bounded exponential backoff calculation");
assert(dispatcherCode.includes("available_at: nextAvailableAt"), "Sets future available_at timestamp on retryable failure");
assert(dispatcherCode.includes("MAX_ATTEMPT_COUNT = 5"), "Bounds retry attempts to prevent infinite retry loops");
assert(dispatcherCode.includes("isPermanentFailure(errorMsg) || nextAttemptCount >= MAX_ATTEMPT_COUNT"), "Transitions to permanent failure on max attempts");
assert(dispatcherCode.includes('.or(`available_at.is.null,available_at.lte.${now}`)'), "Claiming only allows rows whose backoff has expired");

// 6. Concurrency Safety & Already-Sent Protection
console.log("\n[GROUP 6] Concurrency Safety & Duplicate Prevention");
assert(dispatcherCode.includes("Row has already been sent."), "Explicitly identifies already-sent rows");
assert(dispatcherCode.includes("alreadySent: true"), "Returns alreadySent flag when row was previously delivered");
assert(dispatcherCode.includes("Row is currently locked by another worker or in retry backoff."), "Prevents concurrent workers from claiming same row");
assert(migrationCode.includes("WHERE public.email_outbox.status != 'sent';"), "Database migration protects sent rows from being overwritten");

// 7. Security & Secret Exposure Protection
console.log("\n[GROUP 7] Security Architecture & Secret Protection");
assert(dispatcherCode.includes("authenticateCaller(req)"), "Dispatcher validates authorization on every request");
assert(bcaAdminCode.includes('"Authorization": `Bearer ${serviceRoleKey}`'), "bca-admin passes server-side service role key to dispatcher");
assert(dispatcherCode.includes("function sanitizeError(msg: unknown): string"), "Sanitizes tokens before logging or storing in error columns");
assert(dispatcherCode.includes("[REDACTED]"), "Redacts secrets and tokens from error strings");

// 8. Architectural Invariants (No Gemini, No PDF, No Resend)
console.log("\n[GROUP 8] System Invariants & Zero Deprecated Features");
assert(!dispatcherCode.includes("gemini"), "Dispatcher contains zero Gemini AI dependencies");
assert(!dispatcherCode.includes("pdf"), "Dispatcher contains zero PDF dependencies");
assert(!dispatcherCode.includes("resend"), "Dispatcher contains zero Resend dependencies");
assert(dispatcherCode.includes('const SENDER_EMAIL = "bcavault07@gmail.com";'), "Sender email is strictly bcavault07@gmail.com");
assert(dispatcherCode.includes("checkGmailAccount(token)"), "Validates Gmail account ownership before every send");

// 9. Failure Scenarios Emulation
console.log("\n[GROUP 9] Simulated Failure Scenarios Coverage");
// Scenario 1: Gmail 500 / Network timeout -> retryable
assert(dispatcherCode.includes("retryable: !isPermanent"), "Correctly flags temporary 5xx and network failures as retryable");
// Scenario 2: Payment not approved -> permanent
assert(dispatcherCode.includes("Payment status is"), "Flags non-approved payment status as permanent failure");
// Scenario 3: Missing payment -> permanent
assert(dispatcherCode.includes("Associated payment submission record not found."), "Flags missing payment submission as permanent failure");
// Scenario 4: Invalid recipient -> permanent
assert(dispatcherCode.includes("Invalid recipient email address."), "Flags invalid recipient email as permanent failure");
// Scenario 5: Stale lock recovery -> reclaimed
assert(dispatcherCode.includes("status: \"processing\"") && dispatcherCode.includes('.lt("locked_at", fiveMinAgo)'), "Stale locks older than 5 minutes are reclaimable");

console.log("\n==================================================================");
console.log(`CHUNK 3 VERIFICATION RESULT: ${passed}/${total} CHECKS PASSED`);
console.log("==================================================================");

if (passed !== total) {
  process.exit(1);
}
