import { useEffect, useState } from "react";
import { Bell, ChevronDown, ChevronUp, Info, AlertTriangle, BookOpen, CreditCard } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Notice = {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  published_at: string | null;
};

const iconForType = (type: string) => {
  const t = type.toLowerCase();
  if (t === "important") return AlertTriangle;
  if (t === "academic" || t === "study") return BookOpen;
  if (t === "payment") return CreditCard;
  return Info;
};

export function StudentAdminNoticeBoard() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("admin_notices")
        .select("id,title,message,type,priority,published_at")
        .eq("published", true)
        .order("priority", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(5);

      if (!cancelled) {
        if (error) {
          console.error("[StudentAdminNoticeBoard] load error:", error);
          setNotices([]);
        } else {
          setNotices((data ?? []) as Notice[]);
        }
        setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || notices.length === 0) return null;

  return (
    <section className="mb-6 rounded-2xl border border-indigo-200 bg-white shadow-sm overflow-hidden" aria-label="Admin Notice Board">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Bell className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-extrabold text-slate-900">Admin Notice Board</span>
            <span className="block text-[11px] text-slate-500">Important updates from BCA Vault</span>
          </span>
        </span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 divide-y divide-slate-100">
          {notices.map((notice) => {
            const Icon = iconForType(notice.type);
            const important = notice.priority === "important" || notice.type.toLowerCase() === "important";
            return (
              <article key={notice.id} className="px-4 py-3.5 sm:px-5">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${important ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-500"}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-extrabold text-slate-900">{notice.title}</h3>
                      {important && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-amber-700">Important</span>}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">{notice.type}</span>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-xs leading-5 text-slate-600">{notice.message}</p>
                    {notice.published_at && <p className="mt-2 text-[10px] font-medium text-slate-400">{new Date(notice.published_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
