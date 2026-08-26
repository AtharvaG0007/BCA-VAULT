import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.9.6";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use('*', logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ─── Helpers ────────────────────────────────────────────────────────────────

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  );
}

function nanoid(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

async function verifyAuth(c: any): Promise<{ userId: string | null; error: string | null }> {
  const accessToken = c.req.header("Authorization")?.split(" ")[1];
  if (!accessToken) return { userId: null, error: "No auth token" };
  const supabase = serviceClient();
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) return { userId: null, error: "Unauthorized" };
  return { userId: user.id, error: null };
}

async function requireRole(c: any, allowedRoles: string[]): Promise<{ userId: string | null; role: string | null; error: string | null }> {
  const { userId, error } = await verifyAuth(c);
  if (error || !userId) return { userId: null, role: null, error: error ?? "Unauthorized" };
  const profile = await kv.get(`bca:user:${userId}`);
  if (!profile) return { userId, role: null, error: "User profile not found" };
  if (!allowedRoles.includes(profile.role)) {
    return { userId, role: profile.role, error: `Requires role: ${allowedRoles.join(" or ")}` };
  }
  return { userId, role: profile.role, error: null };
}

// ─── Firebase-authenticated private BCA Vault storage ───────────────────────

const VAULT_BUCKET = "bca-vault-notes";
const firebaseKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));

async function requireFirebaseRole(c: any, allowedRoles: string[]) {
  const token = c.req.header("Authorization")?.replace(/^Bearer\s+/i, "");
  const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
  const databaseUrl = Deno.env.get("FIREBASE_DATABASE_URL")?.replace(/\/$/, "");
  if (!token || !projectId || !databaseUrl) return { error: "Firebase backend configuration is incomplete.", userId: null, role: null };
  try {
    const { payload } = await jwtVerify(token, firebaseKeys, { audience: projectId, issuer: `https://securetoken.google.com/${projectId}` });
    const userId = payload.sub;
    if (!userId) return { error: "Invalid Firebase identity.", userId: null, role: null };
    const profileResponse = await fetch(`${databaseUrl}/users/${userId}.json?auth=${encodeURIComponent(token)}`);
    const profile = await profileResponse.json();
    if (!profileResponse.ok || !profile || !allowedRoles.includes(profile.role)) return { error: "Admin authorization required.", userId, role: profile?.role ?? null };
    return { error: null, userId, role: profile.role };
  } catch (error) {
    console.log("[Vault auth]", error instanceof Error ? error.message : error);
    return { error: "Invalid or expired Firebase identity.", userId: null, role: null };
  }
}

function vaultSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72) || "general";
}

// ─── Init Storage Buckets ────────────────────────────────────────────────────

async function initStorageBuckets() {
  const supabase = serviceClient();
  const bucketNames = [
    "make-6704fe8f-notes",
    "make-6704fe8f-pyqs",
    "make-6704fe8f-assignments",
    "make-6704fe8f-profile-images",
    "make-6704fe8f-payment-screenshots",
    VAULT_BUCKET,
  ];
  const { data: buckets } = await supabase.storage.listBuckets();
  for (const name of bucketNames) {
    const exists = buckets?.some((b) => b.name === name);
    if (!exists) {
      const { error } = await supabase.storage.createBucket(name);
      if (error) console.log(`[Storage] Failed to create bucket ${name}: ${error.message}`);
      else console.log(`[Storage] Created bucket: ${name}`);
    }
  }
}

initStorageBuckets().catch((e) => console.log("[Storage] Init error:", e.message));

// ─── Health ──────────────────────────────────────────────────────────────────

app.get("/make-server-6704fe8f/health", (c) => c.json({ status: "ok" }));

// ─── Auth / User Registration ────────────────────────────────────────────────

// Called after Supabase signUp to create user profile
app.post("/make-server-6704fe8f/auth/register", async (c) => {
  try {
    const { userId, error: authError } = await verifyAuth(c);
    if (authError || !userId) return c.json({ error: authError }, 401);

    const body = await c.req.json();
    const { name, email, role = "member" } = body;

    const existing = await kv.get(`bca:user:${userId}`);
    if (existing) return c.json({ user: existing });

    const profile = {
      uid: userId,
      name: name ?? email?.split("@")[0] ?? "User",
      email: email ?? "",
      role: role === "superadmin" || role === "admin" ? "member" : role,
      status: "active",
      createdAt: new Date().toISOString(),
      createdBy: "self",
    };
    await kv.set(`bca:user:${userId}`, profile);
    await logActivityInternal(userId, "user_created", "member");
    return c.json({ user: profile }, 201);
  } catch (err: any) {
    console.log("[Register] Error:", err.message);
    return c.json({ error: `Registration error: ${err.message}` }, 500);
  }
});

