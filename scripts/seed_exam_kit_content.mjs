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
  console.log("Checking notes table...");
  const { data: notes } = await admin.from("notes").select("id, title, subject, storage_bucket, storage_path, published");
  console.log("Total notes:", notes?.length);
  notes?.forEach(n => console.log(`- [${n.subject}] ${n.title} -> ${n.storage_bucket}/${n.storage_path}`));

  console.log("\nChecking existing exam_kit_content table...");
  const { data: ekContent } = await admin.from("exam_kit_content").select("*");
  console.log("Existing exam_kit_content:", ekContent);

  // If exam_kit_content is empty, let's seed relevant subject files from notes or Bca_notes bucket!
  if (!ekContent || ekContent.length === 0) {
    console.log("\nSeeding exam_kit_content for foundation, algorithms, client-side, mathematics...");
    const itemsToSeed = [];

    // Map existing notes to exam kits
    notes?.forEach(n => {
      const s = (n.subject || "").toLowerCase();
      let subject_id = null;
      if (s.includes("foundation")) subject_id = "foundation";
      else if (s.includes("algorithm") || s.includes("c program")) subject_id = "algorithms";
      else if (s.includes("web") || s.includes("client")) subject_id = "client-side";
      else if (s.includes("math")) subject_id = "mathematics";

      if (subject_id && n.storage_bucket && n.storage_path) {
        itemsToSeed.push({
          subject_id,
          title: n.title,
          description: `Exam kit preparation material for ${n.subject}`,
          storage_bucket: n.storage_bucket,
          storage_path: n.storage_path,
          published: true,
        });
      }
    });

    if (itemsToSeed.length > 0) {
      console.log(`Inserting ${itemsToSeed.length} items into exam_kit_content...`);
      const { data: inserted, error: insErr } = await admin.from("exam_kit_content").upsert(itemsToSeed, {
        onConflict: "subject_id,storage_bucket,storage_path",
      }).select();
      console.log("Seeded count:", inserted?.length, "Error:", insErr);
    }
  }
}

run().catch(console.error);
