import { useEffect, useState } from "react";
import { AlertTriangle, Bell, Info, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Notice = {
  id: string;
  title: string;
  message: string;
  type: "general" | "academic" | "payment" | "study" | "important";
  priority: "normal" | "important";
  published_at: string | null;
};

const typeLabel = {
  general: "General",
  academic: "Academic",
  payment: "Payment",
  study: "Study",
  important: "Important",
};

export function StudentAdminNotice() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data, error } = await supabase
        .from("admin_notices")
        .select("id,title,message,type,priority,published_at")
        .eq("published", true)
        .order("published_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);
      if (mounted) {
        if (error) console.warn("[StudentAdminNotice] Unable to load notices:", error.message);
        setNotices((data as Notice[]) || []);
        setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="mb-5 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading notices…</div>;
  if (!notices.length) return null;

  return (
    <section aria-labelledby="admin-notices-title" className="mb-6">
      <div className="mb-3 flex items-center gap-2"><Bell className="h-4 w-4 text-violet-600" /><h2 id="admin-notices-title" className="text-sm font-black text-slate-900">Admin Notice Board</h2><span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">{notices.length}</span></div>
      <div className="space-y-3">
        {notices.map((notice) => {
          const important = notice.priority === "important" || notice.type === "important";
          return <article key={notice.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${important ? "border-amber-200 bg-amber-50/40" : "border-slate-200"}`}>
            <div className="flex gap-3"><div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${important ? "bg-amber-100 text-amber-700" : "bg-violet-100 text-violet-700"}`}>{important ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-700">{typeLabel[notice.type]}</span>{important && <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">Important</span>}</div><h3 className="mt-1 text-sm font-black text-slate-900">{notice.title}</h3><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{notice.message}</p>{notice.published_at && <p className="mt-2 text-[10px] text-slate-400">{new Date(notice.published_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>}</div></div>
          </article>;
        })}
      </div>
    </section>
  );
}
