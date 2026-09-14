import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || "https://dmxegktlxqsxaysqwswa.supabase.co";
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "";

if (!key) {
  throw new Error("Set VITE_SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY before running this test.");
}

const client = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data, error } = await client.rpc("resolve_referral_identifier", {
    p_identifier: "GOGO DMS",
    p_caller_user_id: null,
    p_caller_email: "regression-test@example.invalid",
  });

  if (error) throw error;
  if (!data?.success || data?.referral_identifier !== "GOGO DMS") {
    throw new Error(`DMS referral regression failed: ${JSON.stringify(data)}`);
  }

  console.log("DMS referral resolution passed: GOGO DMS");
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
