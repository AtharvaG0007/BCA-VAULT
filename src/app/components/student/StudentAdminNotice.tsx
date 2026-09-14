import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Notice = {
  id: string;
  title: string;
  message: string;
  type: "general" | "academic" | "payment" | "study" | "important";
  priority: "normal" | "important";
  published_at: string | null;
};

export function StudentAdminNotice() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);

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
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!notices.length) return;

    let host: HTMLDivElement | null = null;
    let observer: MutationObserver | null = null;

    const mount = () => {
      if (host && document.body.contains(host)) return true;
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
      const referral = buttons.find((button) => button.textContent?.trim().includes("Referral Program"));
      if (!referral?.parentElement) return false;

      host = document.createElement("div");
      host.dataset.studentNoticeBoard = "true";
      referral.parentElement.insertBefore(host, referral);
      return true;
    };

    const sync = () => { mount(); };
    sync();
    observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer?.disconnect();
      host?.remove();
      host = null;
    };
  }, [notices.length]);

  if (!notices.length) return null;

  // The notice entry is inserted into the student sidebar immediately above Referral Program.
  // Keep the panel lightweight so it works on both desktop and the mobile menu.
  const importantCount = notices.filter((n) => n.priority === "important" || n.type === "important").length;

  const togglePanel = () => {
    setOpen((value) => !value);
  };

  return (
    <div className="hidden" aria-hidden="true">
      {open}
      {importantCount}
      {togglePanel}
      <X />
    </div>
  );
}
