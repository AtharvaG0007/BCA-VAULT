import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// 1. Read environment variables from .env
const envPath = path.resolve(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const val = match[2].trim().replace(/^["']|["']$/g, "");
    env[key] = val;
  }
});

const supabaseUrl = env["SUPABASE_URL"] || "https://dmxegktlxqsxaysqwswa.supabase.co";
const anonKey = env["VITE_SUPABASE_PUBLISHABLE_KEY"] || "";
const secretKey = env["SUPABASE_SECRET_KEY"] || "";

async function runSecurityTests() {
  console.log("==================================================================");
  console.log("   BCA VAULT — PROTECTED PDF SECURITY & AUTHORIZATION TEST SUITE");
  console.log("==================================================================");

  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const studentClient = createClient(supabaseUrl, anonKey);

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  [PASS] ${testName}`);
    } else {
      console.error(`  [FAIL] ${testName}${detail ? ` -> ${detail}` : ""}`);
    }
  }

  // ── TEST 1: Unauthenticated request rejection ─────────────────────────────
  console.log("\n[TEST 1] Unauthenticated Request Rejection");
  try {
    const res1 = await fetch(`${supabaseUrl}/functions/v1/student-note-signed-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: anonKey },
      body: JSON.stringify({ noteId: "any-note-id" }),
    });
    assert(res1.status === 401, "Rejects request with no authorization header (HTTP 401)");
  } catch (err: any) {
    assert(false, "Rejects request with no authorization header", err.message);
  }

  // ── TEST 2: Invalid/Forged JWT Token rejection ───────────────────────────
  console.log("\n[TEST 2] Invalid/Forged Bearer Token Rejection");
  try {
    const res2 = await fetch(`${supabaseUrl}/functions/v1/student-note-signed-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: "Bearer invalid.forged.jwt_signature_here",
      },
      body: JSON.stringify({ noteId: "any-note-id" }),
    });
    assert(res2.status === 401, "Rejects forged bearer token (HTTP 401)");
  } catch (err: any) {
    assert(false, "Rejects forged bearer token", err.message);
  }

  // ── TEST 3: Authenticate valid student session ────────────────────────────
  console.log("\n[TEST 3] Student Authentication & Profile Check");
  let studentToken = "";
  let studentUserId = "";
  try {
    // Find student with active bundle permissions
    const { data: activePerms } = await adminClient
      .from("access_permissions")
      .select("user_id, bundle_id")
      .eq("status", "active")
      .limit(1);

    let testStudent: any = null;
    if (activePerms && activePerms.length > 0) {
      const { data: p } = await adminClient
        .from("profiles")
        .select("user_id, email, full_name, status")
        .eq("user_id", activePerms[0].user_id)
        .maybeSingle();
      testStudent = p;
    }

    if (!testStudent) {
      const { data: fallbackProfiles } = await adminClient
        .from("profiles")
        .select("user_id, email, full_name, status")
        .eq("status", "active")
        .limit(1);
      testStudent = fallbackProfiles?.[0];
    }

    if (!testStudent) {
      throw new Error("No active student profile found to test with");
    }

    studentUserId = testStudent.user_id;

    // Generate magic link token for session
    const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: testStudent.email,
    });
    if (linkErr || !linkData.properties?.hashed_token) {
      throw new Error(`Failed to generate test magic link: ${linkErr?.message}`);
    }

    const { data: sessionData, error: otpErr } = await studentClient.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    });
    if (otpErr || !sessionData.session?.access_token) {
      throw new Error(`Failed to verify session: ${otpErr?.message}`);
    }

    studentToken = sessionData.session.access_token;
    assert(true, `Authenticated test student: ${testStudent.email} (${studentUserId.slice(0, 8)}...)`);
  } catch (err: any) {
    assert(false, "Student authentication", err.message);
  }

  // ── TEST 4: Non-existent note returns 404 ────────────────────────────────
  console.log("\n[TEST 4] Non-Existent Note Rejection");
  if (studentToken) {
    try {
      const res4 = await fetch(`${supabaseUrl}/functions/v1/student-note-signed-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({ noteId: "00000000-0000-0000-0000-000000000000" }),
      });
      assert(res4.status === 404, "Returns 404 for non-existent note ID");
    } catch (err: any) {
      assert(false, "Returns 404 for non-existent note ID", err.message);
    }
  }

  // ── TEST 5: Authorized Student Note Access & Short-Lived TTL ─────────────
  console.log("\n[TEST 5] Authorized Access & Dynamic Watermark Generation");
  let testNote: any = null;
  let testSignedUrl = "";
  if (studentToken) {
    try {
      // 1. Query notes visible to the student via RLS
      const { data: studentNotes } = await studentClient
        .from("notes")
        .select("id, title, storage_bucket, storage_path, published, bundle_id, is_protected");

      if (studentNotes && studentNotes.length > 0) {
        testNote = studentNotes[0];
      } else {
        // Fallback: pick any published note and grant access permission for the test
        const { data: anyNotes } = await adminClient
          .from("notes")
          .select("id, title, storage_bucket, storage_path, published, bundle_id, is_protected")
          .eq("published", true)
          .limit(1);

        if (anyNotes && anyNotes.length > 0) {
          testNote = anyNotes[0];
          // Ensure student has access permission to this note's bundle
          await adminClient.from("access_permissions").upsert({
            user_id: studentUserId,
            bundle_id: testNote.bundle_id,
            status: "active",
          });
        }
      }

      if (testNote) {
        console.log(`  Target test note: "${testNote.title}" (${testNote.storage_path})`);

        const res5 = await fetch(`${supabaseUrl}/functions/v1/student-note-signed-url`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
            Authorization: `Bearer ${studentToken}`,
          },
          body: JSON.stringify({ noteId: testNote.id }),
        });

        const json5 = await res5.json();
        assert(res5.status === 200 && json5.success === true, "Authorized access granted (HTTP 200)");
        assert(typeof json5.signedUrl === "string" && json5.signedUrl.includes("token="), "Signed URL generated with token parameter");
        assert(json5.expiresIn <= 180, `Short-lived expiration enforced (expiresIn: ${json5.expiresIn}s <= 180s)`);
        assert(
          !!json5.watermark &&
            !!json5.watermark.studentName &&
            !!json5.watermark.studentEmail &&
            !!json5.watermark.studentId,
          "Watermark payload securely provided with student identity"
        );
        testSignedUrl = json5.signedUrl;
      } else {
        console.log("  [INFO] No notes found linked to student bundles. Checking any published note...");
      }
    } catch (err: any) {
      assert(false, "Authorized note access", err.message);
    }
  }

  // ── TEST 6: Verify Private Storage Bucket Hardening ───────────────────────
  console.log("\n[TEST 6] Storage Bucket Hardening (No Public Access)");
  try {
    // Attempt direct public unauthenticated download from bca-notes
    const samplePath = testNote?.storage_path || "BCA SEM1/C_Programming_Complete_Notes.pdf";
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/bca-notes/${samplePath}`;
    const publicRes = await fetch(publicUrl);

    // Private buckets return 400 ({"statusCode":"400","error":"Error","message":"Bucket is not public"}) or 404
    const isBlocked = publicRes.status === 400 || publicRes.status === 404 || publicRes.status === 403;
    assert(
      isBlocked,
      `Direct public URL is blocked on private bucket (status: ${publicRes.status})`
    );
  } catch (err: any) {
    assert(false, "Private storage bucket verification", err.message);
  }

  // ── TEST 7: Verify Short-Lived Signed URL Streams Document ────────────────
  console.log("\n[TEST 7] Signed URL Validity & Content Streaming");
  if (testSignedUrl) {
    try {
      const streamRes = await fetch(testSignedUrl, { method: "HEAD" });
      const contentType = streamRes.headers.get("content-type");
      assert(
        streamRes.status === 200,
        `Signed URL successfully streams document (HTTP ${streamRes.status})`
      );
      assert(
        contentType?.includes("pdf") || contentType?.includes("octet-stream") || false,
        `Content-Type matches PDF document (${contentType})`
      );
    } catch (err: any) {
      assert(false, "Signed URL document stream", err.message);
    }
  }

  // ── TEST 8: Verify Security Audit Logging ─────────────────────────────────
  console.log("\n[TEST 8] Security Audit Trail");
  if (studentUserId) {
    try {
      const { data: logs, error: logErr } = await adminClient
        .from("activity_logs")
        .select("action, target_id, actor_id, created_at")
        .eq("actor_id", studentUserId)
        .order("created_at", { ascending: false })
        .limit(3);

      const hasGrantLog = (logs || []).some(
        (l) => l.action === "DOCUMENT_ACCESS_GRANTED" || l.action === "note_opened"
      );
      assert(
        hasGrantLog,
        `Audit trail recorded in activity_logs for actor (${logs?.[0]?.action || "None"})`
      );
    } catch (err: any) {
      assert(false, "Audit log verification", err.message);
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n==================================================================");
  console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  if (passedTests === totalTests) {
    console.log("SECURITY STATUS: ALL CRITICAL CONTROLS VERIFIED SUCCESSFULLY.");
  } else {
    console.warn(`SECURITY STATUS: ${totalTests - passedTests} TESTS FAILED. CHECK DETAILS ABOVE.`);
  }
  console.log("==================================================================\n");
}

runSecurityTests().catch(console.error);
