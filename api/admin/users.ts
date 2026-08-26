import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ROLES, type Role, firebaseAdmin } from "../_firebaseAdmin";
import { requireSuperAdmin } from "../_adminSession";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const caller = requireSuperAdmin(req, res);
  if (!caller) return;
  const { auth, db } = firebaseAdmin();

  if (req.method === "GET") {
    const users = await auth.listUsers();
    return res.status(200).json({ users: users.users.map((u) => ({
      uid: u.uid, email: u.email, disabled: u.disabled, role: (u.customClaims?.role as Role | undefined) ?? "student",
    })) });
  }
  if (req.method !== "PATCH") return res.status(405).json({ error: "Method not allowed" });

  const { uid, role, disabled } = req.body ?? {};
  if (typeof uid !== "string" || (!ROLES.includes(role) && typeof disabled !== "boolean")) {
    return res.status(400).json({ error: "uid and a valid role or disabled flag are required" });
  }
  const user = await auth.getUser(uid);
  const newRole = (role ?? user.customClaims?.role ?? "student") as Role;
  if (typeof disabled === "boolean") await auth.updateUser(uid, { disabled });
  await db.ref(`users/${uid}`).update({ role: newRole, status: disabled ? "suspended" : "active", updatedAt: new Date().toISOString() });
  await db.ref("auditLogs").push({ actorEmail: caller.email, action: "user_role_or_status_changed", targetUid: uid, role: newRole, disabled: !!disabled, timestamp: new Date().toISOString() });
  return res.status(200).json({ uid, role: newRole, disabled: typeof disabled === "boolean" ? disabled : user.disabled, refreshRequired: !!role });
}
