import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export const ROLES = ["student", "admin", "superadmin"] as const;
export type Role = (typeof ROLES)[number];

function serviceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured.");
  const account = JSON.parse(raw);
  // Environment providers often preserve literal newlines differently.
  account.private_key = account.private_key?.replace(/\\n/g, "\n");
  return account;
}

function adminApp() {
  return getApps()[0] ?? initializeApp({
    credential: cert(serviceAccount()),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

export function firebaseAdmin() {
  const app = adminApp();
  return { auth: getAuth(app), db: getDatabase(app) };
}

export function bearerToken(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  return typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : null;
}

export async function requireRole(req: VercelRequest, res: VercelResponse, roles: readonly Role[]): Promise<DecodedIdToken | null> {
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Missing Firebase ID token" });
    return null;
  }
  try {
    const decoded = await firebaseAdmin().auth.verifyIdToken(token, true);
    const role = decoded.role as Role | undefined;
    if (!role || !roles.includes(role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return null;
    }
    return decoded;
  } catch {
    res.status(401).json({ error: "Invalid or revoked Firebase ID token" });
    return null;
  }
}

export async function requireAuth(req: VercelRequest, res: VercelResponse): Promise<DecodedIdToken | null> {
  const token = bearerToken(req);
  if (!token) { res.status(401).json({ error: "Missing Firebase ID token" }); return null; }
  try { return await firebaseAdmin().auth.verifyIdToken(token, true); }
  catch { res.status(401).json({ error: "Invalid or revoked Firebase ID token" }); return null; }
}

export function roleOf(decoded: DecodedIdToken): Role {
  return ROLES.includes(decoded.role as Role) ? decoded.role as Role : "student";
}
