import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const admin = "33333333-3333-4333-8333-333333333333";
const nonAdmin = "44444444-4444-4444-8444-444444444444";
const orderApproved = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const orderRejected = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const orderNonAdmin = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const contentId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const legacyContentId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const migrations = [
  "supabase/migrations/20261018190000_exam_kit_orders_and_content.sql",
  "supabase/migrations/20261018191000_atomic_exam_kit_review.sql",
  "supabase/migrations/20261022210000_secure_exam_kit_content_bucket.sql",
];

const db = new PGlite();
const checks = [];

async function check(name, run) {
  await run();
  checks.push(name);
  console.log(`✓ ${name}`);
}

async function expectSqlState(run, code) {
  await assert.rejects(run, (error) => error.code === code);
}

try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    create schema auth;
    create schema storage;
    create table auth.users (id uuid primary key);
    create table storage.buckets (
      id text primary key,
      name text not null,
      public boolean not null default false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );
    create table public.admin_profiles (
      user_id uuid primary key references auth.users(id),
      role text not null,
      status text not null
    );
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema public, auth, storage to anon, authenticated, service_role;
    insert into auth.users (id) values
      ('${alice}'), ('${bob}'), ('${admin}'), ('${nonAdmin}');
    insert into public.admin_profiles (user_id, role, status) values
      ('${admin}', 'superadmin', 'active');
  `);

  for (const migration of migrations.slice(0, 2)) await db.exec(await readFile(migration, "utf8"));

  await db.exec(`
    insert into public.exam_kit_orders
      (id,user_id,order_code,selected_subjects,plan_type,amount,status,full_name,email,phone)
    values
      ('${orderApproved}','${alice}','EK-APPROVED',array['foundation'],'single',49,'pending_review','Alice','alice@example.test','9999999999'),
      ('${orderRejected}','${bob}','EK-REJECTED',array['foundation'],'single',49,'pending_review','Bob','bob@example.test','9999999998'),
      ('${orderNonAdmin}','${alice}','EK-NONADMIN',array['algorithms'],'single',49,'pending_review','Alice','alice@example.test','9999999999');
    insert into public.exam_kit_entitlements (user_id,subject_id,order_id,granted_by)
      values ('${alice}','foundation','${orderApproved}','${admin}');
    insert into public.exam_kit_content
      (id,subject_id,title,description,storage_bucket,storage_path,published)
    values
      ('${contentId}','foundation','Private kit PDF','Answers','most-repeated-questions','foundation/answers.pdf',true),
      ('${legacyContentId}','foundation','Legacy standard note','Imported note','Bca_notes','foundation/free-note.pdf',true);
  `);

  await db.exec(await readFile(migrations[2], "utf8"));

  const bucket = (await db.query("select public, allowed_mime_types from storage.buckets where id='most-repeated-questions'")).rows[0];
  await check("Most Repeated Questions bucket stays private and PDF-only", async () => {
    assert.equal(bucket.public, false);
    assert.deepEqual(bucket.allowed_mime_types, ["application/pdf"]);
  });

  await check("legacy standard-note metadata is unpublished from paid kits", async () => {
    const result = await db.query("select published from public.exam_kit_content where id=$1", [legacyContentId]);
    assert.equal(result.rows[0].published, false);
  });

  await check("students can read only their own payment records", async () => {
    await db.exec("set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [alice]);
    const result = await db.query("select id from public.exam_kit_orders order by id");
    assert.deepEqual(result.rows.map((row) => row.id), [orderApproved, orderNonAdmin].sort());
    await db.exec("reset role");
  });

  await check("students cannot select another student's entitlement", async () => {
    await db.exec("set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [bob]);
    const result = await db.query("select id from public.exam_kit_entitlements");
    assert.equal(result.rows.length, 0);
    await db.exec("reset role");
  });

  await check("only an owner with an entitlement sees published kit content", async () => {
    await db.exec("set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [alice]);
    const allowed = await db.query("select id,storage_bucket from public.exam_kit_content order by id");
    assert.deepEqual(allowed.rows, [{ id: contentId, storage_bucket: "most-repeated-questions" }]);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [bob]);
    const denied = await db.query("select id from public.exam_kit_content");
    assert.equal(denied.rows.length, 0);
    await db.exec("reset role");
  });

  await check("students cannot write Exam Kit metadata or payment records", async () => {
    await db.exec("set role authenticated");
    await expectSqlState(
      () => db.query("update public.exam_kit_orders set status='approved' where id=$1", [orderApproved]),
      "42501",
    );
    await db.exec("reset role");
  });

  await check("anonymous callers cannot read Exam Kit records", async () => {
    await db.exec("set role anon");
    await expectSqlState(() => db.query("select * from public.exam_kit_content"), "42501");
    await db.exec("reset role");
  });

  await check("only an active admin can reject, and rejection requires a reason", async () => {
    await db.exec("set role service_role");
    await expectSqlState(
      () => db.query("select public.review_exam_kit_order($1,'rejected','', $2)", [orderRejected, admin]),
      "22023",
    );
    const rejected = await db.query("select public.review_exam_kit_order($1,'rejected','UTR not found',$2)", [orderRejected, admin]);
    assert.equal(rejected.rows[0].review_exam_kit_order.status, "rejected");
    await db.exec("reset role");
    const noEntitlement = await db.query("select id from public.exam_kit_entitlements where user_id=$1", [bob]);
    assert.equal(noEntitlement.rows.length, 0);
    await db.exec("set role service_role");
    await expectSqlState(
      () => db.query("select public.review_exam_kit_order($1,'approved','',$2)", [orderNonAdmin, nonAdmin]),
      "42501",
    );
    await db.exec("reset role");
  });

  await check("approval grants only the selected kit and cannot be repeated", async () => {
    await db.exec("set role service_role");
    const approved = await db.query("select public.review_exam_kit_order($1,'approved','UPI matched',$2)", [orderApproved, admin]);
    assert.equal(approved.rows[0].review_exam_kit_order.status, "approved");
    await expectSqlState(
      () => db.query("select public.review_exam_kit_order($1,'approved','',$2)", [orderApproved, admin]),
      "P0002",
    );
    await db.exec("reset role");
    const entitlements = await db.query("select subject_id from public.exam_kit_entitlements where user_id=$1", [alice]);
    assert.deepEqual(entitlements.rows.map((row) => row.subject_id), ["foundation"]);
  });

  await check("student delivery signs only fixed-bucket metadata after checking the owner entitlement", async () => {
    const source = await readFile("supabase/functions/exam-kits/index.ts", "utf8");
    assert.match(source, /const contentBucket = "most-repeated-questions"/);
    assert.match(source, /\.eq\("user_id", user\.id\)[\s\S]*?\.eq\("subject_id", subjectId\)/);
    assert.match(source, /\.eq\("storage_bucket", contentBucket\)[\s\S]*?\.eq\("published", true\)/);
    assert.match(source, /\.from\(contentBucket\)\s*\.createSignedUrl\(item\.storage_path, 300\)/);
    assert.doesNotMatch(source, /from\(item\.storage_bucket\)/);
  });

  await check("order price comes from the server plan table, never the client amount", async () => {
    const source = await readFile("supabase/functions/exam-kits/index.ts", "utf8");
    assert.match(source, /amount:\s*plan\.price/);
    assert.doesNotMatch(source, /amount:\s*body\.amount/);
  });

  console.log(`\n${checks.length} Exam Kit security checks passed.`);
} finally {
  await db.close();
}
