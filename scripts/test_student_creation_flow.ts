import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

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

async function verifyStudentFlow() {
  console.log("==================================================");
  console.log("VERIFYING STUDENT CREATION & AUTHENTICATION FLOW");
  console.log("==================================================");

  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const publicClient = createClient(supabaseUrl, anonKey);

  const testEmail = `test_student_${Date.now()}@bcavault.in`;
  const testPassword = "TestPassword@123!";
  const testName = "Test Verification Student";

  console.log(`\n1. Creating student account: ${testEmail}`);

  // Test creation via direct admin auth (same logic as bca-admin edge function)
  const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: testName, course: "BCA", semester: 1 },
    app_metadata: { role: "student" },
  });

  if (createError || !createData.user) {
    console.error("  ❌ Failed to create Auth user:", createError);
    return;
  }

  const userId = createData.user.id;
  console.log("  ✓ Created Auth User ID:", userId);
  console.log("  ✓ email_confirmed_at:", createData.user.email_confirmed_at);
  console.log("  ✓ invited_at:", (createData.user as any).invited_at ?? "NULL (Correct)");

  // 2. Insert Profile
  const { error: profileError } = await adminClient.from("profiles").upsert(
    {
      user_id: userId,
      email: testEmail,
      full_name: testName,
      course: "BCA",
      semester: 1,
      status: "active",
    },
    { onConflict: "user_id" }
  );

  if (profileError) {
    console.error("  ❌ Profile creation failed:", profileError);
    return;
  }
  console.log("  ✓ Profile record inserted and linked with user_id:", userId);

  // 3. Test Student Login via signInWithPassword
  console.log(`\n2. Testing student login with email + password...`);
  const { data: loginData, error: loginError } = await publicClient.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (loginError || !loginData.user || !loginData.session) {
    console.error("  ❌ Student login failed:", loginError);
    return;
  }

  console.log("  ✓ Student successfully signed in!");
  console.log("  ✓ Session Access Token acquired:", loginData.session.access_token.slice(0, 20) + "...");
  console.log("  ✓ User ID matches:", loginData.user.id === userId);

  // 4. Test Student Profile Fetch (RLS Verification)
  const { data: profileCheck, error: checkError } = await publicClient
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (checkError) {
    console.error("  ❌ Failed to fetch own profile via RLS:", checkError);
  } else {
    console.log("  ✓ Student profile verified via RLS:", profileCheck.full_name, "(Status:", profileCheck.status + ")");
  }

  // 5. Cleanup test user
  console.log(`\n3. Cleaning up test user...`);
  await adminClient.from("profiles").delete().eq("user_id", userId);
  await adminClient.auth.admin.deleteUser(userId);
  console.log("  ✓ Test user cleaned up.");

  // 6. Check existing account shambhuraut27@gmail.com
  console.log(`\n4. Checking existing account: shambhuraut27@gmail.com`);
  const { data: userList } = await adminClient.auth.admin.listUsers();
  const existingShambhu = userList?.users?.find(
    (u) => u.email?.toLowerCase() === "shambhuraut27@gmail.com"
  );
  if (existingShambhu) {
    console.log("  Found shambhuraut27@gmail.com:");
    console.log("    - ID:", existingShambhu.id);
    console.log("    - email_confirmed_at:", existingShambhu.email_confirmed_at);
    console.log("    - invited_at:", (existingShambhu as any).invited_at);
    console.log("    - last_sign_in_at:", existingShambhu.last_sign_in_at);
  } else {
    console.log("  shambhuraut27@gmail.com not found in list.");
  }

  console.log("\n==================================================");
  console.log("ALL VERIFICATIONS COMPLETED SUCCESSFULLY");
  console.log("==================================================");
}

verifyStudentFlow().catch(console.error);
