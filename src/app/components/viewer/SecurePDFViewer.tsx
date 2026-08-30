import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  X,
  Shield,
  Maximize2,
  Minimize2,
  ExternalLink,
  Lock,
  Download,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";

interface SecurePDFViewerProps {
  url: string;
  title: string;
  subject?: string;
  semester?: number;
  onClose: () => void;
}

export function SecurePDFViewer({
  url,
  title,
  subject,
  semester,
  onClose,
}: SecurePDFViewerProps) {
  const { appUser, user } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const studentName = appUser?.name || user?.user_metadata?.full_name || "Student";
  const studentEmail = appUser?.email || user?.email || "student@bcavault.in";
  const currentDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const watermarkText = `${studentName} (${studentEmail}) • BCA VAULT • LICENSED COPY • ${currentDate}`;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
      // Block common print / save shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "s")) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4 select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className={`relative flex flex-col rounded-2xl sm:rounded-3xl border border-slate-700/60 bg-slate-900 shadow-2xl overflow-hidden transition-all ${
          isFullscreen
            ? "h-[98vh] w-[99vw] max-w-none"
            : "h-[88vh] w-full max-w-5xl"
        }`}
      >
        {/* Viewer Top Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-3 text-white">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Shield className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-slate-100">{title}</h3>
              <p className="truncate text-[11px] text-slate-400">
                {subject || "BCA Theory Material"}
                {semester ? ` • Semester ${semester}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 rounded-full bg-slate-800/80 px-3 py-1 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
              <Lock className="h-3 w-3" />
              <span>Protected View</span>
            </div>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="grid h-8 w-8 place-items-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>

            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 hover:text-white transition"
              title="Close Viewer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* PDF Frame with Dynamic Security Watermark Overlay */}
        <div className="relative flex-1 bg-slate-950 overflow-hidden">
          {/* Watermark Overlay (repeated diagonal pattern) */}
          <div
            className="pointer-events-none absolute inset-0 z-20 overflow-hidden flex flex-col justify-around opacity-[0.08] select-none"
            aria-hidden="true"
          >
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="whitespace-nowrap text-center text-sm sm:text-base font-black tracking-widest text-white -rotate-12 transform"
              >
                {watermarkText} &nbsp;&nbsp; • &nbsp;&nbsp; {watermarkText}
              </div>
            ))}
          </div>

          {/* PDF Viewer Embed / Iframe */}
          <iframe
            src={`${url}#toolbar=0&navpanes=0&scrollbar=1`}
            className="h-full w-full border-0"
            title={title}
          />
        </div>

        {/* Viewer Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 bg-slate-900/90 px-4 py-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Licensed to:</span>
            <span className="text-indigo-300">{studentEmail}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Viewing session expires in 10 minutes</span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold transition"
            >
              Open in new tab <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
