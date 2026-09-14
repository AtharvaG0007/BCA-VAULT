import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, Search, Trash2, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { adminSupabase, publicAnonKey, supabaseUrl } from "@/lib/supabase/client";

type Student = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  course: string | null;
  semester: number | null;
  status: string | null;
  created_at: string | null;
};

export function AdminUserDeletionPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Student | null>(null);
  const [confirmation, setConfirmation] = useState("");

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const query = adminSupabase
        .from("profiles")
        .select("user_id,full_name,email,phone,course,semester,status,created_at")
        .order("created_at", { ascending: false })
        .range(0, 199);
      const q = search.trim();
      const result = q
        ? await query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
        : await query;
      if (result.error) throw result.error;
      setStudents((result.data ?? []) as Student[]);
    } catch (error: any) {
      toast.error(error?.message || "Unable to load students.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadStudents(), 250);
    return () => window.clearTimeout(timer);
  }, [loadStudents]);

  const openDelete = (student: Student) => {
    setSelected(student);
    setConfirmation("");
  };

  const closeDelete = () => {
    if (deleting) return;
    setSelected(null);
    setConfirmation("");
  };

  const permanentlyDelete = async () => {
    if (!selected || confirmation !== "DELETE") return;
    setDeleting(true);
    try {
      const { data: { session } } = await adminSupabase.auth.getSession();
      if (!session?.access_token) throw new Error("Admin session expired. Please sign in again.");

      const response = await fetch(`${supabaseUrl}/functions/v1/admin-delete-student`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": publicAnonKey,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: selected.user_id, confirmation: "DELETE" }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Permanent deletion failed.");
      }

      const deletedId = selected.user_id;
      setStudents((current) => current.filter((student) => student.user_id !== deletedId));
      setSelected(null);
      setConfirmation("");
      toast.success("Student permanently deleted.");
    } catch (error: any) {
      toast.error(error?.message || "Unable to completely delete this student.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-5 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-rose-400">System / Danger Zone</p>
            <h1 className="mt-1 text-2xl font-black text-white">Permanent User Deletion</h1>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
              Permanently remove a student and their BCA Vault application data. This also handles profiles whose Supabase Auth account was already deleted.
            </p>
          </div>
          <div className="rounded-xl border border-rose-900/70 bg-rose-950/30 px-3 py-2 text-[11px] font-bold text-rose-300">
            Irreversible action
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student name, email or phone..."
              className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading students...
            </div>
          ) : students.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center text-center">
              <UserRound className="mb-3 h-8 w-8 text-slate-700" />
              <p className="text-sm font-bold text-slate-300">No students found</p>
              <p className="mt-1 text-xs text-slate-600">Try another search.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="border-b border-slate-800 text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-bold">Student</th>
                    <th className="px-5 py-3 font-bold">Contact</th>
                    <th className="px-5 py-3 font-bold">Course</th>
                    <th className="px-5 py-3 font-bold">Status</th>
                    <th className="px-5 py-3 text-right font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {students.map((student) => (
                    <tr key={student.user_id} className="hover:bg-slate-900/50">
                      <td className="px-5 py-4">
                        <p className="font-bold text-white">{student.full_name || "Unnamed Student"}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-slate-600">{student.user_id}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-slate-300">{student.email || "—"}</p>
                        <p className="mt-0.5 text-[10px] text-slate-600">{student.phone || "No phone"}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-400">
                        {student.course || "BCA"} · Sem {student.semester || 1}
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-bold text-slate-400">
                          {student.status || "unknown"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => openDelete(student)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-800/80 bg-rose-950/40 px-3 py-2 text-[11px] font-bold text-rose-300 transition hover:bg-rose-900/60 hover:text-white"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete Permanently
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl border border-rose-900/80 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-950 text-rose-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Delete student permanently?</h2>
                  <p className="mt-1 text-xs text-slate-500">This cannot be undone.</p>
                </div>
              </div>
              <button onClick={closeDelete} disabled={deleting} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="font-bold text-white">{selected.full_name || "Unnamed Student"}</p>
              <p className="mt-1 text-xs text-slate-400">{selected.email || "No email"}</p>
            </div>

            <div className="mt-4 rounded-xl border border-rose-900/60 bg-rose-950/20 p-4 text-xs leading-6 text-rose-200">
              This permanently removes the account/profile, payments, access, referrals, rewards, email records, legal acceptance, activity records and user-specific payment evidence. If the Auth account was already deleted, its remaining BCA Vault data will still be cleaned up.
            </div>

            <label className="mt-5 block text-xs font-bold text-slate-300">
              Type <span className="font-mono text-rose-400">DELETE</span> to confirm
              <input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                disabled={deleting}
                autoFocus
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-rose-500"
              />
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={closeDelete} disabled={deleting} className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800">
                Cancel
              </button>
              <button
                onClick={() => void permanentlyDelete()}
                disabled={deleting || confirmation !== "DELETE"}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {deleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
