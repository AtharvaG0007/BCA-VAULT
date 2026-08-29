import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Read .env manually
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
const secretKey = env["SUPABASE_SECRET_KEY"] || "";
const anonKey = env["VITE_SUPABASE_PUBLISHABLE_KEY"] || "";

console.log("Supabase URL:", supabaseUrl);
console.log("Secret key present:", !!secretKey);

async function runAudit() {
  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Check bundles
  const { data: bundles, error: bundlesErr } = await adminClient.from("bundles").select("*");
  console.log("\n=== BUNDLES ===");
  if (bundlesErr) console.error("Error:", bundlesErr);
  else console.log(`Found ${bundles.length} bundles:`, JSON.stringify(bundles, null, 2));

  // 2. Check notes
  const { data: notes, error: notesErr } = await adminClient.from("notes").select("*");
  console.log("\n=== NOTES ===");
  if (notesErr) console.error("Error:", notesErr);
  else console.log(`Found ${notes.length} notes:`, JSON.stringify(notes, null, 2));

  // 3. Check profiles
  const { data: profiles, error: profilesErr } = await adminClient.from("profiles").select("*");
  console.log("\n=== PROFILES ===");
  if (profilesErr) console.error("Error:", profilesErr);
  else console.log(`Found ${profiles.length} profiles:`, JSON.stringify(profiles, null, 2));

  // 4. Check access_permissions
  const { data: access, error: accessErr } = await adminClient.from("access_permissions").select("*");
  console.log("\n=== ACCESS PERMISSIONS ===");
  if (accessErr) console.error("Error:", accessErr);
  else console.log(`Found ${access.length} permissions:`, JSON.stringify(access, null, 2));

  // 5. Check admin_profiles
  const { data: admins, error: adminsErr } = await adminClient.from("admin_profiles").select("*");
  console.log("\n=== ADMIN PROFILES ===");
  if (adminsErr) console.error("Error:", adminsErr);
  else console.log(`Found ${admins.length} admin profiles:`, JSON.stringify(admins, null, 2));

  // 6. Check storage buckets
  const { data: buckets, error: bucketsErr } = await adminClient.storage.listBuckets();
  console.log("\n=== STORAGE BUCKETS ===");
  if (bucketsErr) console.error("Error:", bucketsErr);
  else console.log(`Found ${buckets.length} buckets:`, JSON.stringify(buckets, null, 2));

  // 7. Check files in buckets
  if (buckets) {
    for (const b of buckets) {
      const { data: files, error: filesErr } = await adminClient.storage.from(b.name).list();
      console.log(`\nFiles in bucket "${b.name}":`, files, "Error:", filesErr);
      if (files) {
        for (const f of files) {
          // If no id or has no metadata, it might be a folder
          const { data: subFiles } = await adminClient.storage.from(b.name).list(f.name);
          if (subFiles && subFiles.length > 0) {
            console.log(`  Subfolder "${b.name}/${f.name}":`, subFiles);
          }
        }
      }
    }
  }

  // 8. Test signed URL generation for existing notes using adminClient
  if (notes && notes.length > 0) {
    console.log("\n=== TESTING SIGNED URL GENERATION ===");
    for (const n of notes) {
      const bName = n.storage_bucket;
      const sPath = n.storage_path;
      console.log(`Testing note "${n.title}" bucket="${bName}" path="${sPath}"`);
      const { data: signed, error: signErr } = await adminClient.storage.from(bName).createSignedUrl(sPath, 300);
      if (signErr) {
        console.error(`  Signed URL error:`, signErr);
      } else {
        console.log(`  Signed URL generated:`, signed.signedUrl.slice(0, 80) + "...");
      }
    }
  }
}

runAudit().catch(console.error);
