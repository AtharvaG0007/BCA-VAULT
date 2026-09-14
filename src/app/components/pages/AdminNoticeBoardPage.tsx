import { useEffect, useState } from "react";
import { Bell, Check, Edit3, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { adminSupabase } from "@/lib/supabase/client";

const TYPES = ["general", "academic", "payment", "study", "important"] as const;
type NoticeType = (typeof TYPES)[number];

type Notice = {
  id: string;
  title: string;
  message: string;
  type: NoticeType;
  priority: "normal" | "important";
  published: boolean;
  published_at: string | null;
  created_at: string;
};

const typeLabel: Record<NoticeType, string> = {
  general: "General",
  academic: "Academic",
  payment: "Payment",
  study: "Study",
  important: "Important",
};

export function AdminNoticeBoardPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [form, setForm] = useState({ title: "", message: "", type: "general" as NoticeType, priority: "normal" as "normal" | "important", published: true });

  const load = async () => {
    setLoading(true);
    const { data, error } = await adminSupabase.from("admin_notices").select("id,title,message,type,priority,published,published_at,created_at").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setNotices((data as Notice[]) || []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", message: "", type: "general", priority: "normal", published: true });
    setFormOpen(true);
  };

  const openEdit = (notice: Notice) => {
    setEditing(notice);
    setForm({ title: notice.title, message: notice.message, type: notice.type, priority: notice.priority, published: notice.published });
    setFormOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      toast.error("Title and message are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = { title: form.title.trim(), message: form.message.trim(), type: form.type, priority: form.priority, published: form.published, published_at: form.published ? (editing?.published_at || new Date().toISOString()) : null };
      const result = editing
        ? await adminSupabase.from("admin_notices").update(payload).eq("id", editing.id)
        : await adminSupabase.from("admin_notices").insert({ ...payload, created_by: (await adminSupabase.auth.getUser()).data.user?.id || null });
      if (result.error) throw result.error;
      toast.success(editing ? "Notice updated." : "Notice published.");
      setFormOpen(false);
      await load();
    } catch (err: any) {
      toast.error(err.message || "Unable to save notice.");
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (notice: Notice) => {
    const next = !notice.published;
    const { error } = await adminSupabase.from("admin_notices").update({ published: next, published_at: next ? (notice.published_at || new Date().toISOString()) : null }).eq("id", notice.id);
    if (error) toast.error(error.message); else { toast.success(next ? "Notice published." : "Notice hidden."); await load(); }
  };

  const remove = async (notice: Notice) => {
    if (!window.confirm(`Delete “${notice.title}” permanently?`)) return;
    const { error } = await adminSupabase.from("admin_notices").delete().eq("id", notice.id);
    if (error) toast.error(error.message); else { toast.success("Notice deleted."); await load(); }
  };

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-violet-400">System / Communication</p>
            <h1 className="mt-1 text-2xl font-black">Notice Board</h1>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">Publish one-way announcements that students can read from their dashboard. Students cannot reply.</p>
          </div>
          <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-500"><Plus className="h-4 w-4" /> Create Notice</button>
        </div>

        {loading ? <div className="flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 p-12"><Loader2 className="h-5 w-5 animate-spin" /></div> : notices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-12 text-center"><Bell className="mx-auto mb-3 h-8 w-8 text-slate-600" /><p className="font-bold">No notices yet</p><p className="mt-1 text-xs text-slate-500">Create your first announcement for students.</p></div>
        ) : (
          <div className="space-y-3">{notices.map((notice) => (
            <div key={notice.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap items-center gap-2"><span className="rounded-full border border-violet-800 bg-violet-950/40 px-2.5 py-1 text-[10px] font-bold text-violet-300">{typeLabel[notice.type]}</span>{notice.priority === "important" && <span className="rounded-full border border-rose-800 bg-rose-950/40 px-2.5 py-1 text-[10px] font-bold text-rose-300">Important</span>}<span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${notice.published ? "bg-emerald-950/50 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>{notice.published ? "Published" : "Hidden"}</span></div><h2 className="text-base font-black">{notice.title}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">{notice.message}</p><p className="mt-3 text-[10px] text-slate-600">{new Date(notice.published_at || notice.created_at).toLocaleString("en-IN")}</p></div>
                <div className="flex shrink-0 flex-wrap gap-2"><button onClick={() => togglePublished(notice)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-[11px] font-bold hover:bg-slate-800">{notice.published ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}{notice.published ? "Hide" : "Publish"}</button><button onClick={() => openEdit(notice)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-[11px] font-bold hover:bg-slate-800"><Edit3 className="h-3.5 w-3.5" /> Edit</button><button onClick={() => remove(notice)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-900 px-3 py-2 text-[11px] font-bold text-rose-300 hover:bg-rose-950/40"><Trash2 className="h-3.5 w-3.5" /> Delete</button></div>
              </div>
            </div>
          ))}</div>
        )}

        {formOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><form onSubmit={save} className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-950 p-5 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-black">{editing ? "Edit Notice" : "Create Notice"}</h2><p className="text-xs text-slate-500">Students can read this notice but cannot reply.</p></div><button type="button" onClick={() => setFormOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"><X className="h-5 w-5" /></button></div><div className="space-y-4"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Notice title" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-violet-500" /><textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Write your notice..." rows={7} className="w-full resize-y rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-violet-500" /><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-slate-400">Type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as NoticeType })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm font-normal text-slate-100">{TYPES.map((t) => <option key={t} value={t}>{typeLabel[t]}</option>)}</select></label><label className="text-xs font-bold text-slate-400">Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as "normal" | "important" })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm font-normal text-slate-100"><option value="normal">Normal</option><option value="important">Important</option></select></label></div><label className="flex items-center gap-3 text-xs font-bold text-slate-300"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="h-4 w-4" /> Publish this notice to students</label></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setFormOpen(false)} className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{editing ? "Save Changes" : "Publish Notice"}</button></div></form></div>}
      </div>
    </div>
  );
}
