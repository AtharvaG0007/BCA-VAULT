import { useEffect, useState } from "react";
import {
  Bell,
  AlertTriangle,
  BookOpen,
  CreditCard,
  GraduationCap,
  Info,
  Loader2,
  Megaphone,
  RefreshCw,
} from "lucide-react";
import { fetchPublishedNotices } from "@/lib/supabase/adminService";

interface Notice {
  id: string;
  title: string;
  message: string;
  notice_type?: string;
  type?: string;
  priority: string;
  published: boolean;
  created_at: string;
}

const typeConfig: Record<string, { label: string; icon: typeof Info; color: string; bg: string; border: string }> = {
  general: { label: "General", icon: Info, color: "text-slate-700", bg: "bg-slate-100", border: "border-slate-200" },
  academic: { label: "Academic", icon: GraduationCap, color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200" },
  payment: { label: "Payment", icon: CreditCard, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  study: { label: "Study", icon: BookOpen, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  important: { label: "Important", icon: AlertTriangle, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function StudentNoticeBoard() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadNotices() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPublishedNotices();
      if (res.error) {
        // If the table doesn't exist yet, show empty state instead of error
        if (res.error.code === "42P01" || res.error.message?.includes("does not exist")) {
          setNotices([]);
        } else {
          throw res.error;
        }
      } else {
        setNotices((res.data || []) as Notice[]);
      }
    } catch (err: any) {
      console.error("[StudentNoticeBoard] load error:", err);
      setError(err?.message || "Failed to load notices.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotices();
  }, []);

  return (
    <div className="mx-auto max-w-3xl w-full px-3.5 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-100 text-indigo-600">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Notice Board
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Important updates and announcements
            </p>
          </div>
        </div>
        <button
          onClick={() => void loadNotices()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition shadow-2xs"
          title="Refresh notices"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </header>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm text-slate-500 font-medium">Loading notices…</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex flex-col items-center gap-3 text-center">
          <AlertTriangle className="h-8 w-8 text-red-400" />
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button
            onClick={() => void loadNotices()}
            className="rounded-xl bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 text-xs font-bold transition"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && notices.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 flex flex-col items-center gap-4 text-center shadow-2xs">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100">
            <Megaphone className="h-7 w-7 text-slate-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">No Notices Yet</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              There are no announcements at the moment. Check back later for updates from BCA Vault.
            </p>
          </div>
        </div>
      )}

      {/* Notices List */}
      {!loading && !error && notices.length > 0 && (
        <div className="space-y-3">
          {notices.map((notice) => {
            const cfg = typeConfig[notice.notice_type || notice.type || "general"] || typeConfig.general;
            const TypeIcon = cfg.icon;
            const isImportant = notice.priority === "important";

            return (
              <article
                key={notice.id}
                className={`rounded-2xl border bg-white p-4 sm:p-5 shadow-2xs transition-shadow hover:shadow-sm ${
                  isImportant ? "border-amber-300 ring-1 ring-amber-100" : "border-slate-200"
                }`}
              >
                {/* Top row: Type badge + priority + date */}
                <div className="flex flex-wrap items-center gap-2 mb-2.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cfg.bg} ${cfg.color} ${cfg.border} border`}
                  >
                    <TypeIcon className="h-3 w-3" />
                    {cfg.label}
                  </span>
                  {isImportant && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-300">
                      <AlertTriangle className="h-3 w-3" />
                      Important
                    </span>
                  )}
                  <span className="ml-auto text-[11px] text-slate-400 font-medium">
                    {formatDate(notice.created_at)}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug mb-1.5">
                  {notice.title}
                </h3>

                {/* Message */}
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {notice.message}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
