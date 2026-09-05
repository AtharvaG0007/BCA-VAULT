import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import {
  X,
  Shield,
  ShieldCheck,
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
  EyeOff,
  FileText,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";

// Configure PDF.js worker URL with Mozilla's legacy build (includes core-js polyfills for mobile)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface ProtectedPdfViewerProps {
  url: string;
  title: string;
  subject?: string;
  semester?: number;
  expiresIn?: number; // retained for backwards compatibility
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
  watermarkData,
  onClose,
  onSessionExpired,
}: ProtectedPdfViewerProps) {
  const { appUser, user } = useAuth();

  // Document state
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [fitMode, setFitMode] = useState<"fit-width" | "fit-page" | "custom">("fit-width");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Rendered dimensions for canvas wrapper
  const [renderedDims, setRenderedDims] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Status & deterrence state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState<boolean>(false);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [isWindowBlurred, setIsWindowBlurred] = useState<boolean>(false);
  const [jumpPageInput, setJumpPageInput] = useState<string>("1");

  // DOM Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  // Student identity for subtle forensic watermark overlay
  const studentName =
    watermarkData?.studentName ||
    appUser?.name ||
    user?.user_metadata?.full_name ||
    "Student";
  const studentId =
    watermarkData?.studentId ||
    appUser?.uid ||
    user?.id ||
    "";
  const maskedId = studentId ? studentId.slice(0, 8).toUpperCase() : "STUDENT";

  // Subtle watermark text: forensic deterrent without cluttering document text
  const watermarkText = `BCA VAULT • LICENSED STUDENT • ${studentName} • ID:${maskedId}`;

  // ── Window Blur Privacy Shield ───────────────────────────────────────────
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

  // ── Keyboard Navigation & Deterrence Shortcuts ───────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to exit fullscreen or close viewer
      if (e.key === "Escape") {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
        return;
      }

      // Arrow page navigation
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

      // Intercept browser print, save, copy shortcuts
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

  // ── Load PDF Document via PDF.js ─────────────────────────────────────────
  const loadDocument = useCallback(async () => {
    if (!url) {
      setErrorMsg("No document link provided.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setIsUnauthorized(false);
    setIsExpired(false);

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
        if (onSessionExpired) onSessionExpired();
      } else {
        setErrorMsg(
          err.message ||
            "Unable to render protected document. Please check your network connection."
        );
      }
    }
  }, [url, onSessionExpired]);

  useEffect(() => {
    void loadDocument();
    return () => {
      if (pdfDoc) {
        pdfDoc.cleanup().catch(() => {});
      }
    };
  }, [loadDocument]);

  // ── Render Current Page & Calculate Optimal Dimensions ───────────────────
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || isExpired) return;

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {
        // clean cancellation of previous render task
      }
    }

    try {
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const unscaledViewport = page.getViewport({ scale: 1.0 });
      let activeScale = scale;

      // Compute responsive scale if fitMode is active
      if (containerRef.current && fitMode !== "custom") {
        const isMobile = window.innerWidth < 640;
        const horizontalPadding = isMobile ? 12 : 32;
        const verticalPadding = isMobile ? 12 : 32;

        const availableWidth = Math.max(
          containerRef.current.clientWidth - horizontalPadding,
          100
        );
        const availableHeight = Math.max(
          containerRef.current.clientHeight - verticalPadding,
          100
        );

        if (fitMode === "fit-width") {
          activeScale = availableWidth / unscaledViewport.width;
          // Mobile safe scaling: allow scale down to 0.25 for small phones without clipping
          activeScale = Math.min(Math.max(activeScale, 0.25), 3.0);
        } else if (fitMode === "fit-page") {
          const scaleW = availableWidth / unscaledViewport.width;
          const scaleH = availableHeight / unscaledViewport.height;
          activeScale = Math.min(Math.min(scaleW, scaleH), 3.0);
          activeScale = Math.max(activeScale, 0.25);
        }
      }

      const viewport = page.getViewport({ scale: activeScale });
      const pixelRatio = window.devicePixelRatio || 1;

      // Match canvas internal resolution with screen DPI for crisp high-DPI rendering
      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      // Update state for wrapper & watermark positioning
      setRenderedDims({
        width: Math.floor(viewport.width),
        height: Math.floor(viewport.height),
      });

      ctx.save();
      ctx.scale(pixelRatio, pixelRatio);

      // Render actual PDF contents cleanly
      const renderTask = page.render({
        canvasContext: ctx,
        viewport,
        canvas,
      });
      renderTaskRef.current = renderTask;
      await renderTask.promise;

      // ── Baked-in Subtle Forensic Watermark (Canvas Pixels) ───────────────────
      // Ensures document protection is embedded in rasterized pixels without obstructing text
      ctx.save();
      ctx.globalAlpha = 0.07;
      ctx.font = "600 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillStyle = "#334155";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const angle = -15 * (Math.PI / 180);
      const centerX = viewport.width / 2;
      const stepY = viewport.height / 3;

      for (let y = stepY; y < viewport.height; y += stepY) {
        ctx.save();
        ctx.translate(centerX, y);
        ctx.rotate(angle);
        ctx.fillText(watermarkText, 0, 0);
        ctx.restore();
      }
      ctx.restore();

      ctx.restore();
    } catch (err: any) {
      if (err?.name !== "RenderingCancelledException") {
        console.error("[ProtectedPdfViewer] Render Page Error:", err);
      }
    }
  }, [pdfDoc, currentPage, scale, fitMode, isExpired, watermarkText]);

  useEffect(() => {
    void renderCurrentPage();
  }, [renderCurrentPage]);

  // Handle window resizing cleanly
  useEffect(() => {
    let resizeTimer: any = null;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        void renderCurrentPage();
      }, 100);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
    };
  }, [renderCurrentPage]);

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
    setScale((s) => Math.min(s + 0.2, 3.0));
  };

  const handleZoomOut = () => {
    setFitMode("custom");
    setScale((s) => Math.max(s - 0.2, 0.4));
  };

  const handleResetZoom = () => {
    setFitMode("custom");
    setScale(1.0);
  };

  const handleFitToggle = () => {
    if (fitMode === "fit-width") {
      setFitMode("fit-page");
    } else {
      setFitMode("fit-width");
    }
  };

  return (
    <>
      {/* Strict Print Suppression: Hides document if browser print is initiated */}
      <style>{`
        @media print {
          body * {
            display: none !important;
            visibility: hidden !important;
          }
          body::before {
            content: "Printing and downloading are prohibited on BCA Vault protected documents.";
            display: block !important;
            visibility: visible !important;
            font-size: 20px;
            font-weight: bold;
            text-align: center;
            padding: 40px;
            color: #dc2626;
          }
        }
      `}</style>

      {/* Main Container: Full viewport on mobile, centered modal card on desktop */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md select-none ${
          isFullscreen ? "p-0" : "p-0 sm:p-4"
        }`}
        onContextMenu={(e) => e.preventDefault()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.99 }}
          transition={{ duration: 0.15 }}
          className={`relative flex flex-col bg-slate-950 text-white overflow-hidden shadow-2xl transition-all ${
            isFullscreen
              ? "h-[100dvh] w-[100vw] rounded-none border-0"
              : "h-[100dvh] sm:h-[95vh] w-full sm:max-w-6xl sm:rounded-2xl border-0 sm:border sm:border-slate-800/80"
          }`}
        >
          {/* ── Compact Header (Timer completely removed) ───────────────────── */}
          <header className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/95 px-3 py-2 sm:px-4 sm:py-2.5 text-white shrink-0 z-30">
            <div className="flex items-center gap-2.5 min-w-0 mr-2">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xs sm:text-sm font-semibold text-slate-100 leading-snug">
                  {title}
                </h2>
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400 truncate">
                  <span>{subject || "BCA Vault Notes"}</span>
                  {semester ? (
                    <>
                      <span className="text-slate-600">•</span>
                      <span>Sem {semester}</span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Protected badge */}
              <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-emerald-400">
                <Lock className="h-2.5 w-2.5" />
                <span>Protected</span>
              </div>

              {/* Fullscreen toggle */}
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="grid h-8 w-8 place-items-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                title={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen"}
                aria-label="Toggle Fullscreen"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </button>

              {/* Close button */}
              <button
                type="button"
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 hover:text-white transition"
                title="Close Viewer (Esc)"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* ── Document Viewport (Flex: 1, Maximize Reading Space) ─────────── */}
          <div
            ref={containerRef}
            className="relative flex-1 bg-slate-950/70 overflow-auto flex flex-col items-center justify-start p-2 sm:p-4"
            style={{
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-6 space-y-4 m-auto">
                <div className="relative">
                  <div className="h-10 w-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                  <Shield className="absolute inset-0 m-auto h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-200">
                    Preparing Protected Document
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Verifying authorization…{" "}
                    {loadingProgress > 0 ? `${loadingProgress}%` : ""}
                  </p>
                </div>
              </div>
            )}

            {/* Error State */}
            {!isLoading && errorMsg && (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-6 max-w-md m-auto">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/20 mb-3">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Document Unavailable
                </h3>
                <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                  {errorMsg}
                </p>
                <button
                  type="button"
                  onClick={() => void loadDocument()}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Try Again
                </button>
              </div>
            )}

            {/* Unauthorized State */}
            {!isLoading && isUnauthorized && (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-6 max-w-md m-auto">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/20 mb-3">
                  <Lock className="h-6 w-6" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Access Permission Required
                </h3>
                <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                  You do not have active permission to view this note. Please
                  ensure your course bundle enrollment is verified.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
                >
                  Return to Dashboard
                </button>
              </div>
            )}

            {/* Expired Session State */}
            {!isLoading && isExpired && (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-6 max-w-md m-auto">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/20 mb-3">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Session Refreshed
                </h3>
                <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                  For your account security, temporary access has expired.
                  Please re-open the document to continue reading.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Re-open Document
                </button>
              </div>
            )}

            {/* Active Document Rendering Container */}
            {!isLoading && !errorMsg && !isUnauthorized && !isExpired && (
              <div
                className="relative mx-auto rounded-lg shadow-2xl overflow-hidden bg-white shrink-0 my-auto"
                style={{
                  width: renderedDims.width ? `${renderedDims.width}px` : "auto",
                  height: renderedDims.height ? `${renderedDims.height}px` : "auto",
                  maxWidth: "100%",
                }}
              >
                {/* ── Subtle Sparse Watermark Overlay (Viewer Layer only) ───── */}
                <div
                  className="pointer-events-none absolute inset-0 z-10 overflow-hidden flex flex-col justify-around select-none py-8 sm:py-16"
                  aria-hidden="true"
                >
                  {/* 2 to 3 sparse diagonal watermark bands across the page */}
                  {[0, 1, 2].map((idx) => (
                    <div
                      key={idx}
                      className="whitespace-nowrap text-center -rotate-12 transform"
                    >
                      <span className="text-[10px] sm:text-xs font-semibold tracking-wider text-slate-900/[0.04] select-none uppercase">
                        {watermarkText}
                      </span>
                    </div>
                  ))}
                </div>

                {/* ── HTML5 Canvas Rendering ───────────────────────────────── */}
                <canvas
                  ref={canvasRef}
                  className="block mx-auto"
                />

                {/* ── Window Blur Privacy Shield Overlay ─────────────────────── */}
                <AnimatePresence>
                  {isWindowBlurred && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md p-6 text-center"
                    >
                      <EyeOff className="h-9 w-9 text-indigo-400 mb-2" />
                      <p className="text-xs sm:text-sm font-bold text-white">
                        Document Shielded
                      </p>
                      <p className="mt-1 text-xs text-slate-400 max-w-xs leading-relaxed">
                        Content is hidden while your window is not in focus.
                        Click anywhere to resume reading.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* ── Bottom Floating Control Toolbar ─────────────────────────────── */}
          <footer className="flex items-center justify-between gap-2 border-t border-slate-800/80 bg-slate-900/95 px-3 py-2 sm:px-4 text-xs text-slate-300 shrink-0 z-30">
            {/* Page Navigation */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={goToPrevPage}
                disabled={currentPage <= 1}
                className="grid h-8 w-8 place-items-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
                title="Previous Page (Left Arrow)"
                aria-label="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <form
                onSubmit={handleJumpPageSubmit}
                className="flex items-center gap-1 text-[11px]"
              >
                <input
                  type="text"
                  inputMode="numeric"
                  value={jumpPageInput}
                  onChange={(e) => setJumpPageInput(e.target.value)}
                  onBlur={handleJumpPageSubmit}
                  className="w-9 h-7 rounded border border-slate-700 bg-slate-800 px-1 text-center font-bold text-white outline-none focus:border-indigo-500 text-xs"
                  aria-label="Page Number"
                />
                <span className="text-slate-400 text-[11px]">
                  / {totalPages || 1}
                </span>
              </form>

              <button
                type="button"
                onClick={goToNextPage}
                disabled={currentPage >= totalPages}
                className="grid h-8 w-8 place-items-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
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
                disabled={scale <= 0.4}
                className="grid h-8 w-8 place-items-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 transition"
                title="Zoom Out"
                aria-label="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                className="h-8 px-2 rounded-lg bg-slate-800 text-[11px] font-mono font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
                title="Reset Zoom to 100%"
              >
                {Math.round(scale * 100)}%
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                disabled={scale >= 3.0}
                className="grid h-8 w-8 place-items-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 transition"
                title="Zoom In"
                aria-label="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={handleFitToggle}
                className={`h-8 px-2.5 rounded-lg text-[11px] font-medium transition flex items-center gap-1 ${
                  fitMode === "fit-width"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
                title={
                  fitMode === "fit-width"
                    ? "Switch to Fit Page"
                    : "Fit to Width"
                }
                aria-label="Toggle Fit Mode"
              >
                <Maximize className="h-3 w-3" />
                <span className="hidden sm:inline">
                  {fitMode === "fit-width" ? "Fit Width" : "Fit Page"}
                </span>
              </button>
            </div>

            {/* Licensed Student Tag (Desktop Only) */}
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
              <span>Licensed to:</span>
              <span className="font-semibold text-slate-200 truncate max-w-[180px]">
                {studentName}
              </span>
            </div>
          </footer>
        </motion.div>
      </div>
    </>
  );
}
