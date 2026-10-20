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
  console.log("Removing demo student gogawaleatharva@gmail.com from admin_profiles...");
  const { data: del, error: delErr } = await admin
    .from("admin_profiles")
    .delete()
    .eq("email", "gogawaleatharva@gmail.com");

  console.log("Removal result:", del, "Error:", delErr);

  const { data: admins } = await admin.from("admin_profiles").select("*");
  console.log("Remaining authorized admins in admin_profiles:", admins);
}

run().catch(console.error);
