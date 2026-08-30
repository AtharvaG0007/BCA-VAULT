import { useEffect, useState } from "react";
import { BookOpen, Download, FileText, Loader2, LogOut, Package, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { adminApi } from "@/lib/supabase/adminService";
import { SecurePDFViewer } from "../viewer/SecurePDFViewer";

interface AccessItem {
  id: string;
  bundle_id: string;
  status: string;
  bundles: { title: string; price: number } | { title: string; price: number }[] | null;
}

interface NoteItem {
  id: string;
  title: string;
  subject: string | null;
  semester: number | null;
  description: string;
  storage_bucket: string;
  storage_path: string;
}

export function StudentDashboard() {
  const { appUser, logout } = useAuth();
  const [access, setAccess] = useState<AccessItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [activeViewer, setActiveViewer] = useState<{
    url: string;
    title: string;
    subject?: string;
    semester?: number;
  } | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "error" | "info" } | null>(null);

  async function loadData() {
    setLoading(true);
    setMessage(null);
    try {
      const [accessRes, notesRes] = await Promise.all([
        supabase
          .from("access_permissions")
          .select("id,bundle_id,status,bundles(title,price)")
          .eq("status", "active"),
        supabase
          .from("notes")
          .select("id,title,subject,semester,description,storage_bucket,storage_path")
          .eq("published", true)
          .order("semester", { ascending: true }),
      ]);

      if (accessRes.error) {
        console.error("Access fetch error:", accessRes.error);
      } else {
        setAccess((accessRes.data ?? []) as unknown as AccessItem[]);
      }

      if (notesRes.error) {
        console.error("Notes fetch error:", notesRes.error);
      } else {
        setNotes((notesRes.data ?? []) as unknown as NoteItem[]);
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
      setMessage({ text: "Failed to load study materials. Please try again.", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function openNote(note: NoteItem) {
    setOpeningId(note.id);
    setMessage(null);
    try {
      const res = await adminApi.getStudentSignedNoteUrl(note.id);
      if (res?.signedUrl) {
        setActiveViewer({
          url: res.signedUrl,
          title: note.title,
          subject: note.subject ?? undefined,
          semester: note.semester ?? undefined,
        });
        return;
      }
      throw new Error("Signed URL not returned");
    } catch (err: any) {
      console.error("Open note error:", err);
      setMessage({
        text: err.message || "This note is currently unavailable. Please verify your course access.",
        type: "error",
      });
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-indigo-700">
                Student Library
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-black text-slate-900">
              Welcome, {appUser?.name || "Student"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadData()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              title="Refresh materials"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => void logout()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
        {message && (
          <div
            role="alert"
            className={`flex items-center gap-3 rounded-2xl p-4 text-sm font-medium ${
              message.type === "error"
                ? "border border-red-200 bg-red-50 text-red-700"
                : "border border-indigo-200 bg-indigo-50 text-indigo-700"
            }`}
          >
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>{message.text}</span>
          </div>
        )}

        {/* Active Bundles Section */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Active Course Bundles</h2>
              <p className="text-xs text-slate-500">Authorized materials linked to your account</p>
            </div>
          </div>

          <div className="mt-4">
            {access.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <Package className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-2 text-sm font-bold text-slate-700">No active bundles found</p>
                <p className="mt-1 text-xs text-slate-500">
                  If you recently submitted payment evidence, it will appear here after manual verification.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {access.map((item) => {
                  const title = Array.isArray(item.bundles)
                    ? item.bundles[0]?.title
                    : item.bundles?.title;
                  return (
                    <div
                      key={item.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/80 px-3.5 py-2 text-xs font-bold text-indigo-900"
                    >
                      <Package className="h-4 w-4 text-indigo-600" />
                      {title || "BCA Vault Theory Bundle"}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Notes Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Authorized Study Notes</h2>
              <p className="text-xs text-slate-500">PDFs, PYQs, and topic-wise material</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {notes.length} {notes.length === 1 ? "document" : "documents"} available
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : notes.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-base font-bold text-slate-800">No notes available yet</h3>
              <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
                {access.length === 0
                  ? "Access to theory notes and PYQs is granted once your payment is verified by the administration."
                  : "Notes for your bundle are being prepared. Check back shortly."}
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {notes.map((note) => (
                <article
                  key={note.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                        <FileText className="h-5 w-5" />
                      </div>
                      {note.semester && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                          Semester {note.semester}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-4 text-base font-bold text-slate-900 leading-snug">
                      {note.title}
                    </h3>
                    <p className="mt-1 text-xs font-medium text-indigo-600">
                      {note.subject || "General Theory"}
                    </p>
                    {note.description && (
                      <p className="mt-2 text-xs leading-5 text-slate-500 line-clamp-3">
                        {note.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => void openNote(note)}
                      disabled={openingId === note.id}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:bg-slate-300 transition"
                    >
                      {openingId === note.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Opening PDF…
                        </>
                      ) : (
                        <>
                          <Download className="h-3.5 w-3.5" /> Open & Read Securely
                        </>
                      )}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {activeViewer && (
        <SecurePDFViewer
          url={activeViewer.url}
          title={activeViewer.title}
          subject={activeViewer.subject}
          semester={activeViewer.semester}
          onClose={() => setActiveViewer(null)}
        />
      )}
    </main>
  );
}

