import { useEffect, useMemo, useState } from "react";
import { Mail, RefreshCw, Sparkles, Send, Save, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase, publicAnonKey, supabaseUrl } from "@/lib/supabase/client";

const endpoint = `${supabaseUrl}/functions/v1/email-admin`;

type Job = {
  id: string;
  event_key: string;
  event_type: string;
  recipient_email: string;
  recipient_user_id?: string | null;
  status: string;
  subject?: string | null;
  html_body?: string | null;
  text_body?: string | null;
  generated_at?: string | null;
  sent_at?: string | null;
  failed_at?: string | null;
  last_error?: string | null;
  provider_message_id?: string | null;
  created_at: string;
  payload?: Record<string, unknown> | null;
};

async function callEmailAdmin(path: string, body: unknown = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${endpoint}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: publicAnonKey,
      Authorization: `Bearer ${session?.access_token ?? ""}`,
    },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || "Email operation failed.");
  return json;
}

const eventLabel = (type: string) => type === "payment_approved" ? "Payment Approved" : type === "payment_rejected" ? "Payment Rejected" : type === "referral_reward_unlocked" ? "Referral Reward Unlocked" : type;

export function AdminEmailPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState<Job | null>(null);
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await callEmailAdmin("/list");
      const list = (res.data || []) as Job[];
      setJobs(list);
      if (selected) {
        const fresh = list.find((x) => x.id === selected.id);
        if (fresh) setSelected(fresh);
      }
    } catch (e: any) {
      toast.error(e.message || "Unable to load email queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const pending = useMemo(() => jobs.filter((j) => j.status !== "sent"), [jobs]);

  const choose = (job: Job) => {
    setSelected(job);
    setSubject(job.subject || "");
    setHtml(job.html_body || "");
    setText(job.text_body || "");
  };

  const generate = async () => {
    if (!selected) return;
    setWorking(true);
    try {
      const res = await callEmailAdmin("/generate", { id: selected.id });
      const job = res.data as Job;
      choose(job);
      setJobs((old) => old.map((x) => x.id === job.id ? job : x));
      toast.success("Gemini generated the email draft.");
    } catch (e: any) {
      toast.error(e.message || "Gemini generation failed.");
    } finally {
      setWorking(false);
    }
  };

  const save = async () => {
    if (!selected) return;
    setWorking(true);
    try {
      const res = await callEmailAdmin("/save", { id: selected.id, subject, html_body: html, text_body: text });
      const job = res.data as Job;
      choose(job);
      setJobs((old) => old.map((x) => x.id === job.id ? job : x));
      toast.success("Email draft saved and ready to send.");
    } catch (e: any) {
      toast.error(e.message || "Could not save email.");
    } finally {
      setWorking(false);
    }
  };

  const send = async () => {
    if (!selected) return;
    if (!subject.trim() || !html.trim() || !text.trim()) {
      toast.error("Generate or save the email before sending.");
      return;
    }
    if (!window.confirm(`Send this email to ${selected.recipient_email}?`)) return;
    setWorking(true);
    try {
      const res = await callEmailAdmin("/send", { id: selected.id });
      const job = res.data as Job;
      setJobs((old) => old.map((x) => x.id === job.id ? job : x));
      setSelected(job);
      toast.success("Email sent successfully through Gmail.");
    } catch (e: any) {
      toast.error(e.message || "Gmail send failed.");
      await load();
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3"><Mail className="h-7 w-7 text-indigo-400" /><h1 className="text-2xl font-black">Email Console</h1></div>
            <p className="mt-1 text-sm text-slate-400">Generate with Gemini → review/edit → send manually from the connected BCA Vault Gmail account.</p>
          </div>
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold hover:bg-slate-900 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
            <div className="mb-3 flex items-center justify-between px-2"><span className="text-xs font-black uppercase tracking-widest text-slate-400">Email Queue</span><span className="rounded-full bg-indigo-500/15 px-2 py-1 text-xs font-bold text-indigo-300">{pending.length}</span></div>
            <div className="space-y-2">
              {pending.length === 0 && <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">No emails waiting for admin action.</div>}
              {pending.map((job) => (
                <button key={job.id} onClick={() => choose(job)} className={`w-full rounded-xl border p-3 text-left transition ${selected?.id === job.id ? "border-indigo-500 bg-indigo-500/10" : "border-slate-800 bg-slate-950/60 hover:border-slate-700"}`}>
                  <div className="flex items-center justify-between gap-2"><span className="text-xs font-black text-indigo-300">{eventLabel(job.event_type)}</span><Status status={job.status} /></div>
                  <p className="mt-2 truncate text-sm font-bold text-slate-200">{job.recipient_email}</p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(job.created_at).toLocaleString("en-IN")}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            {!selected ? <div className="flex min-h-[520px] items-center justify-center text-center text-slate-500"><div><Mail className="mx-auto mb-3 h-10 w-10" /><p>Select an email from the queue.</p></div></div> : (
              <div className="space-y-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-slate-500">Recipient</p><p className="text-lg font-bold">{selected.recipient_email}</p><p className="text-xs text-slate-500">{eventLabel(selected.event_type)}</p></div><Status status={selected.status} /></div>
                {selected.last_error && <div className="flex gap-2 rounded-xl border border-rose-800/50 bg-rose-950/30 p-3 text-sm text-rose-300"><AlertCircle className="h-4 w-4 shrink-0" />{selected.last_error}</div>}
                <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Subject</span><input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-indigo-500" placeholder="Email subject" /></label>
                <div className="grid gap-5 xl:grid-cols-2">
                  <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">HTML Body</span><textarea value={html} onChange={(e) => setHtml(e.target.value)} className="h-80 w-full rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-xs outline-none focus:border-indigo-500" placeholder="Generate with Gemini or write HTML manually" /></label>
                  <div><span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Live Preview</span><div className="h-80 overflow-auto rounded-xl border border-slate-700 bg-white"><iframe title="Email preview" sandbox="" srcDoc={html || "<p style='font-family:Arial;padding:24px;color:#667085'>Nothing to preview yet.</p>"} className="h-full w-full border-0" /></div></div>
                </div>
                <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Plain-text fallback</span><textarea value={text} onChange={(e) => setText(e.target.value)} className="h-28 w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm outline-none focus:border-indigo-500" /></label>
                <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-4">
                  <button onClick={() => void generate()} disabled={working || selected.status === "sent"} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black hover:bg-indigo-500 disabled:opacity-50"><Sparkles className="h-4 w-4" /> Generate with Gemini</button>
                  <button onClick={() => void save()} disabled={working || selected.status === "sent"} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-black hover:bg-slate-800 disabled:opacity-50"><Save className="h-4 w-4" /> Save Draft</button>
                  <button onClick={() => void send()} disabled={working || selected.status === "sent" || !subject || !html || !text} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black hover:bg-emerald-500 disabled:opacity-50"><Send className="h-4 w-4" /> Send Email</button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Status({ status }: { status: string }) {
  if (status === "sent") return <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-400"><CheckCircle2 className="h-3 w-3" /> sent</span>;
  if (status === "failed") return <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-rose-400"><AlertCircle className="h-3 w-3" /> failed</span>;
  return <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-400"><Clock className="h-3 w-3" /> {status}</span>;
}