// ─── Users ───────────────────────────────────────────────────────────────────

app.get("/make-server-6704fe8f/users", async (c) => {
  try {
    const { error } = await requireRole(c, ["admin", "superadmin"]);
    if (error) return c.json({ error }, 403);
    const users = await kv.getByPrefix("bca:user:");
    return c.json({ users });
  } catch (err: any) {
    console.log("[Users] Get all error:", err.message);
    return c.json({ error: `Failed to fetch users: ${err.message}` }, 500);
  }
});

app.get("/make-server-6704fe8f/users/:id", async (c) => {
  try {
    const { userId, error: authError } = await verifyAuth(c);
    if (authError || !userId) return c.json({ error: authError }, 401);
    const id = c.req.param("id");
    // Users can only read own profile; admins/superadmins can read any
    if (userId !== id) {
      const profile = await kv.get(`bca:user:${userId}`);
      if (!profile || !["admin", "superadmin"].includes(profile.role)) {
        return c.json({ error: "Forbidden" }, 403);
      }
    }
    const user = await kv.get(`bca:user:${id}`);
    if (!user) return c.json({ error: "User not found" }, 404);
    return c.json({ user });
  } catch (err: any) {
    console.log("[Users] Get by id error:", err.message);
    return c.json({ error: `Failed to fetch user: ${err.message}` }, 500);
  }
});

app.put("/make-server-6704fe8f/users/:id", async (c) => {
  try {
    const { userId, error: authError } = await verifyAuth(c);
    if (authError || !userId) return c.json({ error: authError }, 401);
    const id = c.req.param("id");
    const body = await c.req.json();

    const requester = await kv.get(`bca:user:${userId}`);
    const isSelf = userId === id;
    const isAdmin = requester && ["admin", "superadmin"].includes(requester.role);

    if (!isSelf && !isAdmin) return c.json({ error: "Forbidden" }, 403);

    // Prevent role escalation — only superadmin can change roles
    if (body.role && requester?.role !== "superadmin") {
      delete body.role;
    }

    const existing = await kv.get(`bca:user:${id}`);
    if (!existing) return c.json({ error: "User not found" }, 404);
    const updated = { ...existing, ...body, uid: id };
    await kv.set(`bca:user:${id}`, updated);
    return c.json({ user: updated });
  } catch (err: any) {
    console.log("[Users] Update error:", err.message);
    return c.json({ error: `Failed to update user: ${err.message}` }, 500);
  }
});

app.delete("/make-server-6704fe8f/users/:id", async (c) => {
  try {
    const { error } = await requireRole(c, ["superadmin"]);
    if (error) return c.json({ error }, 403);
    const id = c.req.param("id");
    await kv.del(`bca:user:${id}`);
    // Also delete from Supabase Auth
    const supabase = serviceClient();
    await supabase.auth.admin.deleteUser(id);
    return c.json({ success: true });
  } catch (err: any) {
    console.log("[Users] Delete error:", err.message);
    return c.json({ error: `Failed to delete user: ${err.message}` }, 500);
  }
});

// Admin: create user with explicit role
// Superadmin can create any role; admin can only create member accounts
app.post("/make-server-6704fe8f/admin/users", async (c) => {
  try {
    const { userId: requesterId, role: requesterRole, error } = await requireRole(c, ["admin", "superadmin"]);
    if (error) return c.json({ error }, 403);
    const body = await c.req.json();
    const { email, password, name, role } = body;

    // Role restriction: admin can only create members
    const assignedRole = requesterRole === "superadmin" ? (role ?? "admin") : "member";

    const supabase = serviceClient();
    const { data, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true,
    });
    if (createError) return c.json({ error: `Auth create error: ${createError.message}` }, 400);
    const profile = {
      uid: data.user.id,
      name: name ?? "",
      email: email ?? "",
      role: assignedRole,
      status: "active",
      createdAt: new Date().toISOString(),
      createdBy: requesterId ?? "system",
    };
    await kv.set(`bca:user:${data.user.id}`, profile);
    return c.json({ user: profile }, 201);
  } catch (err: any) {
    console.log("[Admin Users] Create error:", err.message);
    return c.json({ error: `Failed to create admin user: ${err.message}` }, 500);
  }
});

