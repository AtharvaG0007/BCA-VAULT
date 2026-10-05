import { useEffect, useState } from "react";
import { Bell, CalendarDays, Loader2, Megaphone, AlertTriangle, BookOpen, CreditCard, GraduationCap, Info } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Notice = {
  id: string;
  title: string;
  message: string;
  type: "general" | "academic" | "payment" | "study" | "important";
  priority: "normal" | "important";
  published_at: string | null;
};

const typeMeta = {
  general: { label: "General", icon: Info },
  academic: { label: "Academic", icon: GraduationCap },
  payment: { label: "Payment", icon: CreditCard },
  study: { label: "Study", icon: BookOpen },
  important: { label: "Important", icon: AlertTriangle },
} as const;

export function StudentNoticeBoardPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from("admin_notices")
        .select("id,title,message,type,priority,published_at")
        .eq("published", true)
        .order("published_at", { ascending: false })
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (queryError) setError("We couldn't load notices right now. Please try again.");
      else setNotices((data ?? []) as Notice[]);
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 rounded-3xl bg-gradient-to-br from-[#1E40AF] to-[#312E81] p-6 text-white shadow-lg sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20"><Bell className="h-6 w-6" /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200">Student Updates</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Notice Board</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">Important updates, academic announcements, study reminders and payment information from BCA Vault.</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-56 items-center justify-center rounded-3xl border border-slate-200 bg-white"><Loader2 className="h-6 w-6 animate-spin text-[#1E40AF]" /></div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-white p-8 text-center"><Bell className="mx-auto h-8 w-8 text-rose-400" /><h2 className="mt-3 font-black text-slate-900">Unable to load notices</h2><p className="mt-1 text-sm text-slate-500">{error}</p></div>
        ) : notices.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><Megaphone className="mx-auto h-9 w-9 text-slate-300" /><h2 className="mt-3 font-black text-slate-900">No new notices</h2><p className="mt-1 text-sm text-slate-500">You're all caught up. New announcements will appear here.</p></div>
        ) : (
          <div className="space-y-4">
            {notices.map((notice) => {
              const meta = typeMeta[notice.type] ?? typeMeta.general;
              const Icon = meta.icon;
              return (
                <article key={notice.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex gap-4">
                    <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#1E40AF] sm:flex"><Icon className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-[#1E40AF]">{meta.label}</span>
                        {notice.priority === "important" && <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-600">Important</span>}
                        {notice.published_at && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400"><CalendarDays className="h-3 w-3" />{new Date(notice.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>}
                      </div>
                      <h2 className="mt-3 text-base font-black text-slate-900 sm:text-lg">{notice.title}</h2>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{notice.message}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
