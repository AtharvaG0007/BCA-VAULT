import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  Flame,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { adminApi } from "@/lib/supabase/adminService";
import { ProtectedPdfViewer } from "../viewer/ProtectedPdfViewer";
import { StudentLearningView } from "../student/StudentLearningView";
import { StudentProfileView } from "../student/StudentProfileView";
import { StudentReferralView } from "../student/StudentReferralView";
import { Gift } from "lucide-react";

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
  priority?: string | null;
  status?: string | null;
}

type TabType = "dashboard" | "ai" | "profile" | "referral";

export function StudentDashboard() {
  const { appUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Detect active tab from URL path if applicable
  const pathSegment = location.pathname.split("/").pop() || "dashboard";
  const initialTab: TabType =
    pathSegment === "ai"
      ? "ai"
      : pathSegment === "profile"
      ? "profile"
      : pathSegment === "referral"
      ? "referral"
      : "dashboard";

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [access, setAccess] = useState<AccessItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [noteCategory, setNoteCategory] = useState<"all" | "repeated" | "theory" | "pyq">("all");
  const [noteSearch, setNoteSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [activeViewer, setActiveViewer] = useState<{
    url: string;
    title: string;
    subject?: string;
    semester?: number;
    expiresIn?: number;
    watermarkData?: {
      studentName?: string;
      studentEmail?: string;
      studentId?: string;
      sessionTimestamp?: string;
    };
  } | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "error" | "info" } | null>(null);

  // Sync tab with URL if user navigates
  useEffect(() => {
    if (pathSegment === "ai") setActiveTab("ai");
    else if (pathSegment === "profile") setActiveTab("profile");
    else if (pathSegment === "referral") setActiveTab("referral");
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
          .select("id,title,subject,semester,description,storage_bucket,storage_path,priority,status")
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
          expiresIn: res.expiresIn || 180,
          watermarkData: res.watermark,
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

            <button
              onClick={() => switchTab("referral")}
              className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold transition text-left ${
                activeTab === "referral"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Gift className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>Referral Program</span>
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
              onClick={() => switchTab("referral")}
              className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-bold transition text-left ${
                activeTab === "referral"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Gift className="h-4 w-4 text-emerald-500" />
              <span>Referral Program</span>
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

        {/* VIEW 3: REFERRAL PROGRAM */}
        {activeTab === "referral" && (
          <StudentReferralView
            onOpenNote={(note) => void openNote(note)}
            openingId={openingId}
          />
        )}

        {/* VIEW 4: MAIN DASHBOARD */}
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

            {/* Featured: Most Repeated Questions High-Priority Card */}
            {(() => {
              const isMostRepeated = (n: NoteItem) =>
                n.title.toLowerCase().includes("repeated") ||
                n.priority === "high" ||
                n.storage_path?.toLowerCase().includes("repeated");

              const isPYQ = (n: NoteItem) =>
                n.title.toLowerCase().includes("pyq") || n.title.toLowerCase().includes("previous");

              const isTheory = (n: NoteItem) =>
                !isMostRepeated(n) && !isPYQ(n);

              const getRepeatedQuestionDetails = (note: NoteItem) => {
                const isRep = isMostRepeated(note);
                if (!isRep) {
                  return {
                    isRepeated: false,
                    displayTitle: note.title,
                    subtitle: note.semester ? `BCA Semester ${note.semester}` : (note.subject || "Study Material"),
                    chips: note.subject ? [note.subject] : [],
                    description: note.description,
                  };
                }

                // Derive subjects/topics dynamically from subject metadata
                const parsedChips = note.subject
                  ? note.subject
                      .split(/[•·|,]/)
                      .map((s) => s.trim())
                      .filter(Boolean)
                  : [];

                const defaultCoverage = [
                  "Foundation of Computing",
                  "C Programming",
                  "HTML",
                  "CSS",
                  "JavaScript",
                ];

                const chips = parsedChips.length > 0 ? parsedChips : defaultCoverage;

                const hasQuestions = note.title.toLowerCase().includes("question");
                const defaultTitle = hasQuestions ? "Most Repeated Questions" : "Most Repeated Topics";
                return {
                  isRepeated: true,
                  displayTitle: note.title || defaultTitle,
                  subtitle: note.semester ? `BCA Semester ${note.semester}` : "BCA Semester 1",
                  chips,
                  description:
                    note.description ||
                    (hasQuestions
                      ? "Exam-focused repeated questions collected from previous-year examination patterns for Semester 1 revision."
                      : "Exam-focused repeated topics and key concepts organized for Semester 1 revision."),
                };
              };

              const featuredRepeatedNote = notes.find(isMostRepeated);

              const filteredNotes = notes.filter((n) => {
                if (noteCategory === "repeated" && !isMostRepeated(n)) return false;
                if (noteCategory === "pyq" && !isPYQ(n)) return false;
                if (noteCategory === "theory" && !isTheory(n)) return false;
                if (noteSearch.trim()) {
                  const q = noteSearch.toLowerCase().trim();
                  const matchTitle = n.title.toLowerCase().includes(q);
                  const matchSubject = n.subject?.toLowerCase().includes(q);
                  const matchDesc = n.description?.toLowerCase().includes(q);
                  return Boolean(matchTitle || matchSubject || matchDesc);
                }
                return true;
              });

              return (
                <>
                  {featuredRepeatedNote && (() => {
                    const details = getRepeatedQuestionDetails(featuredRepeatedNote);
                    return (
                      <section className="relative overflow-hidden rounded-3xl border-2 border-amber-400/40 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300">
                                <Flame className="h-4 w-4 text-amber-400" />
                                <span>High Priority · Exam Intelligence</span>
                              </div>
                              <span className="rounded-full bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 text-xs font-bold text-indigo-200">
                                {details.subtitle}
                              </span>
                            </div>

                            <div>
                              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                                {details.displayTitle}
                              </h2>
                              <p className="mt-1.5 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                                {details.description}
                              </p>
                            </div>

                            {/* Subject Coverage Chips */}
                            <div>
                              <p className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-2">
                                Covered Subjects & Topics:
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                {details.chips.map((chip, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center rounded-xl bg-indigo-950/80 border border-indigo-500/30 px-3 py-1 text-xs font-semibold text-indigo-100 shadow-2xs"
                                  >
                                    {chip}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 font-medium">
                              <span>Protected PDF Viewer</span>
                              <span>•</span>
                              <span>Dynamic Forensic Watermark</span>
                            </div>
                          </div>

                          <button
                            onClick={() => void openNote(featuredRepeatedNote)}
                            disabled={openingId === featuredRepeatedNote.id}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-6 py-4 text-xs font-black text-slate-950 shadow-lg shadow-amber-400/20 hover:bg-amber-300 disabled:bg-slate-700 transition shrink-0 uppercase tracking-wider"
                          >
                            {openingId === featuredRepeatedNote.id ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin text-slate-950" /> Opening Material…
                              </>
                            ) : (
                              <>
                                <Flame className="h-4 w-4 text-slate-950" /> Read {featuredRepeatedNote.title.toLowerCase().includes("question") ? "Most Repeated Questions" : "Most Repeated Topics"}
                              </>
                            )}
                          </button>
                        </div>
                      </section>
                    );
                  })()}

                  {/* Study Materials Hub Section */}
                  <section className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">Study Materials Hub</h2>
                        <p className="text-xs text-slate-500">
                          Categorized unit notes, solved PYQs & high-priority exam questions
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-slate-400 self-start sm:self-auto">
                        Showing {filteredNotes.length} of {notes.length} {notes.length === 1 ? "document" : "documents"}
                      </span>
                    </div>

                    {/* Category Filter Pills & Search Bar */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/60 rounded-2xl">
                        <button
                          onClick={() => setNoteCategory("all")}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                            noteCategory === "all"
                              ? "bg-white text-indigo-700 shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          All ({notes.length})
                        </button>
                        <button
                          onClick={() => setNoteCategory("repeated")}
                          className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                            noteCategory === "repeated"
                              ? "bg-amber-400 text-slate-950 shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <Flame className="h-3.5 w-3.5 text-amber-600" />
                          Most Repeated ({notes.filter(isMostRepeated).length})
                        </button>
                        <button
                          onClick={() => setNoteCategory("theory")}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                            noteCategory === "theory"
                              ? "bg-white text-indigo-700 shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Theory Notes ({notes.filter(isTheory).length})
                        </button>
                        <button
                          onClick={() => setNoteCategory("pyq")}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                            noteCategory === "pyq"
                              ? "bg-white text-indigo-700 shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Solved PYQs ({notes.filter(isPYQ).length})
                        </button>
                      </div>

                      {/* Keyword Search */}
                      <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          value={noteSearch}
                          onChange={(e) => setNoteSearch(e.target.value)}
                          placeholder="Search materials…"
                          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>
                    </div>

                    {loading ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                      </div>
                    ) : filteredNotes.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
                        <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
                        <h3 className="mt-3 text-sm font-bold text-slate-800">No documents found</h3>
                        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                          {noteSearch
                            ? `No materials match your search "${noteSearch}". Try adjusting your filters.`
                            : "No materials are currently published in this category."}
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredNotes.map((note) => {
                          const isRep = isMostRepeated(note);
                          const isPyq = isPYQ(note);
                          const details = getRepeatedQuestionDetails(note);
                          return (
                            <article
                              key={note.id}
                              className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-2xs hover:shadow-sm transition ${
                                isRep ? "border-amber-300/80 ring-1 ring-amber-200/50" : "border-slate-200"
                              }`}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div
                                    className={`grid h-9 w-9 place-items-center rounded-xl ${
                                      isRep
                                        ? "bg-amber-100 text-amber-700"
                                        : isPyq
                                        ? "bg-purple-100 text-purple-700"
                                        : "bg-indigo-50 text-indigo-600"
                                    }`}
                                  >
                                    {isRep ? <Flame className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {isRep && (
                                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                        🔥 High Priority
                                      </span>
                                    )}
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                      {details.subtitle}
                                    </span>
                                  </div>
                                </div>

                                <h3 className="mt-3 text-sm font-bold text-slate-900 leading-snug">
                                  {details.displayTitle}
                                </h3>

                                {isRep ? (
                                  <div className="mt-2.5 space-y-2">
                                    <div className="flex flex-wrap gap-1">
                                      {details.chips.map((chip, idx) => (
                                        <span
                                          key={idx}
                                          className="rounded-md bg-amber-50 border border-amber-200/60 px-2 py-0.5 text-[10px] font-semibold text-amber-900"
                                        >
                                          {chip}
                                        </span>
                                      ))}
                                    </div>
                                    <p className="text-xs leading-5 text-slate-500 line-clamp-2">
                                      {details.description}
                                    </p>
                                  </div>
                                ) : (
                                  <>
                                    <p
                                      className={`mt-1 text-[11px] font-semibold ${
                                        isPyq ? "text-purple-700" : "text-indigo-600"
                                      }`}
                                    >
                                      {note.subject || "General Theory"}
                                    </p>
                                    {note.description && (
                                      <p className="mt-2 text-xs leading-5 text-slate-500 line-clamp-2">
                                        {note.description}
                                      </p>
                                    )}
                                  </>
                                )}
                              </div>

                              <div className="mt-5 pt-3 border-t border-slate-100">
                                <button
                                  onClick={() => void openNote(note)}
                                  disabled={openingId === note.id}
                                  className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition ${
                                    isRep
                                      ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold"
                                      : "bg-indigo-600 hover:bg-indigo-700"
                                  } disabled:bg-slate-300`}
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
                          );
                        })}
                      </div>
                    )}
                  </section>
                </>
              );
            })()}
          </div>
        )}
      </main>

      {/* Protected PDF Modal Viewer */}
      {activeViewer && (
        <ProtectedPdfViewer
          url={activeViewer.url}
          title={activeViewer.title}
          subject={activeViewer.subject}
          semester={activeViewer.semester}
          expiresIn={activeViewer.expiresIn}
          watermarkData={activeViewer.watermarkData}
          onClose={() => setActiveViewer(null)}
          onSessionExpired={() => {
            setActiveViewer(null);
            setMessage({
              text: "Viewing session expired. Click 'Open & Read Securely' to refresh access.",
              type: "info",
            });
          }}
        />
      )}
    </div>
  );
}
