/**
 * One-time/local role provisioning. Set FIREBASE_SERVICE_ACCOUNT_JSON in your
 * shell or CI secret manager; never commit the service-account file or JSON.
 * Usage: pnpm provision:role -- --email admin@example.com --role admin
 * Or provision both bootstrap accounts: --admin-email ... --superadmin-email ...
 */
import { ROLES, type Role, firebaseAdmin } from "../api/_firebaseAdmin";

const args = process.argv.slice(2);
const value = (name: string) => args[args.indexOf(name) + 1];
const email = value("--email")?.trim().toLowerCase();
const role = value("--role") as Role | undefined;
const adminEmail = value("--admin-email")?.trim().toLowerCase();
const superadminEmail = value("--superadmin-email")?.trim().toLowerCase();
if (adminEmail || superadminEmail) {
  if (!adminEmail || !superadminEmail) throw new Error("Provide both --admin-email and --superadmin-email");
  const { auth, db } = firebaseAdmin();
  for (const [targetEmail, targetRole] of [[adminEmail, "admin"], [superadminEmail, "superadmin"]] as const) {
    const user = await auth.getUserByEmail(targetEmail);
    await auth.setCustomUserClaims(user.uid, { ...user.customClaims, role: targetRole });
    await db.ref(`users/${user.uid}`).update({ uid: user.uid, email: user.email ?? targetEmail, role: targetRole, status: user.disabled ? "suspended" : "active", updatedAt: new Date().toISOString() });
    await db.ref("auditLogs").push({ actorUid: "provision-cli", action: "role_provisioned", targetUid: user.uid, role: targetRole, timestamp: new Date().toISOString() });
    console.log(`Assigned ${targetRole} to ${targetEmail} (${user.uid}). Refresh the client ID token.`);
  }
  process.exit(0);
}
if (!email || !role || !ROLES.includes(role)) {
  throw new Error("Usage: pnpm provision:role -- --email <Firebase Auth email> --role <student|admin|superadmin>");
}

const { auth, db } = firebaseAdmin();
const user = await auth.getUserByEmail(email);
await auth.setCustomUserClaims(user.uid, { ...user.customClaims, role });
await db.ref(`users/${user.uid}`).update({ uid: user.uid, email: user.email ?? email, role, status: user.disabled ? "suspended" : "active", updatedAt: new Date().toISOString() });
await db.ref("auditLogs").push({ actorUid: "provision-cli", action: "role_provisioned", targetUid: user.uid, role, timestamp: new Date().toISOString() });
console.log(`Assigned ${role} to ${email} (${user.uid}). The user must refresh their ID token or sign in again.`);
