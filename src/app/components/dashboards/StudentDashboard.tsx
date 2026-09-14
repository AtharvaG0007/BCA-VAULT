import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  FileText,
  Flame,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  Menu,
  MessageSquare,
  NotebookPen,
  Package,
  PenLine,
  RefreshCw,
  Route,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
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
import { StudentNoticeBoard } from "../student/StudentNoticeBoard";
import { Bell, Gift } from "lucide-react";

interface AccessItem {
  id: string;
  bundle_id: string;
  status: string;
  bundles: { title: string; price: number } | { title: string; price: number }[] | null;
}

interface PaymentRecord {
  id: string;
  reference_id?: string;
  amount?: number;
  utr?: string;
  status?: string;
  created_at?: string;
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

type TabType = "dashboard" | "ai" | "profile" | "notices" | "referral";

type CanonicalTopicSubject =
  | "C Programming"
  | "Foundation of Computing"
  | "Client-Side Web Technology";

const CANONICAL_C_PROGRAMMING_NOTE_ID = "9e59ab23-0de4-480e-a657-6a5de642c5e9";
const DUPLICATE_ALGORITHM_DESIGN_NOTE_ID = "67223491-a665-44b0-8307-b2a22dd30de2";
const CANONICAL_FOUNDATION_NOTE_ID = "480f00c8-b176-4d31-a030-2539e378a3c4";

const SEM1_MOST_REPEATED_TOPIC_NOTE_IDS = [
  CANONICAL_C_PROGRAMMING_NOTE_ID,
  CANONICAL_FOUNDATION_NOTE_ID,
];

const REFERRAL_BONUS_QUESTION_NOTE_IDS = [
  "6d971cc5-5677-43f5-958f-add182553c87", // C Programming — Most Repeated Questions
  "33cc389f-4a00-4d3e-89dd-670e514e2ed3", // Foundation of Computing — Most Repeated Questions
  "20af0ae2-66e3-46cb-bbc2-4ae8e12f0500", // Client-Side Web Technologies — Most Repeated Questions
];

const isReferralReward = (n: NoteItem) =>
  REFERRAL_BONUS_QUESTION_NOTE_IDS.includes(n.id) ||
  n.storage_path?.toLowerCase().includes("refral_bouns") ||
  n.storage_path?.toLowerCase().includes("repted_questions") ||
  n.storage_path?.toLowerCase().includes("questions_complete");

// Identify Exam Roadmap PDFs
const isExamRoadmap = (n: NoteItem) => {
  const p = (n.storage_path || "").toLowerCase();
  const t = (n.title || "").toLowerCase();
  return p.includes("roadmap") || t.includes("roadmap");
};

// Identify Exam Answer Writing Guide PDF
const isExamAnswerWritingGuide = (n: NoteItem) => {
  const p = (n.storage_path || "").toLowerCase();
  const t = (n.title || "").toLowerCase();
  return (
    p.includes("how_to_write_answers") ||
    p.includes("write_answers") ||
    t.includes("how to write answers") ||
    t.includes("answer writing")
  );
};

// The Algorithm & Program Design Using C record is an alternate batch/course naming duplicate of C Programming
const isDuplicateCProgRecord = (n: NoteItem) =>
  n.id === DUPLICATE_ALGORITHM_DESIGN_NOTE_ID ||
  (Boolean(n.storage_path?.toLowerCase().includes("algorithm_program_design")) &&
    n.id !== CANONICAL_C_PROGRAMMING_NOTE_ID);

const getNormalizedTopicSubject = (n: NoteItem): CanonicalTopicSubject | null => {
  if (isReferralReward(n) || isExamRoadmap(n) || isExamAnswerWritingGuide(n)) return null;

  const s = (n.subject || "").toLowerCase();
  const t = (n.title || "").toLowerCase();
  const p = (n.storage_path || "").toLowerCase();

  // 1. C Programming variations
  if (
    n.id === CANONICAL_C_PROGRAMMING_NOTE_ID ||
    n.id === DUPLICATE_ALGORITHM_DESIGN_NOTE_ID ||
    s.includes("c programming") ||
    s.includes("algorithm") ||
    s.includes("program design") ||
    t.includes("c programming") ||
    t.includes("algorithm") ||
    t.includes("program design") ||
    p.includes("c_programming") ||
    p.includes("algorithm")
  ) {
    return "C Programming";
  }

  // 2. Foundation of Computing
  if (
    n.id === CANONICAL_FOUNDATION_NOTE_ID ||
    s.includes("foundation") ||
    t.includes("foundation") ||
    p.includes("foundation")
  ) {
    return "Foundation of Computing";
  }

  // 3. Client-Side Web Technology variations
  if (
    s.includes("client-side") ||
    s.includes("client side") ||
    s.includes("web technolog") ||
    s.includes("html") ||
    s.includes("javascript") ||
    t.includes("client-side") ||
    t.includes("client side") ||
    t.includes("web technolog") ||
    t.includes("html") ||
    p.includes("client_side") ||
    p.includes("client-side") ||
    p.includes("web_technolog") ||
    p.includes("web-technolog")
  ) {
    return "Client-Side Web Technology";
  }

  return null;
};

const isMostRepeatedTopic = (n: NoteItem) => {
  if (isReferralReward(n) || isDuplicateCProgRecord(n) || isExamRoadmap(n) || isExamAnswerWritingGuide(n)) return false;
  if (
    n.id === CANONICAL_C_PROGRAMMING_NOTE_ID ||
    n.id === CANONICAL_FOUNDATION_NOTE_ID ||
    SEM1_MOST_REPEATED_TOPIC_NOTE_IDS.includes(n.id)
  ) {
    return true;
  }
  const normSubject = getNormalizedTopicSubject(n);
  if (!normSubject) return false;

  const p = (n.storage_path || "").toLowerCase();
  const t = (n.title || "").toLowerCase();
  return (
    p.includes("most_repeated_topics") ||
    p.includes("repeated_topics") ||
    (t.includes("repeated") && t.includes("topic"))
  );
};

const isStudyNote = (n: NoteItem) =>
  !isMostRepeatedTopic(n) && !isReferralReward(n) && !isDuplicateCProgRecord(n) && !isExamRoadmap(n) && !isExamAnswerWritingGuide(n);

// Formats canonical titles and subtitles for the Semester 1 Most Repeated Topics UI
const formatCanonicalTopicNote = (n: NoteItem): NoteItem => {
  const normSubject = getNormalizedTopicSubject(n);
  if (normSubject === "C Programming") {
    return {
      ...n,
      title: "Most Repeated Topics — C Programming",
      subject: "C Programming",
      description:
        n.description ||
        "Focus on the key C programming and program design topics repeatedly examined across previous semester papers.",
    };
  }
  if (normSubject === "Foundation of Computing") {
    return {
      ...n,
      title: "Most Repeated Topics — Foundation of Computing",
      subject: "Foundation of Computing",
      description:
        n.description ||
        "Focus on the key computing fundamentals and architectural topics repeatedly examined across previous semester papers.",
    };
  }
  if (normSubject === "Client-Side Web Technology") {
    return {
      ...n,
      title: "Most Repeated Topics — Client-Side Web Technology",
      subject: "Client-Side Web Technology",
      description:
        n.description ||
        "Focus on the key HTML, CSS, and JavaScript topics repeatedly examined across previous semester papers.",
    };
  }
  return n;
};

const CANONICAL_TOPIC_SUBJECTS: CanonicalTopicSubject[] = [
  "C Programming",
  "Foundation of Computing",
  "Client-Side Web Technology",
];

const topicSortOrder = (subject: CanonicalTopicSubject | null | string) => {
  if (subject === "C Programming") return 1;
  if (subject === "Foundation of Computing") return 2;
  if (subject === "Client-Side Web Technology") return 3;
  return 4;
};

interface ExamRoadmapCardConfig {
  key: string;
  cardTitle: string;
  subjectSubtitle: string;
  badge: string;
  description: string;
  revisionPlan: string;
  pathMatch: string;
  titleMatch: string;
}

const EXAM_ROADMAP_CONFIGS: ExamRoadmapCardConfig[] = [
  {
    key: "c-programming",
    cardTitle: "C Programming",
    subjectSubtitle: "Algorithms and Program Design using C",
    badge: "SEMESTER 1",
    description:
      "Your step-by-step path from algorithms and C fundamentals to functions, pointers, arrays, structures and final revision.",
    revisionPlan: "15-day • 7-day • 3-day • Final revision",
    pathMatch: "c_programming_exam_roadmap",
    titleMatch: "c programming",
  },
  {
    key: "foundations-of-computing",
    cardTitle: "Foundations of Computing",
    subjectSubtitle: "Foundation of Computing",
    badge: "SEMESTER 1",
    description:
      "Follow the syllabus in the right order, focus on high-value areas, and use the 15/7/3-day plans when exams are close.",
    revisionPlan: "15-day • 7-day • 3-day • Final revision",
    pathMatch: "foundations_of_computing_exam_roadmap",
    titleMatch: "foundations of computing",
  },
  {
    key: "client-side-web-technologies",
    cardTitle: "Client-Side Web Technologies",
    subjectSubtitle: "Client-Side Web Technology",
    badge: "SEMESTER 1",
    description:
      "HTML → HTML5 → CSS → JavaScript → Forms, Validation, Events and DOM.",
    revisionPlan: "15-day • 7-day • 3-day • Final revision",
    pathMatch: "client_side_web_technologies_exam_roadmap",
    titleMatch: "client-side web",
  },
];

export function StudentDashboard() {
  const { user, appUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Detect active tab from URL path if applicable
  const pathSegment = location.pathname.split("/").pop() || "dashboard";
  const initialTab: TabType =
    pathSegment === "ai"
      ? "ai"
      : pathSegment === "profile"
      ? "profile"
      : pathSegment === "notices"
      ? "notices"
      : pathSegment === "referral"
      ? "referral"
      : "dashboard";

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [access, setAccess] = useState<AccessItem[]>([]);
  const [latestPayment, setLatestPayment] = useState<PaymentRecord | null>(null);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [noteCategory, setNoteCategory] = useState<"all" | "repeated" | "theory">("all");
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
    else if (pathSegment === "notices") setActiveTab("notices");
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
      const accessPromise = supabase
        .from("access_permissions")
        .select("id,bundle_id,status,bundles(title,price)")
        .eq("status", "active");

      const notesPromise = supabase
        .from("notes")
        .select("id,title,subject,semester,description,storage_bucket,storage_path,priority,status")
        .eq("published", true)
        .order("semester", { ascending: true });

      const paymentPromise = user?.id
        ? supabase
            .from("payment_submissions")
            .select("id,reference_id,amount,utr,status,created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null });

      const [accessRes, notesRes, paymentRes] = await Promise.all([
        accessPromise,
        notesPromise,
        paymentPromise,
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

      if (paymentRes && !paymentRes.error && paymentRes.data) {
        setLatestPayment(paymentRes.data as PaymentRecord);
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
  }, [user?.id]);

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
      throw new Error("Unable to open this document right now. Please try again.");
    } catch (err: any) {
      console.error("Open note error:", err);
      setMessage({
        text: err?.message || "Unable to open this document right now. Please try again.",
        type: "error",
      });
    } finally {
      setOpeningId(null);
    }
  }

  const studentName = appUser?.name || "Student";
  const studentSemester = appUser?.semester || 1;
  const hasActiveBundle = access.length > 0;
  const isPaymentPending = !hasActiveBundle && latestPayment?.status === "pending";
  const isNoPurchase = !hasActiveBundle && !isPaymentPending;

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
              onClick={() => switchTab("notices")}
              className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold transition text-left ${
                activeTab === "notices"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Bell className="h-4 w-4 shrink-0 text-amber-500" />
              <span>Notice Board</span>
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
              onClick={() => switchTab("notices")}
              className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-bold transition text-left ${
                activeTab === "notices"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Bell className="h-4 w-4 text-amber-500" />
              <span>Notice Board</span>
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

        {/* VIEW 3: NOTICE BOARD */}
        {activeTab === "notices" && <StudentNoticeBoard />}

        {/* VIEW 4: REFERRAL PROGRAM */}
        {activeTab === "referral" && (
          <StudentReferralView
            onOpenNote={(note) => void openNote(note)}
            openingId={openingId}
          />
        )}

        {/* VIEW 4: MAIN DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="mx-auto max-w-5xl w-full px-3.5 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 min-w-0">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div>
                <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
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
                className={`flex items-center justify-between gap-3 rounded-2xl p-3.5 sm:p-4 text-xs font-medium ${
                  message.type === "error"
                    ? "border border-red-200 bg-red-50 text-red-700"
                    : "border border-indigo-200 bg-indigo-50 text-indigo-700"
                }`}
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <ShieldAlert className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  <span className="leading-snug">{message.text}</span>
                </div>
                {message.type === "error" && (
                  <button
                    onClick={() => {
                      setMessage(null);
                      void loadData();
                    }}
                    className="shrink-0 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1.5 font-bold transition cursor-pointer text-xs"
                  >
                    Try Again
                  </button>
                )}
              </div>
            )}

            {/* ── State Hero: State A (No Purchase), State B (Pending), or State C (Active) ── */}
            {hasActiveBundle ? (
              /* STATE C: PAYMENT APPROVED / BUNDLE ACTIVE */
              <section className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 p-4 sm:p-6 lg:p-7 shadow-2xs w-full min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Semester 1 Bundle Active</span>
                    </div>
                    <h2 className="text-base sm:text-xl font-bold text-slate-900 leading-snug">
                      Your Semester 1 study materials are ready
                    </h2>
                    <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                      You have full access to official theory notes and most repeated topics. Start studying below or ask the AI assistant whenever you need help.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const el = document.getElementById("study-materials") || document.getElementById("exam-roadmaps");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition shrink-0 cursor-pointer"
                  >
                    <span>Start Studying</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </section>
            ) : isPaymentPending ? (
              /* STATE B: PAYMENT PENDING REVIEW */
              <section className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/50 p-4 sm:p-6 lg:p-8 shadow-2xs w-full min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5">
                  <div className="space-y-2 min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
                      <Clock className="h-3.5 w-3.5 text-amber-600 animate-pulse shrink-0" />
                      <span>⏳ Payment Under Review</span>
                    </div>
                    <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                      Payment Under Review
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
                      Your payment has been submitted successfully. We're reviewing your payment. Your Semester 1 access will appear here once approved.
                    </p>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs pt-1">
                      <span className="font-semibold text-amber-900">Status: ⏳ Payment Pending</span>
                      {latestPayment?.reference_id && (
                        <span className="font-mono text-slate-500 text-[11px] sm:text-xs">
                          Ref: <strong className="text-slate-700">{latestPayment.reference_id}</strong>
                          {latestPayment.utr ? ` • UTR: ${latestPayment.utr}` : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-start sm:items-end gap-2 shrink-0 w-full sm:w-auto">
                    <button
                      onClick={() => void loadData()}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-4 py-2.5 text-xs transition cursor-pointer shadow-xs"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                      <span>Check Payment Status</span>
                    </button>
                    <span className="text-[11px] text-slate-500">Verification usually takes a short time</span>
                  </div>
                </div>
              </section>
            ) : (
              /* STATE A: NEW STUDENT / NO PURCHASE ONBOARDING */
              <section className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50/90 via-white to-amber-50/40 p-4 sm:p-6 lg:p-8 shadow-2xs w-full min-w-0">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
                  <div className="space-y-3 min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100/80 px-3 py-1 text-xs font-bold text-indigo-900 flex-wrap">
                      <span>👋 Welcome to BCA Vault</span>
                      <span className="text-indigo-400 hidden sm:inline">•</span>
                      <span className="text-amber-800 font-semibold">Semester 1 bundle isn't active yet</span>
                    </div>
                    <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                      Get your Semester 1 Study Notes + Most Repeated Topics
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
                      Your account is ready! Complete your bundle purchase to unlock all official Semester 1 study notes and high-priority exam topics in one complete package.
                    </p>
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs font-semibold text-slate-700 pt-1">
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Semester 1 Study Notes
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Semester 1 Most Repeated Topics
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 shrink-0 bg-white/90 border border-indigo-100 rounded-2xl p-4 sm:p-5 shadow-xs w-full lg:w-auto min-w-0">
                    <div>
                      <span className="text-xs font-medium text-slate-500">Semester 1 BCA Bundle</span>
                      <div className="text-2xl sm:text-3xl font-black text-slate-900">₹499</div>
                    </div>
                    <button
                      onClick={() => navigate("/purchase")}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      <span>Buy Semester 1 Bundle</span>
                    </button>
                    <button
                      onClick={() => void loadData()}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline transition cursor-pointer"
                    >
                      Already purchased? Refresh your status
                    </button>
                  </div>
                </div>

                {/* Compact Onboarding Steps */}
                <div className="mt-6 pt-5 border-t border-indigo-100/80">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Here's how it works:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 sm:p-3 min-w-0">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                        <span>1. Account</span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      </div>
                      <p className="text-[10px] text-emerald-700 mt-1">Created ✓</p>
                    </div>

                    <div className="rounded-xl border-2 border-indigo-500 bg-indigo-50/80 p-2.5 sm:p-3 shadow-xs min-w-0">
                      <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                        <span>2. Purchase</span>
                        <span className="rounded bg-indigo-600 text-white text-[9px] px-1.5 py-0.2 font-extrabold uppercase tracking-wider shrink-0">NEXT</span>
                      </div>
                      <p className="text-[10px] text-indigo-800 mt-1">₹499 Package</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white/70 p-2.5 sm:p-3 opacity-80 min-w-0">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                        <span>3. Approval</span>
                        <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Review</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white/70 p-2.5 sm:p-3 opacity-80 min-w-0">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                        <span>4. Study</span>
                        <BookOpen className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Access Notes</p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Active Courses Section */}
            <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-7 shadow-2xs w-full min-w-0">
              <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Active Courses</h2>
                  <p className="text-xs text-slate-500">Authorized curriculum packages linked to your account</p>
                </div>
              </div>

              {loading && access.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                    >
                      <div className="space-y-2">
                        <div className="h-3.5 w-20 bg-indigo-100 rounded-md animate-pulse" />
                        <div className="h-4 w-44 bg-slate-200 rounded animate-pulse" />
                      </div>
                      <div className="h-6 w-20 rounded-full bg-emerald-100/70 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : isPaymentPending ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-800 shrink-0">
                      <Clock className="h-5 w-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Semester 1 Bundle — Verification In Progress</h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Your payment was submitted. Materials unlock automatically as soon as verified by our team.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => void loadData()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-50 transition shrink-0 self-start sm:self-auto cursor-pointer"
                  >
                    <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                    <span>Check Status</span>
                  </button>
                </div>
              ) : isNoPurchase ? (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-700 shrink-0">
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">You haven't purchased the Semester 1 Bundle yet</h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Purchase the bundle to unlock your Semester 1 study materials.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                    <button
                      onClick={() => navigate("/purchase")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition cursor-pointer"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span>Buy Semester 1 Bundle</span>
                    </button>
                    <button
                      onClick={() => void loadData()}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                      title="Refresh status"
                    >
                      <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                      <span>Refresh</span>
                    </button>
                  </div>
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
                            {title || "BCA Semester 1 Complete Bundle"}
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

            {/* ── Materials Categorization & Display ──────────────────────── */}
            {(() => {
              // Strictly Semester 1: exclude Semester 2, referral rewards, duplicate C Programming records, dedicated Roadmaps, and Exam Writing Guide
              const displayableNotes = notes.filter(
                (n) =>
                  (n.semester === 1 || n.semester === null) &&
                  !isReferralReward(n) &&
                  !isDuplicateCProgRecord(n) &&
                  !isExamRoadmap(n) &&
                  !isExamAnswerWritingGuide(n)
              );

              // Deduplicate so each normalized subject has AT MOST one canonical note
              const mostRepeatedTopicNotes = CANONICAL_TOPIC_SUBJECTS.map((subjectKey) => {
                if (subjectKey === "C Programming") {
                  const cProgNote = displayableNotes.find(
                    (n) => n.id === CANONICAL_C_PROGRAMMING_NOTE_ID
                  );
                  if (cProgNote) return formatCanonicalTopicNote(cProgNote);
                }

                if (subjectKey === "Foundation of Computing") {
                  const foundationNote = displayableNotes.find(
                    (n) => n.id === CANONICAL_FOUNDATION_NOTE_ID
                  );
                  if (foundationNote) return formatCanonicalTopicNote(foundationNote);
                }

                const matchedNote = displayableNotes.find(
                  (n) => isMostRepeatedTopic(n) && getNormalizedTopicSubject(n) === subjectKey
                );
                return matchedNote ? formatCanonicalTopicNote(matchedNote) : null;
              }).filter(Boolean) as NoteItem[];

              const filteredNotes = displayableNotes
                .filter((n) => {
                  if (noteCategory === "repeated" && !isMostRepeatedTopic(n)) return false;
                  if (noteCategory === "theory" && !isStudyNote(n)) return false;
                  if (noteSearch.trim()) {
                    const q = noteSearch.toLowerCase().trim();
                    const matchTitle = n.title.toLowerCase().includes(q);
                    const matchSubject = n.subject?.toLowerCase().includes(q);
                    const matchDesc = n.description?.toLowerCase().includes(q);
                    return Boolean(matchTitle || matchSubject || matchDesc);
                  }
                  return true;
                })
                .map((n) => (isMostRepeatedTopic(n) ? formatCanonicalTopicNote(n) : n))
                .sort((a, b) => {
                  const isTopicA = isMostRepeatedTopic(a);
                  const isTopicB = isMostRepeatedTopic(b);
                  if (isTopicA && isTopicB) {
                    return (
                      topicSortOrder(getNormalizedTopicSubject(a)) -
                      topicSortOrder(getNormalizedTopicSubject(b))
                    );
                  }
                  if (isTopicA && !isTopicB) return -1;
                  if (!isTopicA && isTopicB) return 1;
                  return 0;
                });

              const examRoadmapCards = EXAM_ROADMAP_CONFIGS.map((cfg) => {
                const matchedNote = notes.find((n) => {
                  if (!isExamRoadmap(n)) return false;
                  const p = (n.storage_path || "").toLowerCase();
                  const t = (n.title || "").toLowerCase();
                  return p.includes(cfg.pathMatch) || t.includes(cfg.titleMatch);
                });
                return {
                  ...cfg,
                  note: matchedNote,
                };
              });

              // Retrieve the Exam Answer Writing Guide note
              const examAnswerGuideNote = notes.find((n) => isExamAnswerWritingGuide(n));

              return (
                <>
                  {/* ── 📚 1. Study Notes & Materials Hub Section ───────────────── */}
                  <section id="study-materials" className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">📚 Study Notes & Materials Hub</h2>
                        <p className="text-xs text-slate-500">
                          Categorized unit study notes & high-priority semester topic guides
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-slate-400 self-start sm:self-auto">
                        Showing {filteredNotes.length} of {displayableNotes.length}{" "}
                        {displayableNotes.length === 1 ? "document" : "documents"}
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
                          All ({displayableNotes.length})
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
                          Most Repeated ({mostRepeatedTopicNotes.length})
                        </button>
                        <button
                          onClick={() => setNoteCategory("theory")}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                            noteCategory === "theory"
                              ? "bg-white text-indigo-700 shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Study Notes ({displayableNotes.filter(isStudyNote).length})
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
                          aria-label="Search study materials"
                          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>
                    </div>

                    {loading ? (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div
                            key={i}
                            className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4"
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="h-9 w-9 rounded-xl bg-indigo-50 animate-pulse" />
                                <div className="h-4 w-16 rounded-full bg-slate-100 animate-pulse" />
                              </div>
                              <div className="h-4 w-44 bg-slate-200 rounded animate-pulse" />
                              <div className="h-3 w-28 bg-indigo-50 rounded animate-pulse" />
                              <div className="space-y-1.5 pt-1">
                                <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
                                <div className="h-3 w-2/3 bg-slate-100 rounded animate-pulse" />
                              </div>
                            </div>
                            <div className="h-8 w-full rounded-xl bg-slate-100 animate-pulse mt-2" />
                          </div>
                        ))}
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
                          const isTopic = isMostRepeatedTopic(note);
                          return (
                            <article
                              key={note.id}
                              className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-2xs hover:shadow-sm transition ${
                                isTopic ? "border-amber-300/80 ring-1 ring-amber-200/50" : "border-slate-200"
                              }`}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div
                                    className={`grid h-9 w-9 place-items-center rounded-xl ${
                                      isTopic
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-indigo-50 text-indigo-600"
                                    }`}
                                  >
                                    {isTopic ? <Flame className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {isTopic && (
                                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                        📌 Most Repeated
                                      </span>
                                    )}
                                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                                      {note.semester ? `Semester ${note.semester}` : "Semester 1"}
                                    </span>
                                  </div>
                                </div>

                                <h3 className="mt-3 text-sm font-bold text-slate-900 leading-snug">
                                  {note.title}
                                </h3>

                                <p
                                  className={`mt-1 text-[11px] font-semibold ${
                                    isTopic
                                      ? "text-amber-800"
                                      : "text-indigo-600"
                                  }`}
                                >
                                  {note.subject || "Study Material"}
                                </p>

                                {note.description && (
                                  <p className="mt-2 text-xs leading-5 text-slate-500 line-clamp-2">
                                    {note.description}
                                  </p>
                                )}
                              </div>

                              <div className="mt-5 pt-3 border-t border-slate-100">
                                {hasActiveBundle ? (
                                  <button
                                    onClick={() => void openNote(note)}
                                    disabled={openingId === note.id}
                                    className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition cursor-pointer ${
                                      isTopic
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
                                        <FileText className="h-3.5 w-3.5" /> View PDF
                                      </>
                                    )}
                                  </button>
                                ) : isPaymentPending ? (
                                  <div className="space-y-1">
                                    <button
                                      disabled
                                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800 opacity-90 cursor-not-allowed"
                                    >
                                      <Clock className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
                                      <span>Payment Under Review</span>
                                    </button>
                                    <p className="text-[10px] text-center text-slate-500">Unlocks automatically once approved</p>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => navigate("/purchase")}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white transition cursor-pointer shadow-xs"
                                  >
                                    <Lock className="h-3.5 w-3.5" />
                                    <span>Unlock with Bundle (₹499)</span>
                                  </button>
                                )}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  {/* ── 🧭 2. Exam Roadmaps Section ────────────────────────────── */}
                  <section
                    id="exam-roadmaps"
                    className="rounded-3xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/30 p-5 sm:p-7 lg:p-8 shadow-2xs space-y-6"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-100 pb-5">
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/80 px-3 py-1 text-xs font-bold text-indigo-900">
                          <Compass className="h-3.5 w-3.5 text-indigo-600" />
                          <span>🧭 Exam Roadmaps · BCA Semester 1</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                          Exam Roadmaps
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                          Know what to study first, what to prioritize, and what to revise before your exam.
                        </p>
                      </div>
                      <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-100/60 rounded-xl px-3 py-1.5 self-start border border-emerald-200/60">
                        <span>High-priority preparation guides</span>
                      </div>
                    </div>

                    {/* Step 9 Subtle Strategic Preparation Framework Banner */}
                    <div className="rounded-2xl border border-indigo-100 bg-white/95 p-4 sm:p-5 shadow-2xs">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Route className="h-4 w-4 text-emerald-600 shrink-0" />
                            <p className="text-xs font-bold text-slate-900">
                              Not sure where to start?{" "}
                              <span className="text-emerald-700 font-extrabold">
                                Start with your Exam Roadmap.
                              </span>
                            </p>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Decide what to do next with structured 15-day, 7-day, 3-day, and final revision pathways:
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-bold text-indigo-900 bg-indigo-50/70 border border-indigo-100/80 px-3 py-1.5 rounded-xl self-start lg:self-auto">
                          <span className="text-indigo-700" title="Complete Notes = Learn">
                            Learn
                          </span>
                          <span className="text-indigo-300">→</span>
                          <span className="text-amber-700" title="Most Repeated Topics = Prioritize">
                            Prioritize
                          </span>
                          <span className="text-indigo-300">→</span>
                          <span className="text-emerald-700" title="Active Recall = Test yourself">
                            Recall
                          </span>
                          <span className="text-indigo-300">→</span>
                          <span className="text-blue-700" title="Practice Writing Code/Answers">
                            Write
                          </span>
                          <span className="text-indigo-300">→</span>
                          <span className="text-purple-700" title="Final Exam Revision = Prepare for exam">
                            Revise
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 3 Roadmap Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {loading && !notes.some(isExamRoadmap) ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <div
                            key={i}
                            className="flex flex-col justify-between rounded-2xl border border-indigo-100 bg-white p-5 shadow-2xs space-y-4"
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="h-4 w-28 bg-emerald-50 rounded-md animate-pulse" />
                                <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
                              </div>
                              <div className="h-4 w-44 bg-slate-200 rounded animate-pulse" />
                              <div className="h-3 w-32 bg-indigo-50 rounded animate-pulse" />
                              <div className="space-y-1.5 pt-1">
                                <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
                                <div className="h-3 w-4/5 bg-slate-100 rounded animate-pulse" />
                              </div>
                            </div>
                            <div className="h-9 w-full rounded-xl bg-emerald-100 animate-pulse mt-4" />
                          </div>
                        ))
                      ) : (
                        examRoadmapCards.map((card) => (
                          <article
                            key={card.key}
                            className="flex flex-col justify-between rounded-2xl border border-emerald-200/90 bg-white p-5 shadow-2xs hover:shadow-md hover:border-emerald-300 transition space-y-4 ring-1 ring-emerald-500/10"
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-[10px] font-black text-emerald-800 uppercase tracking-wider">
                                  <Compass className="h-3 w-3 text-emerald-600 shrink-0" />
                                  <span>Exam Roadmap</span>
                                </div>
                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                  {card.badge}
                                </span>
                              </div>

                              <div>
                                <h3 className="text-base font-black text-slate-900 leading-snug">
                                  {card.cardTitle}
                                </h3>
                                <p className="text-xs font-semibold text-emerald-700 mt-1">
                                  {card.subjectSubtitle}
                                </p>
                              </div>

                              <p className="text-xs text-slate-600 leading-relaxed">
                                {card.description}
                              </p>

                              <div className="pt-1">
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1">
                                  <Clock className="h-3 w-3 text-emerald-600 shrink-0" />
                                  <span>{card.revisionPlan}</span>
                                </span>
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100">
                              {hasActiveBundle ? (
                                <button
                                  onClick={() => card.note && void openNote(card.note)}
                                  disabled={!card.note || openingId === card.note?.id}
                                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2.5 text-xs font-black transition shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/25 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:bg-slate-200 disabled:shadow-none cursor-pointer min-h-[42px]"
                                >
                                  {openingId === card.note?.id ? (
                                    <>
                                      <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                                      <span>Opening Roadmap…</span>
                                    </>
                                  ) : (
                                    <>
                                      <Route className="h-3.5 w-3.5 shrink-0 text-emerald-100" />
                                      <span>View Roadmap</span>
                                      <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                                    </>
                                  )}
                                </button>
                              ) : isPaymentPending ? (
                                <div className="space-y-1">
                                  <button
                                    disabled
                                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 px-4 py-2 text-xs font-bold opacity-90 cursor-not-allowed min-h-[42px]"
                                  >
                                    <Clock className="h-3.5 w-3.5 text-amber-700 animate-pulse" />
                                    <span>Payment Under Review</span>
                                  </button>
                                  <p className="text-[10px] text-center text-slate-500">
                                    Unlocks automatically once approved
                                  </p>
                                </div>
                              ) : (
                                <button
                                  onClick={() => navigate("/purchase")}
                                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer min-h-[42px]"
                                >
                                  <Lock className="h-3.5 w-3.5" />
                                  <span>Unlock with Bundle (₹499)</span>
                                </button>
                              )}
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  </section>

                  {/* ── ✍️ 3. Exam Answer Writing Guide Section ─────────────────── */}
                  <section
                    id="exam-answer-guide"
                    className="rounded-3xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 p-5 sm:p-7 lg:p-8 shadow-2xs space-y-6"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-100 pb-5">
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900">
                          <PenLine className="h-3.5 w-3.5 text-emerald-600" />
                          <span>✍️ Exam Writing Guide · BCA Semester 1</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                          Exam Answer Writing Guide
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                          Learn how to structure your answers clearly and present your knowledge effectively in exams.
                        </p>
                      </div>
                      <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-100/60 rounded-xl px-3 py-1.5 self-start border border-emerald-200/60">
                        <span>Official exam presentation guide</span>
                      </div>
                    </div>

                    <article className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 rounded-2xl border border-emerald-200/90 bg-white p-5 sm:p-6 lg:p-7 shadow-2xs hover:shadow-md transition">
                      <div className="space-y-4 max-w-2xl">
                        <div className="flex items-center gap-2">
                          <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-[10px] font-black text-emerald-800 uppercase tracking-wider">
                            <NotebookPen className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span>Exam Writing Strategy</span>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            Semester 1
                          </span>
                        </div>

                        <div>
                          <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                            BCA Vault — How to Write Answers in Exams
                          </h3>
                          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                            Learn how to write better answers in your BCA Semester 1 exams — from 8-mark theory questions to programming and short notes.
                          </p>
                        </div>

                        {/* Feature Checklist */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs font-bold text-slate-700">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>8-Mark Theory Answers</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>C Programming & Coding Answers</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>Short Notes</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>Examples & Diagrams</span>
                          </div>
                          <div className="flex items-center gap-2 sm:col-span-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>Better Answer Presentation</span>
                          </div>
                        </div>
                      </div>

                      {/* Primary CTA Area */}
                      <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end justify-center gap-3 shrink-0 lg:min-w-[240px] pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        {hasActiveBundle ? (
                          <button
                            onClick={() => examAnswerGuideNote && void openNote(examAnswerGuideNote)}
                            disabled={!examAnswerGuideNote || openingId === examAnswerGuideNote?.id}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-5 py-3 text-xs font-black transition shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/25 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:bg-slate-200 disabled:shadow-none cursor-pointer min-h-[44px]"
                          >
                            {openingId === examAnswerGuideNote?.id ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin text-white" />
                                <span>Opening Guide…</span>
                              </>
                            ) : (
                              <>
                                <PenLine className="h-4 w-4 shrink-0 text-emerald-100" />
                                <span>View Guide →</span>
                              </>
                            )}
                          </button>
                        ) : isPaymentPending ? (
                          <div className="w-full space-y-1 text-center">
                            <button
                              disabled
                              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 px-4 py-2.5 text-xs font-bold opacity-90 cursor-not-allowed min-h-[44px]"
                            >
                              <Clock className="h-4 w-4 text-amber-700 animate-pulse" />
                              <span>Payment Under Review</span>
                            </button>
                            <p className="text-[10px] text-slate-500">Unlocks automatically once approved</p>
                          </div>
                        ) : (
                          <button
                            onClick={() => navigate("/purchase")}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer min-h-[44px]"
                          >
                            <Lock className="h-4 w-4" />
                            <span>Unlock with Bundle (₹499)</span>
                          </button>
                        )}
                      </div>
                    </article>
                  </section>

                  {/* ── 📌 4. Most Repeated Topics Section ───────────────────────── */}
                  <section className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 via-white to-orange-50/30 p-6 sm:p-8 shadow-2xs space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-100 pb-5">
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100/80 px-3 py-1 text-xs font-bold text-amber-900">
                          <Flame className="h-3.5 w-3.5 text-amber-600" />
                          <span>📌 Most Repeated Topics · BCA Semester 1</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                          Most Repeated Topics
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                          Focus your Semester 1 preparation on the topics that repeatedly appear across previous papers.
                        </p>
                      </div>
                      <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-100/60 rounded-xl px-3 py-1.5 self-start">
                        <span>Priority-focused study resource</span>
                      </div>
                    </div>

                    {/* 3 Subject Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {loading && mostRepeatedTopicNotes.length === 0 ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <div
                            key={i}
                            className="flex flex-col justify-between rounded-2xl border border-amber-200 bg-white p-5 shadow-2xs space-y-4"
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="h-4 w-24 bg-amber-100 rounded-md animate-pulse" />
                                <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
                              </div>
                              <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
                              <div className="h-3 w-32 bg-amber-100/70 rounded animate-pulse" />
                              <div className="space-y-1.5 pt-1">
                                <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
                                <div className="h-3 w-4/5 bg-slate-100 rounded animate-pulse" />
                              </div>
                            </div>
                            <div className="h-9 w-full rounded-xl bg-amber-300/60 animate-pulse mt-4" />
                          </div>
                        ))
                      ) : (
                        mostRepeatedTopicNotes.map((note) => (
                          <article
                            key={note.id}
                            className="flex flex-col justify-between rounded-2xl border border-amber-200 bg-white p-5 shadow-2xs hover:shadow-md transition"
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                                  <Flame className="h-3 w-3 text-amber-600" /> High Priority
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  Semester 1
                                </span>
                              </div>

                              <div>
                                <h3 className="text-sm font-black text-slate-900 leading-snug">
                                  {note.title}
                                </h3>
                                <p className="text-[11px] font-semibold text-amber-800 mt-1">
                                  {note.subject || "Semester 1 Core Subject"}
                                </p>
                              </div>

                              <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                                {note.description || "Focus on the key topics repeatedly examined across previous semester papers."}
                              </p>
                            </div>

                            <div className="mt-5 pt-3 border-t border-slate-100">
                              {hasActiveBundle ? (
                                <button
                                  onClick={() => void openNote(note)}
                                  disabled={openingId === note.id}
                                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2.5 text-xs font-black transition shadow-xs disabled:bg-slate-200 uppercase tracking-wider cursor-pointer"
                                >
                                  {openingId === note.id ? (
                                    <>
                                      <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-950" /> Opening PDF…
                                    </>
                                  ) : (
                                    <>
                                      <FileText className="h-3.5 w-3.5 text-slate-950" /> View PDF
                                    </>
                                  )}
                                </button>
                              ) : isPaymentPending ? (
                                <div className="space-y-1">
                                  <button
                                    disabled
                                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 px-4 py-2 text-xs font-bold opacity-90 cursor-not-allowed"
                                  >
                                    <Clock className="h-3.5 w-3.5 text-amber-700 animate-pulse" />
                                    <span>Payment Under Review</span>
                                  </button>
                                  <p className="text-[10px] text-center text-slate-500">Unlocks automatically once approved</p>
                                </div>
                              ) : (
                                <button
                                  onClick={() => navigate("/purchase")}
                                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer"
                                >
                                  <Lock className="h-3.5 w-3.5" />
                                  <span>Unlock with Bundle (₹499)</span>
                                </button>
                              )}
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  </section>

                  {/* ── ❓ 5. Referral Reward Callout (Most Repeated Questions) ───── */}
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-700 shrink-0">
                        <Gift className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                          Looking for ❓ Most Repeated Questions?
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Refer 3 friends who purchase Semester 1 to unlock the Most Repeated Questions Pack — FREE.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => switchTab("referral")}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition shadow-2xs shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      <span>Refer 3 Friends</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* ── 💡 6. AI Academic Assistant Hero Card ────────────────────── */}
                  <section className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/50 p-6 sm:p-7 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-bold text-indigo-800">
                          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                          <span>AI Academic Assistant</span>
                          <span className="ml-1 text-[10px] font-semibold text-indigo-700 bg-indigo-200/70 px-1.5 py-0.5 rounded-full">
                            Beta / Learning Phase
                          </span>
                        </div>
                        <h2 className="text-base sm:text-lg font-bold text-slate-900">
                          Need help understanding a topic?
                        </h2>
                        <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                          Ask the BCA Vault AI Learning Assistant for step-by-step topic explanations, code walkthroughs, and exam questions.
                        </p>
                        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-1.5 inline-block leading-relaxed">
                          ⚠️ <strong>Notice:</strong> The AI is currently in its learning phase and may not always provide completely correct output as the model continues to learn with more data. Please verify key concepts with your course notes.
                        </p>
                      </div>

                      <button
                        onClick={() => switchTab("ai")}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition shrink-0 cursor-pointer"
                      >
                        <span>Ask AI</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </section>
                </>
              );
            })()}
          </div>
        )}
      </main>

      {/* Controlled Protected PDF In-App Viewer (View Only, No Download) */}
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
              text: "Viewing session expired. Click 'View PDF' to refresh access.",
              type: "info",
            });
          }}
        />
      )}
    </div>
  );
}
