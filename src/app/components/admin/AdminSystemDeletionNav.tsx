import { useEffect } from "react";
import { useLocation } from "react-router";

/** Adds Notice Board and Permanent User Deletion to the existing Super Admin System navigation. */
export function AdminSystemDeletionNav() {
  const location = useLocation();

  useEffect(() => {
    if (!location.pathname.startsWith("/admin")) return;

    let observer: MutationObserver | null = null;
    let noticeLink: HTMLAnchorElement | null = null;
    let deleteLink: HTMLAnchorElement | null = null;

    const navigate = (path: string) => {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    };

    const makeLink = (path: string, label: string, icon: string, attribute: string) => {
      const link = document.createElement("a");
      link.href = path;
      link.dataset[attribute] = "true";
      link.className = "flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold transition bg-transparent text-slate-400 hover:bg-slate-800 hover:text-white";
      link.setAttribute("aria-label", label);
      link.innerHTML = `<span class="inline-flex h-4 w-4 items-center justify-center" aria-hidden="true">${icon}</span><span>${label}</span>`;
      link.onclick = (event) => {
        event.preventDefault();
        navigate(path);
      };
      return link;
    };

    const sync = () => {
      const dashboardLink = document.querySelector<HTMLAnchorElement>('a[href="/admin/dashboard"]');
      if (!dashboardLink) return;

      if (!noticeLink || !document.body.contains(noticeLink)) {
        noticeLink = document.querySelector<HTMLAnchorElement>('a[data-admin-notice-board="true"]') || makeLink(
          "/admin/notices",
          "Notice Board",
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg>',
          "adminNoticeBoard"
        );
        if (!noticeLink.parentElement) dashboardLink.insertAdjacentElement("afterend", noticeLink);
      }

      if (!deleteLink || !document.body.contains(deleteLink)) {
        deleteLink = document.querySelector<HTMLAnchorElement>('a[data-admin-delete-users="true"]') || makeLink(
          "/admin/delete-users",
          "Permanent User Deletion",
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v5"></path><path d="M14 11v5"></path></svg>',
          "adminDeleteUsers"
        );
        if (!deleteLink.parentElement) (noticeLink || dashboardLink).insertAdjacentElement("afterend", deleteLink);
      }

      if (noticeLink) {
        const active = location.pathname === "/admin/notices";
        noticeLink.className = active
          ? "flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold transition bg-violet-600 text-white shadow-lg shadow-violet-600/20"
          : "flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold transition bg-transparent text-slate-400 hover:bg-slate-800 hover:text-white";
      }
      if (deleteLink) {
        const active = location.pathname === "/admin/delete-users";
        deleteLink.className = active
          ? "flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold transition bg-rose-600 text-white shadow-lg shadow-rose-600/20"
          : "flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold transition bg-transparent text-slate-400 hover:bg-rose-950/40 hover:text-rose-300";
      }
    };

    sync();
    observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer?.disconnect();
      document.querySelector<HTMLAnchorElement>('a[data-admin-notice-board="true"]')?.remove();
      document.querySelector<HTMLAnchorElement>('a[data-admin-delete-users="true"]')?.remove();
    };
  }, [location.pathname]);

  return null;
}
