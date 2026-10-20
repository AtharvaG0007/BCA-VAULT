import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envContent = fs.readFileSync(".env", "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
});

const client = createClient(env.SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function testPw() {
  console.log("Testing gogawaleatharva99@gmail.com with password athgo7002...");
  const { data, error } = await client.auth.signInWithPassword({
    email: "gogawaleatharva99@gmail.com",
    password: "athgo7002",
  });
  console.log("Result:", data?.user?.id ? "SUCCESS" : "FAILED", "Error:", error?.message);
}

testPw().catch(console.error);
