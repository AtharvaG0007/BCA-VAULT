import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

type Notice = { id: string };

export function StudentAdminNotice() {
  useEffect(() => {
    let cancelled = false;
    let observer: MutationObserver | null = null;

    const sync = (count: number) => {
      if (cancelled) return;
      const referrals = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).filter((button) => button.textContent?.includes("Referral Program"));
      referrals.forEach((referral) => {
        const parent = referral.parentElement;
        if (!parent || parent.querySelector('[data-student-notice-board="true"]')) return;
        const link = document.createElement("a");
        link.href = "/app/notices";
        link.dataset.studentNoticeBoard = "true";
        link.className = "mb-1.5 flex items-center gap-3 w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-violet-50 hover:text-violet-700 transition text-left";
        link.setAttribute("aria-label", `Notice Board${count ? `, ${count} notices` : ""}`);
        link.innerHTML = `<span aria-hidden="true">🔔</span><span>Notice Board</span>${count ? `<span class="ml-auto rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-black text-violet-700">${count}</span>` : ""}`;
        parent.insertBefore(link, referral);
      });
    };

    const load = async () => {
      const { count, error } = await supabase.from("admin_notices").select("id", { count: "exact", head: true }).eq("published", true);
      if (cancelled) return;
      if (error) {
        console.warn("[StudentAdminNotice] Unable to load notice count:", error.message);
        sync(0);
      } else {
        sync(count ?? 0);
      }
      observer = new MutationObserver(() => sync(count ?? 0));
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
