import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

type Notice = { id: string; title: string; message: string; type: string; priority: string; published_at: string | null };

export function StudentAdminNotice() {
  useEffect(() => {
    let cancelled = false;
    let notices: Notice[] = [];
    let timer: number | undefined;

    const render = () => {
      if (cancelled || notices.length === 0) return;
      document.querySelectorAll('[data-student-notice-board="true"]').forEach((el) => el.remove());
      const referrals = Array.from(document.querySelectorAll("button")).filter((el) => el.textContent?.includes("Referral Program"));
      referrals.forEach((referral) => {
        const wrap = document.createElement("div");
        wrap.dataset.studentNoticeBoard = "true";
        wrap.className = "mb-1.5";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "flex items-center gap-3 w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-violet-50 hover:text-violet-700 transition text-left";
        button.textContent = `🔔 Notice Board (${notices.length})`;
        const panel = document.createElement("div");
        panel.className = "hidden mt-1.5 rounded-2xl border border-violet-100 bg-violet-50 p-2 space-y-2";
        notices.forEach((notice) => {
          const card = document.createElement("div");
          card.className = "rounded-xl bg-white border border-slate-200 p-2.5";
          const title = document.createElement("p");
          title.className = "text-[11px] font-black text-slate-900";
          title.textContent = notice.title;
          const message = document.createElement("p");
          message.className = "mt-1 text-[10px] leading-4 text-slate-600 whitespace-pre-wrap";
          message.textContent = notice.message;
          card.append(title, message);
          panel.append(card);
        });
        button.addEventListener("click", () => panel.classList.toggle("hidden"));
        wrap.append(button, panel);
        referral.parentElement?.insertBefore(wrap, referral);
      });
    };

    const load = async () => {
      const { data, error } = await supabase.from("admin_notices").select("id,title,message,type,priority,published_at").eq("published", true).order("published_at", { ascending: false }).order("created_at", { ascending: false }).limit(5);
      if (cancelled) return;
      if (error) { console.warn("[StudentAdminNotice]", error.message); return; }
      notices = (data ?? []) as Notice[];
      render();
      timer = window.setInterval(render, 1000);
    };
    void load();
    return () => { cancelled = true; if (timer) window.clearInterval(timer); document.querySelectorAll('[data-student-notice-board="true"]').forEach((el) => el.remove()); };
  }, []);
  return null;
}
