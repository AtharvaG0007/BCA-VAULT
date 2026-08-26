import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export const ADMIN_ROLES = ["admin", "superadmin"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export interface AdminSession {
  role: AdminRole;
  email: string;
  expiresAt: number;
}

const COOKIE_NAME = "bca_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function configuredValue(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function secret(): string {
  return configuredValue("BACKEND_SESSION_SECRET");
}

function signature(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function parseCookies(req: VercelRequest): Record<string, string> {
  return (req.headers.cookie ?? "").split(";").reduce<Record<string, string>>((cookies, part) => {
    const index = part.indexOf("=");
    if (index > 0) cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
    return cookies;
  }, {});
}

function cookie(value: string, maxAge: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function authenticateCredentials(email: unknown, password: unknown): AdminRole | null {
  if (typeof email !== "string" || typeof password !== "string") return null;
  const normalizedEmail = email.trim().toLowerCase();
  const adminEmail = configuredValue("ADMIN_EMAIL").trim().toLowerCase();
  const adminPassword = configuredValue("ADMIN_PASSWORD");
  const superadminEmail = configuredValue("SUPERADMIN_EMAIL").trim().toLowerCase();
  const superadminPassword = configuredValue("SUPERADMIN_PASSWORD");

  if (secureEqual(normalizedEmail, adminEmail) && secureEqual(password, adminPassword)) return "admin";
  if (secureEqual(normalizedEmail, superadminEmail) && secureEqual(password, superadminPassword)) return "superadmin";
  return null;
}

export function startAdminSession(res: VercelResponse, role: AdminRole, email: string): AdminSession {
  const session: AdminSession = { role, email, expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000 };
  const payload = Buffer.from(JSON.stringify({ ...session, nonce: randomBytes(16).toString("base64url") })).toString("base64url");
  res.setHeader("Set-Cookie", cookie(`${payload}.${signature(payload)}`, SESSION_TTL_SECONDS));
  return session;
}

export function clearAdminSession(res: VercelResponse): void {
  res.setHeader("Set-Cookie", cookie("", 0));
}

export function getAdminSession(req: VercelRequest): AdminSession | null {
  try {
    const raw = parseCookies(req)[COOKIE_NAME];
    if (!raw) return null;
    const [payload, providedSignature, ...rest] = raw.split(".");
    if (!payload || !providedSignature || rest.length || !secureEqual(providedSignature, signature(payload))) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!ADMIN_ROLES.includes(parsed.role) || typeof parsed.email !== "string" || typeof parsed.expiresAt !== "number" || parsed.expiresAt <= Date.now()) return null;
    return { role: parsed.role, email: parsed.email, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

export function requireAdmin(req: VercelRequest, res: VercelResponse): AdminSession | null {
  const session = getAdminSession(req);
  if (!session) { res.status(401).json({ error: "Not authenticated" }); return null; }
  return session;
}

export function requireSuperAdmin(req: VercelRequest, res: VercelResponse): AdminSession | null {
  const session = requireAdmin(req, res);
  if (!session) return null;
  if (session.role !== "superadmin") { res.status(403).json({ error: "Insufficient permissions" }); return null; }
  return session;
}