// ─── Legal Acceptance ────────────────────────────────────────────────────────

app.post("/make-server-6704fe8f/users/:id/legal", async (c) => {
  try {
    const { userId, error: authError } = await verifyAuth(c);
    if (authError || !userId) return c.json({ error: authError }, 401);
    const id = c.req.param("id");
    if (userId !== id) return c.json({ error: "Forbidden" }, 403);
    const acceptance = {
      accepted: true,
      acceptedAt: new Date().toISOString(),
      termsVersion: "1.0.0",
      privacyVersion: "1.0.0",
    };
    await kv.set(`bca:legal:${id}`, acceptance);
    return c.json({ acceptance });
  } catch (err: any) {
    console.log("[Legal] Save error:", err.message);
    return c.json({ error: `Failed to save legal acceptance: ${err.message}` }, 500);
  }
});

app.get("/make-server-6704fe8f/users/:id/legal", async (c) => {
  try {
    const { userId, error: authError } = await verifyAuth(c);
    if (authError || !userId) return c.json({ error: authError }, 401);
    const id = c.req.param("id");
    if (userId !== id) return c.json({ error: "Forbidden" }, 403);
    const acceptance = await kv.get(`bca:legal:${id}`);
    return c.json({ acceptance: acceptance ?? null });
  } catch (err: any) {
    console.log("[Legal] Get error:", err.message);
    return c.json({ error: `Failed to get legal acceptance: ${err.message}` }, 500);
  }
});

// ─── Notes ───────────────────────────────────────────────────────────────────

app.get("/make-server-6704fe8f/notes", async (c) => {
  try {
    const publishedOnly = c.req.query("published") === "true";
    const all = await kv.getByPrefix("bca:note:");
    const notes = publishedOnly ? all.filter((n: any) => n.isPublished) : all;
    return c.json({ notes });
  } catch (err: any) {
    console.log("[Notes] Get all error:", err.message);
    return c.json({ error: `Failed to fetch notes: ${err.message}` }, 500);
  }
});

app.post("/make-server-6704fe8f/notes", async (c) => {
  try {
    const { userId, error } = await requireRole(c, ["admin", "superadmin"]);
    if (error) return c.json({ error }, 403);
    const body = await c.req.json();
    const id = nanoid();
    const note = {
      ...body,
      id,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      downloadCount: 0,
      purchaseCount: 0,
    };
    await kv.set(`bca:note:${id}`, note);
    await logActivityInternal(userId!, "content_uploaded", "admin", { noteId: id });
    return c.json({ note }, 201);
  } catch (err: any) {
    console.log("[Notes] Create error:", err.message);
    return c.json({ error: `Failed to create note: ${err.message}` }, 500);
  }
});

app.put("/make-server-6704fe8f/notes/:id", async (c) => {
  try {
    const { error } = await requireRole(c, ["admin", "superadmin"]);
    if (error) return c.json({ error }, 403);
    const id = c.req.param("id");
    const body = await c.req.json();
    const existing = await kv.get(`bca:note:${id}`);
    if (!existing) return c.json({ error: "Note not found" }, 404);
    const updated = { ...existing, ...body, id };
    await kv.set(`bca:note:${id}`, updated);
    return c.json({ note: updated });
  } catch (err: any) {
    console.log("[Notes] Update error:", err.message);
    return c.json({ error: `Failed to update note: ${err.message}` }, 500);
  }
});

app.delete("/make-server-6704fe8f/notes/:id", async (c) => {
  try {
    const { error } = await requireRole(c, ["admin", "superadmin"]);
    if (error) return c.json({ error }, 403);
    const id = c.req.param("id");
    await kv.del(`bca:note:${id}`);
    return c.json({ success: true });
  } catch (err: any) {
    console.log("[Notes] Delete error:", err.message);
    return c.json({ error: `Failed to delete note: ${err.message}` }, 500);
  }
});

// ─── Bundles ─────────────────────────────────────────────────────────────────

