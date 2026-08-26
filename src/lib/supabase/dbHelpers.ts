import { serverFetch } from "./client";
import type { AppUser, Note, Bundle, Order, ActivityLog, PlatformStats } from "./types";

export type { AppUser, Note, Bundle, Order, ActivityLog, PlatformStats } from "./types";

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUserById(uid: string): Promise<AppUser | null> {
  const res = await serverFetch(`/users/${uid}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.user ?? null;
}

export async function getAllUsers(): Promise<AppUser[]> {
  const res = await serverFetch("/users");
  if (!res.ok) return [];
  const data = await res.json();
  return data.users ?? [];
}

export async function updateUser(uid: string, updates: Partial<AppUser>): Promise<AppUser | null> {
  const res = await serverFetch(`/users/${uid}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user ?? null;
}

export async function deleteUser(uid: string): Promise<boolean> {
  const res = await serverFetch(`/users/${uid}`, { method: "DELETE" });
  return res.ok;
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export async function getAllNotes(): Promise<Note[]> {
  const res = await serverFetch("/notes");
  if (!res.ok) return [];
  const data = await res.json();
  return data.notes ?? [];
}

export async function getPublishedNotes(): Promise<Note[]> {
  const res = await serverFetch("/notes?published=true");
  if (!res.ok) return [];
  const data = await res.json();
  return data.notes ?? [];
}

export async function createNote(note: Omit<Note, "id" | "createdAt" | "downloadCount" | "purchaseCount">): Promise<Note | null> {
  const res = await serverFetch("/notes", {
    method: "POST",
    body: JSON.stringify(note),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.note ?? null;
}

export async function updateNote(id: string, updates: Partial<Note>): Promise<Note | null> {
  const res = await serverFetch(`/notes/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.note ?? null;
}

export async function deleteNote(id: string): Promise<boolean> {
  const res = await serverFetch(`/notes/${id}`, { method: "DELETE" });
  return res.ok;
}

// ─── Bundles ──────────────────────────────────────────────────────────────────

export async function getAllBundles(): Promise<Bundle[]> {
  const res = await serverFetch("/bundles");
  if (!res.ok) return [];
  const data = await res.json();
  return data.bundles ?? [];
}

export async function getPublishedBundles(): Promise<Bundle[]> {
  const res = await serverFetch("/bundles?published=true");
  if (!res.ok) return [];
  const data = await res.json();
  return data.bundles ?? [];
}

export async function createBundle(bundle: Omit<Bundle, "id" | "createdAt" | "purchaseCount">): Promise<Bundle | null> {
  const res = await serverFetch("/bundles", {
    method: "POST",
    body: JSON.stringify(bundle),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.bundle ?? null;
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function getUserOrders(uid: string): Promise<Order[]> {
  const res = await serverFetch(`/orders/user/${uid}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.orders ?? [];
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getPlatformStats(): Promise<PlatformStats> {
  const res = await serverFetch("/stats");
  if (!res.ok) return { totalUsers: 0, totalNotes: 0, totalBundles: 0, totalOrders: 0, totalRevenue: 0 };
  const data = await res.json();
  return data.stats;
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export async function getActivityLogs(limit = 50): Promise<ActivityLog[]> {
  const res = await serverFetch(`/activity?limit=${limit}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.logs ?? [];
}

export async function logActivity(action: string, role: string, meta?: Record<string, string>): Promise<void> {
  await serverFetch("/activity", {
    method: "POST",
    body: JSON.stringify({ action, role, meta }),
  });
}
