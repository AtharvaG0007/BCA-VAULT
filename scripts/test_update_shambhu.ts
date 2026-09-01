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

async function updateShambhu() {
  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const publicClient = createClient(supabaseUrl, anonKey);

  const email = "shambhuraut27@gmail.com";
  const password = "TemporaryPassword123!";

  console.log("Looking up shambhuraut27@gmail.com...");
  const { data: userList } = await adminClient.auth.admin.listUsers();
  const user = userList?.users?.find((u) => u.email?.toLowerCase() === email);

  if (!user) {
    console.error("User not found!");
    return;
  }

  console.log("Updating auth user password and setting email_confirm = true...");
  const { data: updatedUser, error: updateErr } = await adminClient.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
    user_metadata: { full_name: "Shambhu Raut", course: "BCA", semester: 1 },
    app_metadata: { role: "student" },
  });

  if (updateErr) {
    console.error("Update error:", updateErr);
    return;
  }

  console.log("Updated auth user:");
  console.log("  - email_confirmed_at:", updatedUser.user.email_confirmed_at);
  console.log("  - last_sign_in_at:", updatedUser.user.last_sign_in_at);

  // Update profile
  await adminClient.from("profiles").upsert(
    {
      user_id: user.id,
      email,
      full_name: "Shambhu Raut",
      course: "BCA",
      semester: 1,
      status: "active",
    },
    { onConflict: "user_id" }
  );
  console.log("Profile updated.");

  // Test login
  console.log("Testing login for shambhuraut27@gmail.com...");
  const { data: loginData, error: loginErr } = await publicClient.auth.signInWithPassword({
    email,
    password,
  });

  if (loginErr) {
    console.error("Login failed:", loginErr);
  } else {
    console.log("✓ Login successful for shambhuraut27@gmail.com!");
    console.log("  - Token:", loginData.session?.access_token.slice(0, 25) + "...");
    console.log("  - User ID:", loginData.user?.id);
  }
}

updateShambhu().catch(console.error);