app.get("/make-server-6704fe8f/bundles", async (c) => {
  try {
    const publishedOnly = c.req.query("published") === "true";
    const all = await kv.getByPrefix("bca:bundle:");
    const bundles = publishedOnly ? all.filter((b: any) => b.isPublished) : all;
    return c.json({ bundles });
  } catch (err: any) {
    console.log("[Bundles] Get all error:", err.message);
    return c.json({ error: `Failed to fetch bundles: ${err.message}` }, 500);
  }
});

app.post("/make-server-6704fe8f/bundles", async (c) => {
  try {
    const { userId, error } = await requireRole(c, ["admin", "superadmin"]);
    if (error) return c.json({ error }, 403);
    const body = await c.req.json();
    const id = nanoid();
    const bundle = {
      ...body,
      id,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      purchaseCount: 0,
    };
    await kv.set(`bca:bundle:${id}`, bundle);
    return c.json({ bundle }, 201);
  } catch (err: any) {
    console.log("[Bundles] Create error:", err.message);
    return c.json({ error: `Failed to create bundle: ${err.message}` }, 500);
  }
});

app.put("/make-server-6704fe8f/bundles/:id", async (c) => {
  try {
    const { error } = await requireRole(c, ["admin", "superadmin"]);
    if (error) return c.json({ error }, 403);
    const id = c.req.param("id");
    const body = await c.req.json();
    const existing = await kv.get(`bca:bundle:${id}`);
    if (!existing) return c.json({ error: "Bundle not found" }, 404);
    const updated = { ...existing, ...body, id };
    await kv.set(`bca:bundle:${id}`, updated);
    return c.json({ bundle: updated });
  } catch (err: any) {
    console.log("[Bundles] Update error:", err.message);
    return c.json({ error: `Failed to update bundle: ${err.message}` }, 500);
  }
});

// ─── Packages ────────────────────────────────────────────────────────────────

app.get("/make-server-6704fe8f/packages", async (c) => {
  try {
    const all = await kv.getByPrefix("bca:package:");
    return c.json({ packages: all });
  } catch (err: any) {
    console.log("[Packages] Get all error:", err.message);
    return c.json({ error: `Failed to fetch packages: ${err.message}` }, 500);
  }
});

app.post("/make-server-6704fe8f/packages", async (c) => {
  try {
    const { userId, error } = await requireRole(c, ["admin", "superadmin"]);
    if (error) return c.json({ error }, 403);
    const body = await c.req.json();
    const id = nanoid();
    const pkg = { ...body, id, createdBy: userId, createdAt: new Date().toISOString() };
    await kv.set(`bca:package:${id}`, pkg);
    return c.json({ package: pkg }, 201);
  } catch (err: any) {
    console.log("[Packages] Create error:", err.message);
    return c.json({ error: `Failed to create package: ${err.message}` }, 500);
  }
});

// ─── Orders ──────────────────────────────────────────────────────────────────

app.get("/make-server-6704fe8f/orders/user/:uid", async (c) => {
  try {
    const { userId, error: authError } = await verifyAuth(c);
    if (authError || !userId) return c.json({ error: authError }, 401);
    const uid = c.req.param("uid");
    if (userId !== uid) {
      const profile = await kv.get(`bca:user:${userId}`);
      if (!profile || !["admin", "superadmin"].includes(profile.role)) {
        return c.json({ error: "Forbidden" }, 403);
      }
    }
    const all = await kv.getByPrefix("bca:order:");
    const orders = all.filter((o: any) => o.uid === uid);
    return c.json({ orders });
  } catch (err: any) {
    console.log("[Orders] Get user orders error:", err.message);
    return c.json({ error: `Failed to fetch orders: ${err.message}` }, 500);
  }
});

app.get("/make-server-6704fe8f/orders", async (c) => {
  try {
    const { error } = await requireRole(c, ["admin", "superadmin"]);
    if (error) return c.json({ error }, 403);
    const orders = await kv.getByPrefix("bca:order:");
    return c.json({ orders });
  } catch (err: any) {
    console.log("[Orders] Get all error:", err.message);
    return c.json({ error: `Failed to fetch orders: ${err.message}` }, 500);
  }
});

