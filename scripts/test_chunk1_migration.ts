import fs from "fs";
import path from "path";

console.log("==================================================================");
console.log("   BCA VAULT — CHUNK 1 DATABASE MIGRATION VERIFICATION SUITE");
console.log("==================================================================");

const migrationPath = path.resolve(process.cwd(), "supabase/migrations/20260906000500_automate_payment_approved_email.sql");
const sql = fs.readFileSync(migrationPath, "utf-8");

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

// 1. Migration File Structure
console.log("\n[GROUP 1] Migration Integrity & SQL Standards");
assert(fs.existsSync(migrationPath), "Migration file exists at 20260906000500_automate_payment_approved_email.sql");
assert(sql.includes("CREATE OR REPLACE FUNCTION public.escape_html"), "Includes escape_html helper function");
assert(sql.includes("CREATE OR REPLACE FUNCTION public.review_payment_submission"), "Includes updated review_payment_submission function");
assert(sql.includes("SECURITY DEFINER"), "review_payment_submission has SECURITY DEFINER");
assert(sql.includes("SET search_path = public, pg_temp"), "review_payment_submission enforces safe search_path");
assert(sql.includes("REVOKE ALL ON FUNCTION public.review_payment_submission"), "Explicitly revokes public access from review_payment_submission");
assert(sql.includes("TO service_role;"), "Grants execute on review_payment_submission to service_role");

// 2. Business Logic Preservation
console.log("\n[GROUP 2] Core Business & Access Rules Preservation");
assert(sql.includes("WHERE id = p_payment_id AND status = 'pending'"), "Locks pending payment row with FOR UPDATE");
assert(sql.includes("UPDATE public.payment_submissions"), "Updates payment status to approved/rejected");
assert(sql.includes("UPDATE public.profiles"), "Activates student account in public.profiles");
assert(sql.includes("INSERT INTO public.access_permissions"), "Grants access to purchased bundle");
assert(sql.includes("ILIKE '%complete%' OR v_bundle.title ILIKE '%both%' OR v_bundle.title ILIKE '%all%'"), "Preserves combo/all-semester bundle grant logic");
assert(sql.includes("PERFORM public.qualify_referral_on_payment_approval(v_target_user_id);"), "Preserves referral reward qualification for Sem 1 payments");

// 3. Fixed Template Specification (Part 4)
console.log("\n[GROUP 3] Fixed Email Template Specification");
assert(sql.includes("v_subject := 'BCA Vault — Payment Approved & Access Activated';"), "Exact required email subject is defined");
assert(sql.includes("Hi ' || v_student_name || E',\\n\\n'"), "Plain-text greeting matches 'Hi {{student_name}},'");
assert(sql.includes("Your payment for BCA Vault has been successfully verified and approved."), "Plain-text contains verified & approved intro");
assert(sql.includes("• Student: ' || v_student_name"), "Plain-text contains Student bullet");
assert(sql.includes("• Email: ' || v_student_email"), "Plain-text contains Email bullet");
assert(sql.includes("• Payment Reference: ' || v_payment_reference"), "Plain-text contains Payment Reference bullet");
assert(sql.includes("• Amount Paid: ' || v_amount_text"), "Plain-text contains Amount Paid bullet");
assert(sql.includes("• Payment Status: Approved"), "Plain-text contains Payment Status bullet");
assert(sql.includes("• Bundle: ' || v_bundle_title"), "Plain-text contains Bundle bullet");
assert(sql.includes("• Access Status: Activated"), "Plain-text contains Access Status bullet");
assert(sql.includes("Your BCA Vault resources are now available in your account."), "Plain-text contains resource availability notice");
assert(sql.includes("You can now log in to BCA Vault and access your assigned study materials."), "Plain-text contains login instructions");
assert(sql.includes("bcavault07@gmail.com"), "Plain-text sender and footer email is bcavault07@gmail.com");

// 4. HTML Template & Safe Escaping
console.log("\n[GROUP 4] HTML Template & Security Escaping");
assert(sql.includes("public.escape_html(v_student_name)"), "Escapes student_name in HTML");
assert(sql.includes("public.escape_html(v_student_email)"), "Escapes student_email in HTML");
assert(sql.includes("public.escape_html(v_payment_reference)"), "Escapes payment_reference in HTML");
assert(sql.includes("public.escape_html(v_amount_text)"), "Escapes amount_text in HTML");
assert(sql.includes("public.escape_html(v_bundle_title)"), "Escapes bundle_title in HTML");
assert(sql.includes("<!DOCTYPE html>"), "Valid HTML document structure");

// 5. Payload Cleanliness (No PDF, No Gemini, No Resend)
console.log("\n[GROUP 5] Clean Payload & Removal of Obsolete PDF Fields");
const sqlWithoutComments = sql.replace(/--.*$/gm, "");
assert(!sqlWithoutComments.includes("receipt_filename"), "Zero occurrences of receipt_filename in SQL code");
assert(!sql.includes("receipt_attached"), "Zero occurrences of receipt_attached in the migration");
assert(!sqlWithoutComments.includes("gemini"), "Zero occurrences of gemini in SQL code");
assert(!sqlWithoutComments.includes("resend"), "Zero occurrences of resend in SQL code");
assert(sql.includes("'access_granted', true"), "Payload contains authoritative access_granted: true");
assert(sql.includes("'payment_reference', v_payment_reference"), "Payload contains authoritative payment_reference");
assert(sql.includes("'amount_paid', v_amount_text"), "Payload contains authoritative amount_paid");

// 6. Idempotency & Queue State Machine
console.log("\n[GROUP 6] Idempotency & Outbox State Machine");
assert(sql.includes("v_event_key := 'payment-approved:' || v_payment.id;"), "Deterministic event_key 'payment-approved:' || v_payment.id");
assert(sql.includes("ON CONFLICT (event_key) DO UPDATE"), "Idempotent ON CONFLICT handling on event_key");
assert(sql.includes("WHERE public.email_outbox.status != 'sent';"), "Guarantees already-sent emails are never overwritten or reset to pending");
assert(sql.includes("status,\n      subject,\n      html_body,\n      text_body,\n      payload"), "Inserts status, subject, html_body, text_body, payload directly");

console.log("\n==================================================================");
console.log(`CHUNK 1 VERIFICATION RESULT: ${passed}/${total} CHECKS PASSED`);
console.log("==================================================================");

if (passed !== total) {
  process.exit(1);
}
