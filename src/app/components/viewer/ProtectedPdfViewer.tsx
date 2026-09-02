import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  X,
  Shield,
  ShieldAlert,
  Maximize2,
  Minimize2,
  Lock,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  RefreshCw,
  AlertTriangle,
  Clock,
  EyeOff,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";

// Configure PDF.js worker URL for Vite bundler
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface ProtectedPdfViewerProps {
  url: string;
  title: string;
  subject?: string;
  semester?: number;
  expiresIn?: number; // duration in seconds
  watermarkData?: {
    studentName?: string;
    studentEmail?: string;
    studentId?: string;
    sessionTimestamp?: string;
  };
  onClose: () => void;
  onSessionExpired?: () => void;
}

export function ProtectedPdfViewer({
  url,
  title,
  subject,
  semester,
  expiresIn = 180,
  watermarkData,
  onClose,
  onSessionExpired,
}: ProtectedPdfViewerProps) {
  const { appUser, user } = useAuth();

  // Document state
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [fitMode, setFitMode] = useState<"custom" | "fit-width">("fit-width");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Status & deterrence state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState<boolean>(false);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(expiresIn);
  const [isWindowBlurred, setIsWindowBlurred] = useState<boolean>(false);
  const [jumpPageInput, setJumpPageInput] = useState<string>("1");

  // DOM Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  // Identity attributes for dynamic watermark
  const studentName =
    watermarkData?.studentName ||
    appUser?.name ||
    user?.user_metadata?.full_name ||
    "Student";
  const studentEmail =
    watermarkData?.studentEmail ||
    appUser?.email ||
    user?.email ||
    "student@bcavault.in";
  const studentId =
    watermarkData?.studentId ||
    appUser?.uid ||
    user?.id ||
    "STUDENT-ID";
  const sessionTimestamp =
    watermarkData?.sessionTimestamp || new Date().toISOString();
  const formattedDate = new Date(sessionTimestamp).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const watermarkString = `BCA VAULT • ${studentName} • ${studentEmail} • ID:${studentId.slice(
    0,
    8
  )} • ${formattedDate} • CONFIDENTIAL`;

  // ── Session Countdown Timer ──────────────────────────────────────────────
  useEffect(() => {
    if (isExpired || !expiresIn) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsExpired(true);
          if (onSessionExpired) onSessionExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresIn, isExpired, onSessionExpired]);

  // ── Window Blur & Focus Shielding ────────────────────────────────────────
  useEffect(() => {
    const handleBlur = () => setIsWindowBlurred(true);
    const handleFocus = () => setIsWindowBlurred(false);
    const handleVisibility = () => {
      setIsWindowBlurred(document.hidden);
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // ── Keyboard & Context Menu Deterrence ────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close on Escape
      if (e.key === "Escape") {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
        return;
      }

      // Page navigation with Arrow keys
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        setCurrentPage((p) => Math.min(totalPages || 1, p + 1));
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setCurrentPage((p) => Math.max(1, p - 1));
        return;
      }

      // Intercept common print, save, copy, select-all, view-source shortcuts
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      if (isCmdOrCtrl) {
        const key = e.key.toLowerCase();
        if (["p", "s", "c", "a", "u", "f12"].includes(key)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [onClose, totalPages, isFullscreen]);

  // ── Load PDF Document via PDF.js ────────────────────────────────────────
  const loadDocument = useCallback(async () => {
    if (!url) {
      setErrorMsg("No document link provided.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setIsUnauthorized(false);

    try {
      const loadingTask = pdfjsLib.getDocument({
        url,
        withCredentials: false,
        disableRange: false,
        disableStream: false,
      });

      loadingTask.onProgress = (progress: { loaded: number; total: number }) => {
        if (progress.total > 0) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          setLoadingProgress(percent);
        }
      };

      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setCurrentPage(1);
      setJumpPageInput("1");
      setIsLoading(false);
    } catch (err: any) {
      console.error("[ProtectedPdfViewer] Load Error:", err);
      setIsLoading(false);
      if (
        err.name === "MissingPDFException" ||
        err.status === 403 ||
        err.message?.includes("403")
      ) {
        setIsUnauthorized(true);
      } else if (err.message?.includes("expired") || err.status === 401) {
        setIsExpired(true);
      } else {
        setErrorMsg(
          err.message ||
            "Unable to render protected PDF document. Please check your network connection."
        );
      }
    }
  }, [url]);

  useEffect(() => {
    void loadDocument();
    return () => {
      if (pdfDoc) {
        pdfDoc.cleanup().catch(() => {});
      }
    };
  }, [loadDocument]);

  // ── Render Current Page & Burn Watermark to Canvas ────────────────────────
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || isExpired) return;

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {
        // Cancel previous task cleanly
      }
    }

    try {
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Calculate viewport and scale
      let activeScale = scale;
      const unscaledViewport = page.getViewport({ scale: 1.0 });

      if (fitMode === "fit-width" && containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 48; // padding
        if (containerWidth > 200) {
          activeScale = containerWidth / unscaledViewport.width;
          // Constrain max scale for readability
          activeScale = Math.min(Math.max(activeScale, 0.6), 2.2);
        }
      }

      const viewport = page.getViewport({ scale: activeScale });
      const pixelRatio = window.devicePixelRatio || 1;

      // Match canvas internal resolution with screen DPI
      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      ctx.save();
      ctx.scale(pixelRatio, pixelRatio);

      // 1. Render actual PDF contents to canvas
      const renderTask = page.render({
        canvasContext: ctx,
        viewport,
        canvas,
      });
      renderTaskRef.current = renderTask;
      await renderTask.promise;

      // 2. Burn Dynamic Watermark Directly into Canvas Bitmap Pixels
      // This ensures even if DOM/CSS is tampered with, watermark is baked into the rasterized pixels!
      ctx.globalAlpha = 0.12; // subtle, readable, impossible to crop out
      ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillStyle = "#1e293b"; // dark slate
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";

      const angle = -24 * (Math.PI / 180);
      const stepX = 280;
      const stepY = 160;

      for (let y = 60; y < viewport.height + 200; y += stepY) {
        for (let x = -80; x < viewport.width + 200; x += stepX) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(angle);
          ctx.fillText("BCA VAULT • LICENSED STUDENT COPY", 0, -10);
          ctx.fillText(`${studentName} • ${studentEmail}`, 0, 8);
          ctx.fillText(
            `UID: ${studentId.slice(0, 12)} • ${formattedDate}`,
            0,
            24
          );
          ctx.restore();
        }
      }

      ctx.restore();
    } catch (err: any) {
      if (err?.name !== "RenderingCancelledException") {
        console.error("[ProtectedPdfViewer] Render Page Error:", err);
      }
    }
  }, [
    pdfDoc,
    currentPage,
    scale,
    fitMode,
    isExpired,
    studentName,
    studentEmail,
    studentId,
    formattedDate,
  ]);

  useEffect(() => {
    void renderCurrentPage();
  }, [renderCurrentPage]);

  // Handle window resizing for fit-to-width
  useEffect(() => {
    if (fitMode !== "fit-width") return;
    const handleResize = () => {
      void renderCurrentPage();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [fitMode, renderCurrentPage]);

  // ── Navigation Controls ──────────────────────────────────────────────────
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      setJumpPageInput(String(nextPage));
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      setJumpPageInput(String(prevPage));
    }
  };

  const handleJumpPageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    } else {
      setJumpPageInput(String(currentPage));
    }
  };

  const handleZoomIn = () => {
    setFitMode("custom");
    setScale((s) => Math.min(s + 0.2, 2.5));
  };

  const handleZoomOut = () => {
    setFitMode("custom");
    setScale((s) => Math.max(s - 0.2, 0.6));
  };

  const handleResetZoom = () => {
    setFitMode("custom");
    setScale(1.2);
  };

  const handleFitWidth = () => {
    setFitMode("fit-width");
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <>
      {/* Strict Print Suppression: hides everything if browser print is initiated */}
      <style>{`
        @media print {
          body * {
            display: none !important;
            visibility: hidden !important;
          }
          body::before {
            content: "Printing and document saving are prohibited on BCA Vault protected documents.";
            display: block !important;
            visibility: visible !important;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            padding: 50px;
            color: #dc2626;
          }
        }
      `}</style>

      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 select-none"
        onContextMenu={(e) => e.preventDefault()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className={`relative flex flex-col rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden transition-all ${
            isFullscreen
              ? "h-[99vh] w-[99vw] max-w-none rounded-none sm:rounded-none"
              : "h-[92vh] w-full max-w-5xl"
          }`}
        >
          {/* ── Top Bar ─────────────────────────────────────────────────── */}
          <header className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/90 px-4 py-3 text-white shrink-0 z-30">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                <Shield className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xs sm:text-sm font-bold text-slate-100">
                  {title}
                </h2>
                <p className="truncate text-[10px] sm:text-[11px] text-slate-400">
                  {subject || "BCA Course Notes"}
                  {semester ? ` • Semester ${semester}` : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Session timer badge */}
              <div
                className={`hidden sm:flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-mono font-medium border ${
                  secondsRemaining < 60
                    ? "bg-rose-950/40 text-rose-300 border-rose-800/50 animate-pulse"
                    : "bg-slate-800/80 text-slate-300 border-slate-700/50"
                }`}
                title="Active access token validity"
              >
                <Clock className="h-3 w-3 text-indigo-400" />
                <span>{formatTimer(secondsRemaining)}</span>
              </div>

              {/* Protected badge */}
              <div className="hidden md:flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
                <Lock className="h-3 w-3" />
                <span>Protected</span>
              </div>

              {/* Fullscreen toggle */}
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="grid h-8 w-8 place-items-center rounded-lg bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                aria-label="Toggle Fullscreen"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>

              {/* Close button */}
              <button
                type="button"
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 hover:text-white transition"
                title="Close Viewer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* ── Document Viewport ───────────────────────────────────────── */}
          <div
            ref={containerRef}
            className="relative flex-1 bg-slate-900/60 overflow-y-auto overflow-x-hidden flex items-start justify-center p-3 sm:p-6"
            style={{ overscrollBehavior: "contain" }}
          >
            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-6 space-y-4">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                  <Shield className="absolute inset-0 m-auto h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-200">
                    Preparing Protected Document
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Decrypting and verifying authorization…{" "}
                    {loadingProgress > 0 ? `${loadingProgress}%` : ""}
                  </p>
                </div>
              </div>
            )}

            {/* Error State */}
            {!isLoading && errorMsg && (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-6 max-w-md">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/20 mb-3">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-white">
                  Document Unavailable
                </h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-400">
                  {errorMsg}
                </p>
                <button
                  type="button"
                  onClick={() => void loadDocument()}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Try Again
                </button>
              </div>
            )}

            {/* Unauthorized State */}
            {!isLoading && isUnauthorized && (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-6 max-w-md">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/20 mb-3">
                  <Lock className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-white">
                  Course Access Required
                </h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-400">
                  You do not have active permission to view this study material.
                  Please ensure your course bundle enrollment is verified.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
                >
                  Return to Dashboard
                </button>
              </div>
            )}

            {/* Expired Session State */}
            {!isLoading && isExpired && (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-6 max-w-md">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/20 mb-3">
                  <Clock className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-white">
                  Reading Session Expired
                </h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-400">
                  For your account security, temporary viewing access has
                  expired. Please re-open the document to continue reading.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Re-open Document
                </button>
              </div>
            )}

            {/* Active Document Rendering Container */}
            {!isLoading && !errorMsg && !isUnauthorized && !isExpired && (
              <div className="relative shadow-2xl rounded-lg overflow-hidden bg-white">
                {/* ── Dynamic DOM Watermark Overlay (Layer 2) ────────────────── */}
                <div
                  className="pointer-events-none absolute inset-0 z-10 overflow-hidden flex flex-col justify-around opacity-[0.07] select-none"
                  aria-hidden="true"
                >
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="whitespace-nowrap text-center text-xs sm:text-sm font-black tracking-widest text-slate-900 -rotate-12 transform"
                    >
                      {watermarkString} &nbsp;&nbsp; • &nbsp;&nbsp;{" "}
                      {watermarkString}
                    </div>
                  ))}
                </div>

                {/* ── HTML5 Canvas Rendering (Layer 1 with burned-in watermark) ── */}
                <canvas
                  ref={canvasRef}
                  className="block mx-auto max-w-full h-auto"
                />

                {/* ── Window Blur Privacy Shield ─────────────────────────────── */}
                <AnimatePresence>
                  {isWindowBlurred && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md p-6 text-center"
                    >
                      <EyeOff className="h-10 w-10 text-indigo-400 mb-2" />
                      <p className="text-sm font-bold text-white">
                        Document Protected
                      </p>
                      <p className="mt-1 text-xs text-slate-400 max-w-xs leading-relaxed">
                        Content is hidden while window or tab is out of focus.
                        Click here to resume reading.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* ── Bottom Floating Control Toolbar ─────────────────────────── */}
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 bg-slate-900/90 px-4 py-2.5 text-xs text-slate-300 shrink-0 z-30">
            {/* Page Navigation */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={goToPrevPage}
                disabled={currentPage <= 1}
                className="grid h-7 w-7 place-items-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
                title="Previous Page (Left Arrow)"
                aria-label="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <form
                onSubmit={handleJumpPageSubmit}
                className="flex items-center gap-1 text-[11px] font-medium"
              >
                <span>Page</span>
                <input
                  type="text"
                  value={jumpPageInput}
                  onChange={(e) => setJumpPageInput(e.target.value)}
                  onBlur={handleJumpPageSubmit}
                  className="w-10 rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-center font-bold text-white outline-none focus:border-indigo-500"
                  aria-label="Current Page"
                />
                <span className="text-slate-400">of {totalPages || 1}</span>
              </form>

              <button
                type="button"
                onClick={goToNextPage}
                disabled={currentPage >= totalPages}
                className="grid h-7 w-7 place-items-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
                title="Next Page (Right Arrow)"
                aria-label="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={scale <= 0.6}
                className="grid h-7 w-7 place-items-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 transition"
                title="Zoom Out"
                aria-label="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-mono font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition"
                title="Reset Zoom to 100%"
              >
                {Math.round(scale * 100)}%
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                disabled={scale >= 2.5}
                className="grid h-7 w-7 place-items-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 transition"
                title="Zoom In"
                aria-label="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={handleFitWidth}
                className={`grid h-7 w-7 place-items-center rounded-lg transition ${
                  fitMode === "fit-width"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
                title="Fit to Width"
                aria-label="Fit to Width"
              >
                <Maximize className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Licensed Info Footer */}
            <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400">
              <ShieldAlert className="h-3.5 w-3.5 text-indigo-400" />
              <span>Licensed to:</span>
              <span className="font-semibold text-slate-200">
                {studentName} ({studentEmail})
              </span>
            </div>
          </footer>
        </motion.div>
      </div>
    </>
  );
}