app.post("/make-server-6704fe8f/orders", async (c) => {
  try {
    const { userId, error: authError } = await verifyAuth(c);
    if (authError || !userId) return c.json({ error: authError }, 401);
    const body = await c.req.json();
    const id = nanoid();
    const order = {
      ...body,
      id,
      uid: userId,
      createdAt: new Date().toISOString(),
      status: "pending",
    };
    await kv.set(`bca:order:${id}`, order);
    return c.json({ order }, 201);
  } catch (err: any) {
    console.log("[Orders] Create error:", err.message);
    return c.json({ error: `Failed to create order: ${err.message}` }, 500);
  }
});

// ─── Downloads ───────────────────────────────────────────────────────────────

app.get("/make-server-6704fe8f/downloads/user/:uid", async (c) => {
  try {
    const { userId, error: authError } = await verifyAuth(c);
    if (authError || !userId) return c.json({ error: authError }, 401);
    const uid = c.req.param("uid");
    if (userId !== uid) return c.json({ error: "Forbidden" }, 403);
    const all = await kv.getByPrefix("bca:download:");
    const downloads = all.filter((d: any) => d.userId === uid);
    return c.json({ downloads });
  } catch (err: any) {
    console.log("[Downloads] Get error:", err.message);
    return c.json({ error: `Failed to fetch downloads: ${err.message}` }, 500);
  }
});

app.post("/make-server-6704fe8f/downloads", async (c) => {
  try {
    const { userId, error: authError } = await verifyAuth(c);
    if (authError || !userId) return c.json({ error: authError }, 401);
    const body = await c.req.json();
    const id = nanoid();
    const dl = { ...body, id, userId, downloadedAt: new Date().toISOString() };
    await kv.set(`bca:download:${id}`, dl);
    // Generate signed URL for the file
    const supabase = serviceClient();
    const { fileRef, bucket } = body;
    if (fileRef && bucket) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(fileRef, 300); // 5-minute expiry
      if (!error && data?.signedUrl) {
        return c.json({ download: dl, signedUrl: data.signedUrl });
      }
    }
    return c.json({ download: dl }, 201);
  } catch (err: any) {
    console.log("[Downloads] Create error:", err.message);
    return c.json({ error: `Failed to record download: ${err.message}` }, 500);
  }
});

// ─── Storage: Upload URL ─────────────────────────────────────────────────────

app.post("/make-server-6704fe8f/storage/upload-url", async (c) => {
  try {
    const { userId, error: authError } = await verifyAuth(c);
    if (authError || !userId) return c.json({ error: authError }, 401);
    const { bucket, fileName, contentType } = await c.req.json();
    const allowedBuckets = [
      "make-6704fe8f-notes",
      "make-6704fe8f-pyqs",
      "make-6704fe8f-assignments",
      "make-6704fe8f-profile-images",
    ];
    if (!allowedBuckets.includes(bucket)) {
      return c.json({ error: "Invalid bucket" }, 400);
    }
    const supabase = serviceClient();
    const filePath = `${userId}/${Date.now()}-${fileName}`;
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(filePath);
    if (error) return c.json({ error: `Storage error: ${error.message}` }, 500);
    return c.json({ signedUrl: data.signedUrl, token: data.token, path: filePath });
  } catch (err: any) {
    console.log("[Storage] Upload URL error:", err.message);
    return c.json({ error: `Failed to generate upload URL: ${err.message}` }, 500);
  }
});

// ─── Admin private notes (Firebase auth → private Supabase storage) ─────────

app.post("/make-server-6704fe8f/admin/notes/upload-url", async (c) => {
  const identity = await requireFirebaseRole(c, ["admin", "superadmin"]);
  if (identity.error) return c.json({ error: identity.error }, 403);
  const { semester, subject, unit, fileName, contentType, size } = await c.req.json();
  if (![1, 2].includes(Number(semester)) || typeof subject !== "string" || !/^\d{1,2}$/.test(String(unit)) || !/\.pdf$/i.test(String(fileName)) || contentType !== "application/pdf" || !Number.isFinite(size) || size < 1 || size > 20 * 1024 * 1024) return c.json({ error: "Invalid theory-note upload request." }, 400);
  const storagePath = `2026-27/semester-${semester}/${vaultSlug(subject)}/unit-${unit}/${crypto.randomUUID()}.pdf`;
  const { data, error } = await serviceClient().storage.from(VAULT_BUCKET).createSignedUploadUrl(storagePath);
  if (error) return c.json({ error: `Storage error: ${error.message}` }, 500);
  return c.json({ storagePath, token: data.token, fileName: `${vaultSlug(fileName.replace(/\.pdf$/i, ""))}.pdf` });
});

