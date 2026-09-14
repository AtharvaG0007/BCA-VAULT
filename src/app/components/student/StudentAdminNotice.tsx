import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

type Notice = { id: string; title: string; message: string; type: string; priority: string; published_at: string | null };

export function StudentAdminNotice() {
  useEffect(() => {
    let cancelled = false;
    let notices: Notice[] = [];
    let observer: MutationObserver | null = null;

    const createNotice = (notice: Notice) => {
      const card = document.createElement("div");
      card.className = "rounded-xl border border-slate-200 bg-white p-2.5";
      const title = document.createElement("p");
      title.className = "text-[11px] font-black text-slate-900";
      title.textContent = notice.title;
      const message = document.createElement("p");
      message.className = "mt-1 whitespace-pre-wrap text-[10px] leading-4 text-slate-600";
      message.textContent = notice.message;
      card.append(title, message);
      return card;
    };

    const sync = () => {
      if (cancelled || !notices.length) return;
      const referrals = Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
        .filter((button) => button.textContent?.includes("Referral Program"));

      referrals.forEach((referral) => {
        if (referral.parentElement?.querySelector('[data-student-notice-board="true"]')) return;
        const wrap = document.createElement("div");
        wrap.dataset.studentNoticeBoard = "true";
        wrap.className = "mb-1.5";

        const trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "flex items-center gap-3 w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-violet-50 hover:text-violet-700 transition text-left";
        trigger.textContent = `🔔 Notice Board (${notices.length})`;

        const panel = document.createElement("div");
        panel.className = "hidden mt-1.5 rounded-2xl border border-violet-100 bg-violet-50 p-2 space-y-2";
        notices.forEach((notice) => panel.append(createNotice(notice)));

        trigger.addEventListener("click", () => panel.classList.toggle("hidden"));
        wrap.append(trigger, panel);
        referral.parentElement?.insertBefore(wrap, referral);
      });
    };

    const load = async () => {
      const { data, error } = await supabase
        .from("admin_notices")
        .select("id,title,message,type,priority,published_at")
        .eq("published", true)
        .order("published_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);
      if (cancelled) return;
      if (error) {
        console.warn("[StudentAdminNotice] Unable to load notices:", error.message);
        return;
      }
      notices = (data ?? []) as Notice[];
      sync();
      observer = new MutationObserver(sync);
      observer.observe(document.body, { childList: true, subtree: true });
    };

    void load();
    return () => {
      cancelled = true;
      observer?.disconnect();
      document.querySelectorAll('[data-student-notice-board="true"]').forEach((el) => el.remove());
    };
  }, []);

  return null;
}
