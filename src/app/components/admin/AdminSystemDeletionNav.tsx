import { useEffect } from "react";
import { useLocation } from "react-router";

/**
 * Adds Permanent User Deletion to the existing Super Admin sidebar.
 * The dashboard sidebar is rendered asynchronously, so observe the DOM
 * until the existing System navigation is available instead of relying on
 * a single effect that can run before the sidebar has mounted.
 */
export function AdminSystemDeletionNav() {
  const location = useLocation();

  useEffect(() => {
    if (!location.pathname.startsWith("/admin")) return;

    let observer: MutationObserver | null = null;
    let insertedLink: HTMLAnchorElement | null = null;

    const sync = () => {
      const emailLink = document.querySelector<HTMLAnchorElement>('a[href="/admin/email"]');
      if (!emailLink) return;

      // Insert immediately after Email Console, which keeps this action inside SYSTEM.
      if (!insertedLink || !document.body.contains(insertedLink)) {
        const existing = document.querySelector<HTMLAnchorElement>('a[data-admin-delete-users="true"]');
        if (existing) {
          insertedLink = existing;
        } else {
          const link = document.createElement("a");
          link.href = "/admin/delete-users";
          link.dataset.adminDeleteUsers = "true";
          link.className = "flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold transition bg-transparent text-slate-400 hover:bg-rose-950/40 hover:text-rose-300";
          link.setAttribute("aria-label", "Permanent User Deletion");
          link.innerHTML = `
            <span class="inline-flex h-4 w-4 items-center justify-center" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
                <path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v5"></path><path d="M14 11v5"></path>
              </svg>
            </span>
            <span>Permanent User Deletion</span>
          `;
          emailLink.insertAdjacentElement("afterend", link);
          insertedLink = link;
        }
      }

      if (insertedLink) {
        const active = location.pathname === "/admin/delete-users";
        insertedLink.className = active
          ? "flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold transition bg-rose-600 text-white shadow-lg shadow-rose-600/20"
          : "flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold transition bg-transparent text-slate-400 hover:bg-rose-950/40 hover:text-rose-300";
      }
    };

    sync();
    observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer?.disconnect();
      const link = document.querySelector<HTMLAnchorElement>('a[data-admin-delete-users="true"]');
      link?.remove();
    };
  }, [location.pathname]);

  return null;
}
