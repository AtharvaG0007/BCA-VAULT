import React from "react";

export function Skeleton({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-800/70 ${className}`}
      {...props}
    />
  );
}

export function SkeletonText({
  className = "",
  width = "w-full",
}: {
  className?: string;
  width?: string;
}) {
  return <Skeleton className={`h-3.5 ${width} ${className}`} />;
}

export function SkeletonBadge({ className = "" }: { className?: string }) {
  return <Skeleton className={`h-5 w-20 rounded-full ${className}`} />;
}

export function SkeletonButton({ className = "" }: { className?: string }) {
  return <Skeleton className={`h-8 w-24 rounded-xl ${className}`} />;
}

/** Dashboard Tab Skeleton */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* 8 Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-xl shadow-black/20 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-4 rounded-md" />
            </div>
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-2.5 w-36" />
          </div>
        ))}
      </div>

      {/* Recent Payments Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 pb-3">
                <th className="pb-3 pr-4"><Skeleton className="h-3.5 w-16" /></th>
                <th className="pb-3 pr-4"><Skeleton className="h-3.5 w-14" /></th>
                <th className="pb-3 pr-4"><Skeleton className="h-3.5 w-16" /></th>
                <th className="pb-3 pr-4"><Skeleton className="h-3.5 w-12" /></th>
                <th className="pb-3 pr-4"><Skeleton className="h-3.5 w-14" /></th>
                <th className="pb-3 pr-4"><Skeleton className="h-3.5 w-12" /></th>
                <th className="pb-3 text-right"><Skeleton className="h-3.5 w-14 ml-auto" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="py-3.5 pr-4"><Skeleton className="h-4 w-28" /></td>
                  <td className="py-3.5 pr-4"><Skeleton className="h-3.5 w-36" /></td>
                  <td className="py-3.5 pr-4"><Skeleton className="h-4 w-16" /></td>
                  <td className="py-3.5 pr-4"><Skeleton className="h-3.5 w-24" /></td>
                  <td className="py-3.5 pr-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                  <td className="py-3.5 pr-4"><Skeleton className="h-3.5 w-20" /></td>
                  <td className="py-3.5 text-right"><Skeleton className="h-7 w-16 rounded-lg ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Students Table Skeleton (matching STUDENT | ACCOUNT | PAYMENT | BUNDLE | REGISTERED | ACTIONS) */
export function StudentsTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-48 sm:w-56 rounded-xl" />
          <Skeleton className="h-8 w-20 rounded-xl" />
          <Skeleton className="h-8 w-28 rounded-xl" />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold tracking-wide">
                <th className="pb-3 pr-4">STUDENT</th>
                <th className="pb-3 pr-4">ACCOUNT</th>
                <th className="pb-3 pr-4">PAYMENT</th>
                <th className="pb-3 pr-4">BUNDLE</th>
                <th className="pb-3 pr-4">REGISTERED</th>
                <th className="pb-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {/* STUDENT */}
                  <td className="py-3.5 pr-4 space-y-1.5">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-44" />
                    <Skeleton className="h-2.5 w-24" />
                  </td>
                  {/* ACCOUNT */}
                  <td className="py-3.5 pr-4 space-y-1.5">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </td>
                  {/* PAYMENT */}
                  <td className="py-3.5 pr-4">
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </td>
                  {/* BUNDLE */}
                  <td className="py-3.5 pr-4 space-y-1">
                    <Skeleton className="h-5 w-32 rounded-md" />
                  </td>
                  {/* REGISTERED */}
                  <td className="py-3.5 pr-4">
                    <Skeleton className="h-3.5 w-24" />
                  </td>
                  {/* ACTIONS */}
                  <td className="py-3.5 text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      <Skeleton className="h-7 w-20 rounded-lg" />
                      <Skeleton className="h-7 w-14 rounded-lg" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Payments Table Skeleton */
export function PaymentsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-16 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-8 w-56 rounded-xl" />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="pb-3 pr-4">Student Name</th>
                <th className="pb-3 pr-4">Email & Phone</th>
                <th className="pb-3 pr-4">Course / Sem</th>
                <th className="pb-3 pr-4">Amount</th>
                <th className="pb-3 pr-4">UTR / Ref</th>
                <th className="pb-3 pr-4">Referral Code</th>
                <th className="pb-3 pr-4">Bundle</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Date</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td className="py-3.5 pr-4"><Skeleton className="h-4 w-32" /></td>
                  <td className="py-3.5 pr-4 space-y-1">
                    <Skeleton className="h-3.5 w-36" />
                    <Skeleton className="h-2.5 w-24" />
                  </td>
                  <td className="py-3.5 pr-4"><Skeleton className="h-3.5 w-20" /></td>
                  <td className="py-3.5 pr-4"><Skeleton className="h-4 w-16" /></td>
                  <td className="py-3.5 pr-4 space-y-1">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-2.5 w-20" />
                  </td>
                  <td className="py-3.5 pr-4"><Skeleton className="h-5 w-24 rounded-md" /></td>
                  <td className="py-3.5 pr-4"><Skeleton className="h-3.5 w-28" /></td>
                  <td className="py-3.5 pr-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                  <td className="py-3.5 pr-4"><Skeleton className="h-3.5 w-24" /></td>
                  <td className="py-3.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <Skeleton className="h-7 w-16 rounded-lg" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Referrals Tab Skeleton */
export function ReferralsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-xl shadow-black/20 space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-36" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
        <Skeleton className="h-5 w-44" />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 pb-3">
                <th className="pb-3 pr-4"><Skeleton className="h-3.5 w-24" /></th>
                <th className="pb-3 pr-4"><Skeleton className="h-3.5 w-24" /></th>
                <th className="pb-3 pr-4"><Skeleton className="h-3.5 w-20" /></th>
                <th className="pb-3 pr-4"><Skeleton className="h-3.5 w-16" /></th>
                <th className="pb-3 pr-4"><Skeleton className="h-3.5 w-20" /></th>
                <th className="pb-3 pr-4"><Skeleton className="h-3.5 w-20" /></th>
                <th className="pb-3 text-right"><Skeleton className="h-3.5 w-14 ml-auto" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="py-3.5 pr-4 space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-36" />
                  </td>
                  <td className="py-3.5 pr-4 space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-36" />
                  </td>
                  <td className="py-3.5 pr-4"><Skeleton className="h-5 w-28 rounded-md" /></td>
                  <td className="py-3.5 pr-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                  <td className="py-3.5 pr-4"><Skeleton className="h-4 w-32" /></td>
                  <td className="py-3.5 pr-4"><Skeleton className="h-3.5 w-24" /></td>
                  <td className="py-3.5 text-right"><Skeleton className="h-7 w-14 rounded-lg ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Bundles Tab Skeleton */
export function BundlesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-800 bg-slate-950 p-5 flex flex-col justify-between space-y-5"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-6 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Notes Tab Skeleton */
export function NotesTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="pb-3 pr-4">Title</th>
                <th className="pb-3 pr-4">Subject</th>
                <th className="pb-3 pr-4">Semester</th>
                <th className="pb-3 pr-4">Storage Location</th>
                <th className="pb-3 pr-4">Linked Bundle</th>
                <th className="pb-3 pr-4">Security</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="py-3.5 pr-4"><Skeleton className="h-4 w-36" /></td>
                  <td className="py-3.5 pr-4"><Skeleton className="h-3.5 w-32" /></td>
                  <td className="py-3.5 pr-4"><Skeleton className="h-3.5 w-16" /></td>
                  <td className="py-3.5 pr-4"><Skeleton className="h-3.5 w-40 font-mono" /></td>
                  <td className="py-3.5 pr-4"><Skeleton className="h-3.5 w-28" /></td>
                  <td className="py-3.5 pr-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                  <td className="py-3.5 pr-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                  <td className="py-3.5 text-right"><Skeleton className="h-6 w-6 rounded-lg ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Access Control Tab Skeleton */
export function AccessTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Skeleton className="h-9 w-44 rounded-xl" />
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="pb-3 pr-4">Student Name</th>
                <th className="pb-3 pr-4">Student Email</th>
                <th className="pb-3 pr-4">Authorized Bundle</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Granted On</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="py-3.5 pr-4"><Skeleton className="h-4 w-32" /></td>
                  <td className="py-3.5 pr-4"><Skeleton className="h-3.5 w-36" /></td>
                  <td className="py-3.5 pr-4"><Skeleton className="h-4 w-32" /></td>
                  <td className="py-3.5 pr-4"><Skeleton className="h-5 w-18 rounded-full" /></td>
                  <td className="py-3.5 pr-4"><Skeleton className="h-3.5 w-24" /></td>
                  <td className="py-3.5 text-right"><Skeleton className="h-7 w-16 rounded-lg ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Activity Logs Skeleton */
export function ActivityLogsSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-semibold">
              <th className="pb-3 pr-4">Action</th>
              <th className="pb-3 pr-4">Target Type</th>
              <th className="pb-3 pr-4">Target ID</th>
              <th className="pb-3">Date & Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                <td className="py-3.5 pr-4"><Skeleton className="h-4 w-28" /></td>
                <td className="py-3.5 pr-4"><Skeleton className="h-3.5 w-24" /></td>
                <td className="py-3.5 pr-4"><Skeleton className="h-3 w-36 font-mono" /></td>
                <td className="py-3.5"><Skeleton className="h-3.5 w-32" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Email Console Skeleton */
export function EmailConsoleSkeleton() {
  return (
    <div className="space-y-6">
      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-2">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>

      {/* Grid: Left Queue + Right Editor */}
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-12" />
          </div>
          <Skeleton className="h-8 w-full rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-7 flex-1 rounded-lg" />
            <Skeleton className="h-7 flex-1 rounded-lg" />
          </div>
          <div className="space-y-2 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 space-y-2">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-2.5 w-28" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-9 w-full rounded-xl" />
            <Skeleton className="h-9 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Full Progressive Admin Shell Skeleton for initial page load or session restore */
export function AdminShellSkeleton({ pathname = "" }: { pathname?: string }) {
  const isStudents = pathname.includes("student");
  const isPayments = pathname.includes("payment");
  const isReferrals = pathname.includes("referral");
  const isBundles = pathname.includes("bundle");
  const isNotes = pathname.includes("note");
  const isAccess = pathname.includes("access");
  const isEmail = pathname.includes("email");
  const isActivity = pathname.includes("activit");

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col lg:flex-row">
      {/* Sidebar Skeleton */}
      <aside className="w-full lg:w-64 bg-slate-950 border-b lg:border-b-0 lg:border-r border-slate-800 p-5 flex flex-col justify-between shrink-0 space-y-6">
        <div>
          <div className="flex items-center gap-3 px-2 py-3 border-b border-slate-800/80 mb-6">
            <div className="h-9 w-9 rounded-xl bg-indigo-600/50 animate-pulse" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <div className="pt-4 border-t border-slate-800/80 px-2 space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-7 w-20 rounded-xl" />
        </div>
      </aside>

      {/* Main Content Skeleton */}
      <main className="flex-1 min-w-0 p-5 lg:p-8 bg-slate-900 space-y-6">
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-40" />
          </div>
          <Skeleton className="h-8 w-24 rounded-xl" />
        </header>

        {isStudents ? (
          <StudentsTableSkeleton />
        ) : isPayments ? (
          <PaymentsTableSkeleton />
        ) : isReferrals ? (
          <ReferralsSkeleton />
        ) : isBundles ? (
          <BundlesSkeleton />
        ) : isNotes ? (
          <NotesTableSkeleton />
        ) : isAccess ? (
          <AccessTableSkeleton />
        ) : isEmail ? (
          <EmailConsoleSkeleton />
        ) : isActivity ? (
          <ActivityLogsSkeleton />
        ) : (
          <DashboardSkeleton />
        )}
      </main>
    </div>
  );
}
