import { createClient, type User } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export type AdminRole = "admin" | "superadmin";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function supabaseAdmin() {
  return createClient(required("SUPABASE_URL"), required("SUPABASE_SECRET_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function bearer(req: VercelRequest) {
  const header = req.headers.authorization;
  return typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : null;
}

export async function requireUser(req: VercelRequest, res: VercelResponse): Promise<User | null> {
  const token = bearer(req);
  if (!token) { res.status(401).json({ error: "Authentication required." }); return null; }
  const { data, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !data.user) { res.status(401).json({ error: "Session expired. Please sign in again." }); return null; }
  return data.user;
}

export async function requireAdmin(req: VercelRequest, res: VercelResponse, superadminOnly = false) {
  const user = await requireUser(req, res);
  if (!user) return null;
  const { data, error } = await supabaseAdmin().from("admin_profiles").select("role, status, email").eq("user_id", user.id).maybeSingle();
  if (error || !data || data.status !== "active" || (superadminOnly && data.role !== "superadmin")) {
    res.status(403).json({ error: "Insufficient permissions." });
    return null;
  }
  return { user, role: data.role as AdminRole, email: data.email as string };
}

export function publicError(error: unknown) {
  console.error("[BCA Vault API]", error);
  return "Something went wrong. Please try again later.";
}
