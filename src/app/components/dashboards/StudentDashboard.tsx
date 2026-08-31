import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { adminApi } from "@/lib/supabase/adminService";
import { SecurePDFViewer } from "../viewer/SecurePDFViewer";
import { StudentLearningView } from "../student/StudentLearningView";
import { StudentProfileView } from "../student/StudentProfileView";

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

type TabType = "dashboard" | "ai" | "profile";

export function StudentDashboard() {
  const { appUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Detect active tab from URL path if applicable
  const pathSegment = location.pathname.split("/").pop() || "dashboard";
  const initialTab: TabType =
    pathSegment === "ai" ? "ai" : pathSegment === "profile" ? "profile" : "dashboard";

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Sync tab with URL if user navigates
  useEffect(() => {
    if (pathSegment === "ai") setActiveTab("ai");
    else if (pathSegment === "profile") setActiveTab("profile");
    else setActiveTab("dashboard");
  }, [location.pathname]);

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    navigate(`/app/${tab === "dashboard" ? "dashboard" : tab}`);
  };

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

    let pdfWindow: Window | null = null;
    try {
      pdfWindow = window.open("about:blank", "_blank");
    } catch {
      // ignore popup blocker catch
    }

    try {
      const res = await adminApi.getStudentSignedNoteUrl(note.id);
      if (res?.signedUrl) {
        if (pdfWindow && !pdfWindow.closed) {
          pdfWindow.location.href = res.signedUrl;
        } else {
          setActiveViewer({
            url: res.signedUrl,
            title: note.title,
            subject: note.subject ?? undefined,
            semester: note.semester ?? undefined,
          });
        }
        return;
      }
      throw new Error("Signed URL not returned");
    } catch (err: any) {
      if (pdfWindow && !pdfWindow.closed) {
        pdfWindow.close();
      }
      console.error("Open note error:", err);
      setMessage({
        text: err.message || "This note is currently unavailable. Please verify your course access.",
        type: "error",
      });
    } finally {
      setOpeningId(null);
    }
  }

  const studentName = appUser?.name || "Student";
  const studentSemester = appUser?.semester || 1;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      {/* ── Desktop Navigation Sidebar ──────────────────────────────── */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 p-6 flex-col justify-between shrink-0 shadow-2xs">
        <div>
          {/* Brand Header */}
          <div className="flex items-center gap-3 pb-6 border-b border-slate-100 mb-6">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-600 text-white font-black shadow-md shadow-indigo-600/20 text-sm">
              BV
            </div>
            <div>
              <h1 className="font-black text-sm tracking-tight text-slate-900 leading-tight">
                BCA VAULT
              </h1>
              <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                Student Portal
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button
              onClick={() => switchTab("dashboard")}
              className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold transition text-left ${
                activeTab === "dashboard"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => switchTab("ai")}
              className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold transition text-left ${
                activeTab === "ai"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
              <span>AI Learning Assistant</span>
            </button>

            <button
              onClick={() => switchTab("profile")}
              className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold transition text-left ${
                activeTab === "profile"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <User className="h-4 w-4 shrink-0" />
              <span>My Profile</span>
            </button>
          </nav>
        </div>

        {/* Bottom Sign Out */}
        <div className="pt-6 border-t border-slate-100">
          <div className="mb-3 px-2">
            <p className="text-xs font-bold text-slate-800 truncate">{studentName}</p>
            <p className="text-[11px] text-slate-400">Semester {studentSemester}</p>
          </div>
          <button
            onClick={() => void logout()}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile Navigation Header ────────────────────────────────── */}
      <div className="md:hidden border-b border-slate-200 bg-white sticky top-0 z-30 px-4 py-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600 text-white font-black text-xs">
              BV
            </div>
            <div>
              <span className="font-black text-xs text-slate-900">BCA VAULT</span>
              <span className="block text-[10px] text-indigo-600 font-bold uppercase tracking-wider">
                Student Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <nav className="mt-3 pt-3 border-t border-slate-100 space-y-1">
            <button
              onClick={() => switchTab("dashboard")}
              className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-bold transition text-left ${
                activeTab === "dashboard"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => switchTab("ai")}
              className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-bold transition text-left ${
                activeTab === "ai"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>AI Learning Assistant</span>
            </button>
            <button
              onClick={() => switchTab("profile")}
              className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-bold transition text-left ${
                activeTab === "profile"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <User className="h-4 w-4" />
              <span>My Profile</span>
            </button>
            <button
              onClick={() => void logout()}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </nav>
        )}
      </div>

      {/* ── Main View Container ─────────────────────────────────────── */}
      <main className="flex-1 min-w-0 bg-slate-50 flex flex-col">
        {/* VIEW 1: AI LEARNING ASSISTANT (FULL-PAGE) */}
        {activeTab === "ai" && (
          <StudentLearningView onBackToDashboard={() => switchTab("dashboard")} />
        )}

        {/* VIEW 2: MY PROFILE */}
        {activeTab === "profile" && <StudentProfileView />}

        {/* VIEW 3: MAIN DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="mx-auto max-w-5xl w-full px-4 py-8 sm:px-6 space-y-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Welcome, {studentName}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                  Your BCA learning space
                </p>
              </div>

              <button
                onClick={() => void loadData()}
                className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition shadow-2xs"
                title="Refresh materials"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </header>

            {message && (
              <div
                role="alert"
                className={`flex items-center gap-3 rounded-2xl p-4 text-xs font-medium ${
                  message.type === "error"
                    ? "border border-red-200 bg-red-50 text-red-700"
                    : "border border-indigo-200 bg-indigo-50 text-indigo-700"
                }`}
              >
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <span>{message.text}</span>
              </div>
            )}

            {/* AI Learning Assistant Hero Card */}
            <section className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/50 p-6 sm:p-7 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-bold text-indigo-800">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    AI Academic Assistant
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Need help understanding a topic?
                  </h2>
                  <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                    Ask the BCA Vault AI Learning Assistant for step-by-step topic explanations, code walkthroughs, and exam questions.
                  </p>
                </div>

                <button
                  onClick={() => switchTab("ai")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition shrink-0"
                >
                  <span>Ask AI</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>

            {/* Active Courses Section */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xs">
              <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Active Courses</h2>
                  <p className="text-xs text-slate-500">Authorized curriculum packages linked to your account</p>
                </div>
              </div>

              {access.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <Package className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-xs font-bold text-slate-700">No active course access found</p>
                  <p className="mt-1 text-[11px] text-slate-500 max-w-md mx-auto">
                    Your course bundle will appear here once your payment verification is complete.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {access.map((item) => {
                    const title = Array.isArray(item.bundles)
                      ? item.bundles[0]?.title
                      : item.bundles?.title;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                      >
                        <div className="space-y-1">
                          <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
                            Semester {studentSemester}
                          </span>
                          <h3 className="text-xs font-bold text-slate-900">
                            {title || "BCA Semester Complete Notes"}
                          </h3>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* My Notes Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">My Notes</h2>
                  <p className="text-xs text-slate-500">Official syllabus notes, PYQ analysis & guides</p>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  {notes.length} {notes.length === 1 ? "document" : "documents"}
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : notes.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
                  <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
                  <h3 className="mt-3 text-sm font-bold text-slate-800">No notes available yet</h3>
                  <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                    Notes for your bundle are being prepared. Check back shortly.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {notes.map((note) => (
                    <article
                      key={note.id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-sm transition"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                            <FileText className="h-4 w-4" />
                          </div>
                          {note.semester && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                              Sem {note.semester}
                            </span>
                          )}
                        </div>

                        <h3 className="mt-3 text-sm font-bold text-slate-900 leading-snug">
                          {note.title}
                        </h3>
                        <p className="mt-1 text-[11px] font-semibold text-indigo-600">
                          {note.subject || "General Theory"}
                        </p>
                        {note.description && (
                          <p className="mt-2 text-xs leading-5 text-slate-500 line-clamp-2">
                            {note.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-100">
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
        )}
      </main>

      {/* Secure PDF Modal Viewer */}
      {activeViewer && (
        <SecurePDFViewer
          url={activeViewer.url}
          title={activeViewer.title}
          subject={activeViewer.subject}
          semester={activeViewer.semester}
          onClose={() => setActiveViewer(null)}
        />
      )}
    </div>
  );
}
