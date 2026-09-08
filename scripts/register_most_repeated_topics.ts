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
const secretKey = env["SUPABASE_SECRET_KEY"] || "";

const adminClient = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("Supabase URL:", supabaseUrl);
  console.log("Secret key present:", !!secretKey);

  // 1. Look up Semester 1 bundle
  const { data: bundles, error: bErr } = await adminClient.from("bundles").select("*");
  if (bErr) throw bErr;
  const sem1Bundle = bundles.find(
    (b) => b.title.toLowerCase().includes("sem") && b.title.includes("1") && b.published
  ) || bundles.find((b) => b.id === "5b36f72a-165c-4cd1-8458-d4f33fadd860") || bundles[0];

  console.log("Using Semester 1 Bundle:", sem1Bundle.id, sem1Bundle.title);

  // 2. Define the 3 new Most Repeated Topics records
  const topicNotes = [
    {
      bundle_id: sem1Bundle.id,
      title: "Most Repeated Topics — C Programming",
      subject: "C Programming / Algorithms and Program Design Using C",
      semester: 1,
      description: "High-priority exam-oriented repeated topics and core concepts for C Programming.",
      storage_bucket: "Bca_notes",
      storage_path: "BCA SEM1/C_Programming_Most_Repeated_Topics.pdf",
      published: true,
      priority: "high",
      status: "published",
    },
    {
      bundle_id: sem1Bundle.id,
      title: "Most Repeated Topics — Algorithm & Program Design Using C",
      subject: "Algorithms and Program Design Using C",
      semester: 1,
      description: "High-priority exam-oriented repeated topics for Algorithm & Program Design Using C.",
      storage_bucket: "Bca_notes",
      storage_path: "BCA SEM1/Algorithm_Program_Design_Most_Repeated_Topics.pdf",
      published: true,
      priority: "high",
      status: "published",
    },
    {
      bundle_id: sem1Bundle.id,
      title: "Most Repeated Topics — Foundation of Computing",
      subject: "Foundation of Computing",
      semester: 1,
      description: "High-priority exam-oriented repeated topics and key concepts for Foundation of Computing.",
      storage_bucket: "Bca_notes",
      storage_path: "BCA SEM1/Foundation_of_Computing_Most_Repeated_Topics.pdf",
      published: true,
      priority: "high",
      status: "published",
    },
    {
      bundle_id: sem1Bundle.id,
      title: "Most Repeated Topics — Client-Side Web Technology",
      subject: "Client-Side Web Technology",
      semester: 1,
      description: "High-priority exam-oriented repeated topics and core concepts for Client-Side Web Technology (HTML, CSS, JavaScript).",
      storage_bucket: "Bca_notes",
      storage_path: "BCA SEM1/Client_Side_Web_Technologies_HTML_CSS_JS_Most_Repeated_Topics.pdf",
      published: true,
      priority: "high",
      status: "published",
    },
  ];

  for (const item of topicNotes) {
    console.log(`\nUpserting note: "${item.title}" with path "${item.storage_path}"...`);
    const { data, error } = await adminClient
      .from("notes")
      .upsert(item, { onConflict: "storage_path" })
      .select()
      .single();

    if (error) {
      console.error("Error inserting note:", error);
    } else {
      console.log("Successfully registered note:", data.id, data.title, data.storage_path);

      // Verify signed URL generation
      const { data: signed, error: signErr } = await adminClient.storage
        .from(data.storage_bucket)
        .createSignedUrl(data.storage_path, 300);

      if (signErr) {
        console.error("Signed URL creation failed:", signErr);
      } else {
        console.log("Signed URL verified:", signed.signedUrl.slice(0, 70) + "...");
      }
    }
  }

  // 3. Verify all notes now in DB
  const { data: allNotes } = await adminClient
    .from("notes")
    .select("id, title, subject, semester, storage_path, published, priority, status")
    .order("created_at", { ascending: true });

  console.log("\nCurrent notes in DB count:", allNotes?.length);
  console.log("Notes list:\n", JSON.stringify(allNotes, null, 2));
}

main().catch(console.error);
