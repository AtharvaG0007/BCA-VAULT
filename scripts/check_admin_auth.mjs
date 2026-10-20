import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envContent = fs.readFileSync(".env", "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
});

const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  const { data: users } = await admin.auth.admin.listUsers();
  const u99 = users.users.find(u => u.email === "gogawaleatharva99@gmail.com");
  console.log("gogawaleatharva99@gmail.com in Auth:", u99 ? { id: u99.id, email: u99.email, confirmed: u99.email_confirmed_at } : "NOT FOUND");

  if (u99) {
    // Set password to athgo7002 for admin
    console.log("Setting password for gogawaleatharva99@gmail.com to athgo7002...");
    const { data: updated, error: updErr } = await admin.auth.admin.updateUserById(u99.id, {
      password: "athgo7002",
      email_confirm: true,
    });
    console.log("Updated result:", updated ? "SUCCESS" : "FAILED", "error:", updErr);
  }

  // Also check admin_profiles table
  const { data: admins } = await admin.from("admin_profiles").select("*");
  console.log("admin_profiles table:", admins);
}

run().catch(console.error);