app.get("/make-server-6704fe8f/admin/notes/view", async (c) => {
  const identity = await requireFirebaseRole(c, ["admin", "superadmin"]);
  if (identity.error) return c.json({ error: identity.error }, 403);
  const path = c.req.query("path") ?? "";
  if (!/^2026-27\/semester-[12]\//.test(path) || path.includes("..")) return c.json({ error: "Invalid private storage path." }, 400);
  const { data, error } = await serviceClient().storage.from(VAULT_BUCKET).createSignedUrl(path, 60);
  if (error) return c.json({ error: `Preview unavailable: ${error.message}` }, 500);
  return c.json({ signedUrl: data.signedUrl });
});

app.post("/make-server-6704fe8f/admin/notes/remove", async (c) => {
  const identity = await requireFirebaseRole(c, ["admin", "superadmin"]);
  if (identity.error) return c.json({ error: identity.error }, 403);
  const { storagePath } = await c.req.json();
  if (typeof storagePath !== "string" || !/^2026-27\/semester-[12]\//.test(storagePath) || storagePath.includes("..")) return c.json({ error: "Invalid private storage path." }, 400);
  const { error } = await serviceClient().storage.from(VAULT_BUCKET).remove([storagePath]);
  if (error) return c.json({ error: `File removal failed: ${error.message}` }, 500);
  return c.json({ success: true });
});

// ─── Stats (Analytics) ───────────────────────────────────────────────────────

app.get("/make-server-6704fe8f/stats", async (c) => {
  try {
    const { error } = await requireRole(c, ["admin", "superadmin"]);
    if (error) return c.json({ error }, 403);
    const [users, notes, bundles, orders] = await Promise.all([
      kv.getByPrefix("bca:user:"),
      kv.getByPrefix("bca:note:"),
      kv.getByPrefix("bca:bundle:"),
      kv.getByPrefix("bca:order:"),
    ]);
    const revenue = orders.reduce((sum: number, o: any) => sum + (o.total ?? 0), 0);
    return c.json({
      stats: {
        totalUsers: users.length,
        totalNotes: notes.length,
        totalBundles: bundles.length,
        totalOrders: orders.length,
        totalRevenue: revenue,
      },
    });
  } catch (err: any) {
    console.log("[Stats] Error:", err.message);
    return c.json({ error: `Failed to fetch stats: ${err.message}` }, 500);
  }
});

// ─── Activity Log ────────────────────────────────────────────────────────────

async function logActivityInternal(
  userId: string,
  action: string,
  role: string,
  meta?: Record<string, string>
) {
  try {
    const id = nanoid();
    await kv.set(`bca:activity:${id}`, {
      id,
      userId,
      action,
      role,
      meta: meta ?? {},
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.log("[Activity] Log error:", err.message);
  }
}

app.post("/make-server-6704fe8f/activity", async (c) => {
  try {
    const { userId, error: authError } = await verifyAuth(c);
    if (authError || !userId) return c.json({ error: authError }, 401);
    const { action, role, meta } = await c.req.json();
    await logActivityInternal(userId, action, role, meta);
    return c.json({ success: true });
  } catch (err: any) {
    console.log("[Activity] Post error:", err.message);
    return c.json({ error: `Failed to log activity: ${err.message}` }, 500);
  }
});

app.get("/make-server-6704fe8f/activity", async (c) => {
  try {
    const { error } = await requireRole(c, ["admin", "superadmin"]);
    if (error) return c.json({ error }, 403);
    const limit = parseInt(c.req.query("limit") ?? "50");
    const logs = await kv.getByPrefix("bca:activity:");
    logs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return c.json({ logs: logs.slice(0, limit) });
  } catch (err: any) {
    console.log("[Activity] Get error:", err.message);
    return c.json({ error: `Failed to fetch activity logs: ${err.message}` }, 500);
  }
});

// ─── Bookmarks ───────────────────────────────────────────────────────────────

app.get("/make-server-6704fe8f/bookmarks/:uid", async (c) => {
  try {
    const { userId, error: authError } = await verifyAuth(c);
    if (authError || !userId) return c.json({ error: authError }, 401);
    const uid = c.req.param("uid");
    if (userId !== uid) return c.json({ error: "Forbidden" }, 403);
    const bookmarks = await kv.get(`bca:bookmarks:${uid}`) ?? [];
    return c.json({ bookmarks });
  } catch (err: any) {
    console.log("[Bookmarks] Get error:", err.message);
    return c.json({ error: `Failed to fetch bookmarks: ${err.message}` }, 500);
  }
});

app.post("/make-server-6704fe8f/bookmarks/:uid", async (c) => {
  try {
    const { userId, error: authError } = await verifyAuth(c);
    if (authError || !userId) return c.json({ error: authError }, 401);
    const uid = c.req.param("uid");
    if (userId !== uid) return c.json({ error: "Forbidden" }, 403);
    const { noteId, bundleId, type } = await c.req.json();
    const existing = await kv.get(`bca:bookmarks:${uid}`) ?? [];
    const entry = { id: nanoid(), noteId, bundleId, type, savedAt: new Date().toISOString() };
    await kv.set(`bca:bookmarks:${uid}`, [...existing, entry]);
    return c.json({ bookmark: entry }, 201);
  } catch (err: any) {
    console.log("[Bookmarks] Add error:", err.message);
    return c.json({ error: `Failed to add bookmark: ${err.message}` }, 500);
  }
});

// ─── Payments (Manual UPI) ───────────────────────────────────────────────────

// Student initiates payment
app.post("/make-server-6704fe8f/payments/initiate", async (c) => {
  try {
    const { userId, error: authError } = await verifyAuth(c);
    if (authError || !userId) return c.json({ error: authError }, 401);
    const { noteId, bundleId, amount, title } = await c.req.json();
    const id = nanoid();
    const payment = {
      id,
      userId,
      noteId: noteId ?? null,
      bundleId: bundleId ?? null,
      amount,
      title,
      status: "pending_screenshot",
      screenshotUrl: null,
      screenshotPath: null,
      adminNote: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`bca:payment:${id}`, payment);
    return c.json({ payment }, 201);
  } catch (err: any) {
    console.log("[Payments] Initiate error:", err.message);
    return c.json({ error: `Failed to initiate payment: ${err.message}` }, 500);
  }
});

// Student uploads screenshot reference after uploading to storage
app.put("/make-server-6704fe8f/payments/:id/screenshot", async (c) => {
  try {
    const { userId, error: authError } = await verifyAuth(c);
    if (authError || !userId) return c.json({ error: authError }, 401);
    const id = c.req.param("id");
    const { screenshotPath, screenshotUrl } = await c.req.json();
    const existing = await kv.get(`bca:payment:${id}`);
    if (!existing) return c.json({ error: "Payment not found" }, 404);
    if (existing.userId !== userId) return c.json({ error: "Forbidden" }, 403);
    const updated = {
      ...existing,
      screenshotPath,
      screenshotUrl,
      status: "pending_review",
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`bca:payment:${id}`, updated);
    await logActivityInternal(userId, "payment_screenshot_uploaded", "member", { paymentId: id });
    return c.json({ payment: updated });
  } catch (err: any) {
    console.log("[Payments] Screenshot error:", err.message);
    return c.json({ error: `Failed to update payment: ${err.message}` }, 500);
  }
});

// Get single payment screenshot as signed URL
app.get("/make-server-6704fe8f/payments/:id/screenshot-url", async (c) => {
  try {
    const { error } = await requireRole(c, ["admin", "superadmin"]);
    if (error) return c.json({ error }, 403);
    const id = c.req.param("id");
    const payment = await kv.get(`bca:payment:${id}`);
    if (!payment || !payment.screenshotPath) return c.json({ error: "No screenshot" }, 404);
    const supabase = serviceClient();
    const { data, error: signError } = await supabase.storage
      .from("make-6704fe8f-payment-screenshots")
      .createSignedUrl(payment.screenshotPath, 300);
    if (signError) return c.json({ error: signError.message }, 500);
    return c.json({ url: data.signedUrl });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Admin: get all pending payments
app.get("/make-server-6704fe8f/payments/pending", async (c) => {
  try {
    const { error } = await requireRole(c, ["admin", "superadmin"]);
    if (error) return c.json({ error }, 403);
    const all = await kv.getByPrefix("bca:payment:");
    const pending = all.filter((p: any) => p.status === "pending_review");
    pending.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ payments: pending });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Admin: get all payments
app.get("/make-server-6704fe8f/payments", async (c) => {
  try {
    const { error } = await requireRole(c, ["admin", "superadmin"]);
    if (error) return c.json({ error }, 403);
    const all = await kv.getByPrefix("bca:payment:");
    all.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ payments: all });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Admin: verify (approve/reject) a payment
app.put("/make-server-6704fe8f/payments/:id/verify", async (c) => {
  try {
    const { userId, error } = await requireRole(c, ["admin", "superadmin"]);
    if (error) return c.json({ error }, 403);
    const id = c.req.param("id");
    const { action, adminNote } = await c.req.json(); // action: "approve" | "reject"
    const existing = await kv.get(`bca:payment:${id}`);
    if (!existing) return c.json({ error: "Payment not found" }, 404);
    const newStatus = action === "approve" ? "approved" : "rejected";
    const updated = {
      ...existing,
      status: newStatus,
      adminNote: adminNote ?? null,
      verifiedBy: userId,
      verifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`bca:payment:${id}`, updated);

    // If approved, grant access by creating an order
    if (action === "approve") {
      const orderId = nanoid();
      await kv.set(`bca:order:${orderId}`, {
        id: orderId,
        uid: existing.userId,
        noteId: existing.noteId,
        bundleId: existing.bundleId,
        paymentId: id,
        total: existing.amount,
        status: "completed",
        createdAt: new Date().toISOString(),
      });
    }
    await logActivityInternal(userId!, `payment_${action}d`, "admin", { paymentId: id, studentId: existing.userId });
    return c.json({ payment: updated });
  } catch (err: any) {
    console.log("[Payments] Verify error:", err.message);
    return c.json({ error: `Failed to verify payment: ${err.message}` }, 500);
  }
});

// Student: get my payments
app.get("/make-server-6704fe8f/payments/user/:uid", async (c) => {
  try {
    const { userId, error: authError } = await verifyAuth(c);
    if (authError || !userId) return c.json({ error: authError }, 401);
    const uid = c.req.param("uid");
    if (userId !== uid) return c.json({ error: "Forbidden" }, 403);
    const all = await kv.getByPrefix("bca:payment:");
    const mine = all.filter((p: any) => p.userId === uid);
    mine.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ payments: mine });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Storage: upload URL for payment screenshot
app.post("/make-server-6704fe8f/payments/upload-url", async (c) => {
  try {
    const { userId, error: authError } = await verifyAuth(c);
    if (authError || !userId) return c.json({ error: authError }, 401);
    const { fileName, paymentId } = await c.req.json();
    const supabase = serviceClient();
    const filePath = `${userId}/${paymentId}/${Date.now()}-${fileName}`;
    const { data, error: signError } = await supabase.storage
      .from("make-6704fe8f-payment-screenshots")
      .createSignedUploadUrl(filePath);
    if (signError) return c.json({ error: `Storage error: ${signError.message}` }, 500);
    return c.json({ signedUrl: data.signedUrl, token: data.token, path: filePath });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── Platform Config ─────────────────────────────────────────────────────────

app.get("/make-server-6704fe8f/config", async (c) => {
  try {
    const { error } = await requireRole(c, ["superadmin"]);
    if (error) return c.json({ error }, 403);
    const config = await kv.get("bca:platform:config") ?? {
      upiId: "bcavault@upi",
      upiName: "BCA Vault",
      minAmount: 1,
    };
    return c.json({ config });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.put("/make-server-6704fe8f/config", async (c) => {
  try {
    const { error } = await requireRole(c, ["superadmin"]);
    if (error) return c.json({ error }, 403);
    const body = await c.req.json();
    const existing = await kv.get("bca:platform:config") ?? {};
    const updated = { ...existing, ...body };
    await kv.set("bca:platform:config", updated);
    return c.json({ config: updated });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Public config (UPI ID only, no secrets)
app.get("/make-server-6704fe8f/config/public", async (c) => {
  try {
    const config = await kv.get("bca:platform:config") ?? {
      upiId: "bcavault@upi",
      upiName: "BCA Vault",
    };
    return c.json({ upiId: config.upiId, upiName: config.upiName });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

Deno.serve(app.fetch);
