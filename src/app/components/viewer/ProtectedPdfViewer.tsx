import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
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
  ArrowLeft,
  EyeOff,
  Search,
  ChevronUp,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { usePdfDocument } from "./hooks/usePdfDocument";
import { usePdfSearch } from "./hooks/usePdfSearch";
import { usePdfThumbnails } from "./hooks/usePdfThumbnails";
import { computeEffectiveScale, renderPageToCanvas } from "./hooks/usePdfRenderer";
import type * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// ── Zoom presets (clean percentages) ────────────────────────────────────────
const ZOOM_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];

function getNextZoomUp(current: number): number {
  for (const z of ZOOM_PRESETS) {
    if (z > current + 0.01) return z;
  }
  return ZOOM_PRESETS[ZOOM_PRESETS.length - 1];
}

function getNextZoomDown(current: number): number {
  for (let i = ZOOM_PRESETS.length - 1; i >= 0; i--) {
    if (ZOOM_PRESETS[i] < current - 0.01) return ZOOM_PRESETS[i];
  }
  return ZOOM_PRESETS[0];
}

function formatZoom(scale: number): string {
  return `${Math.round(scale * 100)}%`;
}

// ── Types ───────────────────────────────────────────────────────────────────
export interface ProtectedPdfViewerProps {
  url: string;
  title: string;
  subject?: string;
  semester?: number;
  expiresIn?: number;
  watermarkData?: {
    studentName?: string;
    studentEmail?: string;
    studentId?: string;
    sessionTimestamp?: string;
  };
  onClose: () => void;
  onSessionExpired?: () => void;
}

// ── Canvas Watermark Painter ────────────────────────────────────────────────
function paintCanvasWatermark(
  ctx: CanvasRenderingContext2D,
  vpWidth: number,
  vpHeight: number,
  banner: string,
  studentLine: string,
  emailLine: string
) {
  ctx.save();
  ctx.globalAlpha = 0.085;
  ctx.fillStyle = "#1e293b";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const angle = -22 * (Math.PI / 180);
  const stepY = Math.max(vpHeight / 4, 180);
  const centerX = vpWidth / 2;

  for (let y = stepY * 0.7; y < vpHeight; y += stepY) {
    ctx.save();
    ctx.translate(centerX, y);
    ctx.rotate(angle);

    ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(banner, 0, -14);

    ctx.font = "600 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(studentLine, 0, 4);

    if (emailLine) {
      ctx.font = "500 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(emailLine, 0, 20);
    }

    ctx.restore();
  }
  ctx.restore();
}

// ── Component ───────────────────────────────────────────────────────────────
export function ProtectedPdfViewer({
  url,
  title,
  subject,
  semester,
  expiresIn,
  watermarkData,
  onClose,
  onSessionExpired,
}: ProtectedPdfViewerProps) {
  const { appUser, user } = useAuth();

  // ── Document hook ─────────────────────────────────────────────────────────
  const {
    pdfDoc,
    totalPages,
    isLoading,
    loadingProgress,
    error,
    reload,
  } = usePdfDocument(url, onSessionExpired);

  // ── State ─────────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [displayScale, setDisplayScale] = useState(1.0);
  const [fitMode, setFitMode] = useState<"fit-width" | "fit-page" | "custom">("fit-width");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);
  const [jumpPageInput, setJumpPageInput] = useState("1");
  const [isRendering, setIsRendering] = useState(false);
  const [renderedDims, setRenderedDims] = useState({ width: 0, height: 0 });

  // ── Refs ──────────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderSignalRef = useRef<{ cancelled: boolean } | null>(null);
  const renderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Authenticated Student identity for watermark ──────────────────────────
  const studentName =
    watermarkData?.studentName ||
    appUser?.name ||
    user?.user_metadata?.full_name ||
    "Student";
  const studentEmail =
    watermarkData?.studentEmail ||
    appUser?.email ||
    user?.email ||
    "";
  const studentId =
    watermarkData?.studentId ||
    appUser?.uid ||
    user?.id ||
    "";
  const maskedId = studentId ? studentId.slice(0, 8).toUpperCase() : "";

  const watermarkBanner = `BCA VAULT • LICENSED COPY`;
  const watermarkStudent = `Licensed to: ${studentName}`;
  const watermarkEmail = studentEmail
    ? `${studentEmail}${maskedId ? ` (${maskedId})` : ""}`
    : maskedId;

  // ── Navigation callbacks (for search hook) ────────────────────────────────
  const navigateToPage = useCallback(
    (page: number) => {
      const clamped = Math.max(1, Math.min(totalPages || 1, page));
      setCurrentPage(clamped);
      setJumpPageInput(String(clamped));
    },
    [totalPages]
  );

  // ── Search hook ───────────────────────────────────────────────────────────
  const search = usePdfSearch(pdfDoc, navigateToPage);

  // ── Thumbnails hook ───────────────────────────────────────────────────────
  const thumbs = usePdfThumbnails(pdfDoc, totalPages);

  // ── Render logic with debounce & cancellation ─────────────────────────────
  const renderPage = useCallback(
    async (immediate = false) => {
      if (!pdfDoc || !canvasRef.current) return;

      // Cancel previous render
      if (renderSignalRef.current) {
        renderSignalRef.current.cancelled = true;
      }
      if (renderTimerRef.current) {
        clearTimeout(renderTimerRef.current);
        renderTimerRef.current = null;
      }

      const doRender = async () => {
        if (!pdfDoc || !canvasRef.current) return;

        const signal = { cancelled: false };
        renderSignalRef.current = signal;
        setIsRendering(true);

        try {
          const page = await pdfDoc.getPage(currentPage);
          if (signal.cancelled) return;

          const container = containerRef.current;
          const containerWidth = container?.clientWidth || 800;
          const containerHeight = container?.clientHeight || 600;

          const unscaledVp = page.getViewport({ scale: 1.0 });
          const effectiveScale = computeEffectiveScale(
            { width: unscaledVp.width, height: unscaledVp.height },
            {
              page: currentPage,
              scale,
              fitMode,
              containerWidth,
              containerHeight,
            }
          );

          if (signal.cancelled) return;

          const result = await renderPageToCanvas(
            page,
            canvasRef.current!,
            effectiveScale,
            signal
          );

          if (signal.cancelled) return;

          // Paint watermark onto canvas
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
              const rawDpr = window.devicePixelRatio || 1;
              const dpr = Math.min(rawDpr, 2);
              ctx.save();
              ctx.scale(dpr, dpr);
              paintCanvasWatermark(
                ctx,
                result.width,
                result.height,
                watermarkBanner,
                watermarkStudent,
                watermarkEmail
              );
              ctx.restore();
            }
          }

          if (signal.cancelled) return;

          setRenderedDims({ width: result.width, height: result.height });
          setDisplayScale(result.actualScale);
          setIsRendering(false);
        } catch (err: any) {
          if (
            err?.name === "AbortError" ||
            err?.name === "RenderingCancelledException" ||
            err?.message?.includes("cancelled")
          ) {
            return;
          }
          console.error("[ProtectedPdfViewer] Render Error:", err);
          setIsRendering(false);
        }
      };

      if (immediate) {
        void doRender();
      } else {
        renderTimerRef.current = setTimeout(() => {
          renderTimerRef.current = null;
          void doRender();
        }, 120);
      }
    },
    [pdfDoc, currentPage, scale, fitMode, watermarkBanner, watermarkStudent, watermarkEmail]
  );

  // ── Re-render on dependency changes ───────────────────────────────────────
  useEffect(() => {
    if (pdfDoc && !error) {
      void renderPage(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, currentPage]);

  // Debounced render for zoom/fit changes
  useEffect(() => {
    if (pdfDoc && !error) {
      void renderPage(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, fitMode]);

  // ── Resize handling ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || !pdfDoc) return;

    const observer = new ResizeObserver(() => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = setTimeout(() => {
        resizeTimerRef.current = null;
        if (fitMode !== "custom") {
          void renderPage(false);
        }
      }, 200);
    });

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    };
  }, [pdfDoc, fitMode, renderPage]);

  // ── Window blur privacy shield ────────────────────────────────────────────
  useEffect(() => {
    const handleBlur = () => setIsWindowBlurred(true);
    const handleFocus = () => setIsWindowBlurred(false);
    const handleVisibility = () => setIsWindowBlurred(document.hidden);

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // ── Scoped copy / context-menu / drag deterrence ───────────────────────────
  // Deters casual copying inside the viewer only; it cannot block OS screenshots,
  // external camera photos, or every browser capture method.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const prevent = (event: Event) => event.preventDefault();
    root.addEventListener("contextmenu", prevent);
    root.addEventListener("copy", prevent);
    root.addEventListener("cut", prevent);
    root.addEventListener("dragstart", prevent);
    root.addEventListener("selectstart", prevent);

    return () => {
      root.removeEventListener("contextmenu", prevent);
      root.removeEventListener("copy", prevent);
      root.removeEventListener("cut", prevent);
      root.removeEventListener("dragstart", prevent);
      root.removeEventListener("selectstart", prevent);
    };
  }, [pdfDoc]);

  // ── Keyboard navigation & deterrence ──────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in search input or page jump input
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if (e.key === "Escape") {
        if (search.isSearchOpen) {
          search.closeSearch();
          return;
        }
        if (isFullscreen) {
          setIsFullscreen(false);
          return;
        }
        onClose();
        return;
      }

      // Search shortcuts
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      if (isCmdOrCtrl && e.key.toLowerCase() === "f") {
        e.preventDefault();
        e.stopPropagation();
        search.openSearch();
        setTimeout(() => searchInputRef.current?.focus(), 50);
        return;
      }

      // Enter/Shift+Enter in search input
      if (isInput && search.isSearchOpen && e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          search.goToPreviousMatch();
        } else {
          search.goToNextMatch();
        }
        return;
      }

      // Navigation & zoom shortcuts (only when not in input)
      if (!isInput) {
        if (e.key === "ArrowRight" || e.key === "PageDown") {
          e.preventDefault();
          navigateToPage(currentPage + 1);
          return;
        }
        if (e.key === "ArrowLeft" || e.key === "PageUp") {
          e.preventDefault();
          navigateToPage(currentPage - 1);
          return;
        }
        if (e.key === "Home") {
          e.preventDefault();
          navigateToPage(1);
          return;
        }
        if (e.key === "End") {
          e.preventDefault();
          navigateToPage(totalPages);
          return;
        }
        if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          setFitMode("custom");
          setScale((s) => getNextZoomUp(s));
          return;
        }
        if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          setFitMode("custom");
          setScale((s) => getNextZoomDown(s));
          return;
        }
        if (e.key === "[" || e.key === "]") {
          e.preventDefault();
          thumbs.toggleSidebar();
          return;
        }
      }

      // Cmd/Ctrl zoom and deterrence shortcuts
      if (isCmdOrCtrl) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          setFitMode("custom");
          setScale((s) => getNextZoomUp(s));
          return;
        }
        if (e.key === "-") {
          e.preventDefault();
          setFitMode("custom");
          setScale((s) => getNextZoomDown(s));
          return;
        }
        if (e.key === "0") {
          e.preventDefault();
          setFitMode("custom");
          setScale(1.0);
          return;
        }
        const key = e.key.toLowerCase();
        if (["p", "s", "c", "a", "u"].includes(key)) {
          if (key !== "f") {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [
    onClose,
    totalPages,
    isFullscreen,
    currentPage,
    search,
    thumbs,
    navigateToPage,
  ]);

  // ── Session expiration timer ──────────────────────────────────────────────
  useEffect(() => {
    if (!expiresIn || expiresIn <= 0) return;
    const timer = setTimeout(() => {
      onSessionExpired?.();
    }, expiresIn * 1000);
    return () => clearTimeout(timer);
  }, [expiresIn, onSessionExpired]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (renderSignalRef.current) renderSignalRef.current.cancelled = true;
      if (renderTimerRef.current) clearTimeout(renderTimerRef.current);
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    };
  }, []);

  // ── Navigation handlers ───────────────────────────────────────────────────
  const goToNextPage = () => navigateToPage(currentPage + 1);
  const goToPrevPage = () => navigateToPage(currentPage - 1);

  const handleJumpPageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      navigateToPage(pageNum);
    } else {
      setJumpPageInput(String(currentPage));
    }
  };

  // ── Zoom handlers ─────────────────────────────────────────────────────────
  const handleZoomIn = () => {
    setFitMode("custom");
    setScale((s) => getNextZoomUp(s));
  };

  const handleZoomOut = () => {
    setFitMode("custom");
    setScale((s) => getNextZoomDown(s));
  };

  const handleResetZoom = () => {
    setFitMode("custom");
    setScale(1.0);
  };

  const handleFitWidth = () => setFitMode("fit-width");
  const handleFitPage = () => setFitMode("fit-page");

  const handleFitToggle = () => {
    setFitMode((m) => (m === "fit-width" ? "fit-page" : "fit-width"));
  };

  // ── Thumbnail load on scroll ──────────────────────────────────────────────
  const thumbScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!thumbs.isSidebarOpen || !thumbScrollRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.getAttribute("data-page") || "0", 10);
            if (pageNum > 0) thumbs.requestThumbnail(pageNum);
          }
        }
      },
      { root: thumbScrollRef.current, rootMargin: "100px" }
    );

    const items = thumbScrollRef.current.querySelectorAll("[data-page]");
    items.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [thumbs.isSidebarOpen, totalPages, thumbs]);

  // ── Preload adjacent pages ────────────────────────────────────────────────
  useEffect(() => {
    if (!pdfDoc) return;
    // Warm up adjacent page data in PDF.js cache
    const toPreload = [currentPage - 1, currentPage + 1].filter(
      (p) => p >= 1 && p <= totalPages
    );
    for (const p of toPreload) {
      pdfDoc.getPage(p).catch(() => {});
    }
  }, [pdfDoc, currentPage, totalPages]);

  // ── Reading progress ──────────────────────────────────────────────────────
  const progressPercent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  // ── Computed state ────────────────────────────────────────────────────────
  const showDocument = !isLoading && !error;
  const isError = !isLoading && error;

  return (
    <>
      {/* Strict Print Suppression */}
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

      {/* Main Container: Full-screen overlay */}
      <div
        className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-0 sm:p-2 md:p-4 overflow-hidden select-none"
        onContextMenu={(e) => e.preventDefault()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className={`flex flex-col bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden w-full h-full ${
            isFullscreen
              ? "fixed inset-0 z-[130] rounded-none border-none"
              : "sm:rounded-2xl sm:max-w-6xl sm:h-[94vh]"
          }`}
        >
          {/* ── Top Bar ──────────────────────────────────────────────────── */}
          <header className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900 px-3 py-2 sm:px-4 sm:py-2.5 text-white shrink-0 z-30">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 mr-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 text-xs font-bold transition shrink-0 cursor-pointer"
                title="Back to Dashboard"
                aria-label="Back to Dashboard"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Back</span>
              </button>

              <div className="min-w-0">
                <h2 className="truncate text-xs sm:text-sm font-bold text-slate-100 leading-tight">
                  {title}
                </h2>
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400 truncate mt-0.5">
                  <span className="truncate">{subject || "BCA Study Material"}</span>
                  {semester ? (
                    <>
                      <span className="text-slate-600">•</span>
                      <span>Sem {semester}</span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Search button */}
              <button
                type="button"
                onClick={() => {
                  search.openSearch();
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
                className="grid h-8 w-8 place-items-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer"
                title="Search (Ctrl+F)"
                aria-label="Search in document"
              >
                <Search className="h-3.5 w-3.5" />
              </button>

              {/* Thumbnail sidebar toggle */}
              <button
                type="button"
                onClick={thumbs.toggleSidebar}
                className={`grid h-8 w-8 place-items-center rounded-lg transition cursor-pointer ${
                  thumbs.isSidebarOpen
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
                title={thumbs.isSidebarOpen ? "Hide page thumbnails" : "Show page thumbnails"}
                aria-label="Toggle page thumbnails"
              >
                {thumbs.isSidebarOpen ? (
                  <PanelLeftClose className="h-3.5 w-3.5" />
                ) : (
                  <PanelLeftOpen className="h-3.5 w-3.5" />
                )}
              </button>

              {/* Protected badge */}
              <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-emerald-400">
                <Lock className="h-2.5 w-2.5 shrink-0" />
                <span className="hidden sm:inline">View Only</span>
                <span className="sm:hidden">Protected</span>
              </div>

              {/* Fullscreen toggle */}
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="grid h-8 w-8 place-items-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer"
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
                className="grid h-8 w-8 place-items-center rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 hover:text-white transition cursor-pointer"
                title="Close Viewer (Esc)"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* ── Search Bar ───────────────────────────────────────────────── */}
          <AnimatePresence>
            {search.isSearchOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden border-b border-slate-800/60 bg-slate-900/95 z-20"
              >
                <div className="flex items-center gap-2 px-3 py-2 sm:px-4">
                  <div className="flex items-center flex-1 gap-2 bg-slate-800 rounded-lg px-3 py-1.5 border border-slate-700 focus-within:border-indigo-500 transition">
                    <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={search.searchQuery}
                      onChange={(e) => search.setSearchQuery(e.target.value)}
                      placeholder="Search in document..."
                      className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-500 min-w-0"
                      aria-label="Search text"
                    />
                    {search.searchQuery && (
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {search.isSearching
                          ? "Searching…"
                          : search.totalMatches > 0
                          ? `${search.currentMatchIndex + 1} / ${search.totalMatches}`
                          : "No results"}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={search.goToPreviousMatch}
                    disabled={search.totalMatches === 0}
                    className="grid h-7 w-7 place-items-center rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 transition cursor-pointer"
                    title="Previous match (Shift+Enter)"
                    aria-label="Previous match"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={search.goToNextMatch}
                    disabled={search.totalMatches === 0}
                    className="grid h-7 w-7 place-items-center rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 transition cursor-pointer"
                    title="Next match (Enter)"
                    aria-label="Next match"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={search.closeSearch}
                    className="grid h-7 w-7 place-items-center rounded-md bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition cursor-pointer"
                    title="Close search (Esc)"
                    aria-label="Close search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Content Area (Sidebar + Document) ────────────────────────── */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* ── Thumbnail Sidebar ────────────────────────────────────── */}
            <AnimatePresence>
              {thumbs.isSidebarOpen && showDocument && (
                <motion.aside
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 160, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="shrink-0 bg-slate-900 border-r border-slate-800/60 overflow-hidden hidden sm:block"
                >
                  <div
                    ref={thumbScrollRef}
                    className="h-full overflow-y-auto overflow-x-hidden py-2 px-2 space-y-2"
                    style={{ overscrollBehavior: "contain" }}
                  >
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                      const thumb = thumbs.thumbnails.get(pageNum);
                      const isActive = pageNum === currentPage;

                      return (
                        <button
                          key={pageNum}
                          data-page={pageNum}
                          type="button"
                          onClick={() => navigateToPage(pageNum)}
                          className={`w-full rounded-lg overflow-hidden transition cursor-pointer border-2 ${
                            isActive
                              ? "border-indigo-500 ring-1 ring-indigo-500/30"
                              : "border-transparent hover:border-slate-600"
                          }`}
                          title={`Go to page ${pageNum}`}
                          aria-label={`Page ${pageNum}`}
                        >
                          {thumb ? (
                            <img
                              src={thumb.dataUrl}
                              alt={`Page ${pageNum}`}
                              className="w-full h-auto bg-white"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full aspect-[3/4] bg-slate-800 animate-pulse flex items-center justify-center">
                              <span className="text-[10px] text-slate-500">{pageNum}</span>
                            </div>
                          )}
                          <div
                            className={`text-[10px] py-0.5 text-center font-medium ${
                              isActive ? "text-indigo-400 bg-indigo-500/10" : "text-slate-400 bg-slate-800/50"
                            }`}
                          >
                            {pageNum}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>

            {/* ── Document Viewport ─────────────────────────────────────── */}
            <div
              ref={containerRef}
              className="relative flex-1 bg-slate-950/80 overflow-auto flex flex-col items-center justify-start p-2 sm:p-4 min-w-0"
              style={{
                overscrollBehavior: "contain",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {/* Loading State */}
              {isLoading && (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-6 space-y-4 m-auto max-w-sm">
                  <div className="w-48 h-64 sm:w-64 sm:h-80 rounded-xl bg-slate-800/60 border border-slate-800 animate-pulse flex flex-col items-center justify-center p-6 space-y-3">
                    <div className="h-8 w-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                    <p className="text-xs font-bold text-slate-300">
                      Loading Protected PDF…
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {loadingProgress > 0 ? `${loadingProgress}%` : "Streaming pages securely"}
                    </p>
                    {loadingProgress > 0 && (
                      <div className="w-full bg-slate-700/50 rounded-full h-1 mt-1">
                        <div
                          className="bg-indigo-500 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${loadingProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error State */}
              {isError && error?.kind === "unauthorized" && (
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
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition cursor-pointer"
                  >
                    Return to Dashboard
                  </button>
                </div>
              )}

              {isError && error?.kind === "expired" && (
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
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Re-open Document
                  </button>
                </div>
              )}

              {isError && (error?.kind === "network" || error?.kind === "corrupt" || error?.kind === "unknown") && (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-6 max-w-md m-auto">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/20 mb-3">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Document Unavailable
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                    {error.message}
                  </p>
                  <button
                    type="button"
                    onClick={reload}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Try Again
                  </button>
                </div>
              )}

              {/* Active Document */}
              {showDocument && (
                <div
                  className="relative mx-auto rounded-lg shadow-2xl overflow-hidden bg-white shrink-0 my-auto max-w-full"
                  style={{
                    width: renderedDims.width ? `${renderedDims.width}px` : "auto",
                    height: renderedDims.height ? `${renderedDims.height}px` : "auto",
                  }}
                >
                  {/* Subtle Sparse Watermark Overlay (Dual protection) */}
                  <div
                    className="pointer-events-none absolute inset-0 z-10 overflow-hidden flex flex-col justify-around select-none py-8 sm:py-16"
                    aria-hidden="true"
                  >
                    {[0, 1, 2].map((idx) => (
                      <div
                        key={idx}
                        className="whitespace-nowrap text-center -rotate-15 transform"
                      >
                        <span className="text-[10px] sm:text-xs font-semibold tracking-wider text-slate-900/[0.045] select-none uppercase">
                          {watermarkBanner} • {watermarkStudent} • {watermarkEmail}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Rendering overlay */}
                  <AnimatePresence>
                    {isRendering && renderedDims.width > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1, delay: 0.3 }}
                        className="absolute inset-0 z-15 flex items-center justify-center pointer-events-none"
                      >
                        <div className="flex items-center gap-2 bg-slate-900/70 backdrop-blur-sm rounded-lg px-3 py-1.5">
                          <div className="h-3 w-3 rounded-full border border-indigo-400/30 border-t-indigo-400 animate-spin" />
                          <span className="text-[10px] font-medium text-slate-300">Updating view…</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Canvas */}
                  <canvas
                    ref={canvasRef}
                    className="block mx-auto max-w-full h-auto"
                  />

                  {/* Window Blur Privacy Shield */}
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
          </div>

          {/* ── Bottom Control Toolbar ────────────────────────────────────── */}
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 bg-slate-900 px-3 py-2 sm:px-4 text-xs text-slate-300 shrink-0 z-30">
            {/* Page Navigation */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => navigateToPage(1)}
                disabled={currentPage <= 1}
                className="grid h-8 w-8 place-items-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="First Page (Home)"
                aria-label="First Page"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={goToPrevPage}
                disabled={currentPage <= 1}
                className="grid h-8 w-8 place-items-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
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
                className="grid h-8 w-8 place-items-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Next Page (Right Arrow)"
                aria-label="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => navigateToPage(totalPages)}
                disabled={currentPage >= totalPages}
                className="grid h-8 w-8 place-items-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Last Page (End)"
                aria-label="Last Page"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </button>

              {/* Reading progress */}
              <div className="hidden sm:flex items-center gap-1.5 ml-2 text-[10px] text-slate-500 select-none">
                <div className="w-16 bg-slate-800 rounded-full h-1">
                  <div
                    className="bg-indigo-500/60 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span>{progressPercent}%</span>
              </div>
            </div>

            {/* Zoom & Viewport Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={displayScale <= ZOOM_PRESETS[0]}
                className="grid h-8 w-8 place-items-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 transition cursor-pointer"
                title="Zoom Out"
                aria-label="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                className="h-8 px-2 rounded-lg bg-slate-800 text-[11px] font-mono font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer min-w-[48px] text-center"
                title="Reset Zoom to 100%"
                aria-label="Reset zoom"
              >
                {formatZoom(displayScale)}
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                disabled={displayScale >= ZOOM_PRESETS[ZOOM_PRESETS.length - 1]}
                className="grid h-8 w-8 place-items-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 transition cursor-pointer"
                title="Zoom In"
                aria-label="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>

              <div className="w-px h-5 bg-slate-700 mx-1 hidden sm:block" />

              <button
                type="button"
                onClick={handleFitWidth}
                className={`h-8 px-2.5 rounded-lg text-[11px] font-medium transition flex items-center gap-1 cursor-pointer ${
                  fitMode === "fit-width"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
                title="Fit to Width"
                aria-label="Fit to Width"
              >
                <Maximize className="h-3 w-3" />
                <span className="hidden sm:inline">Width</span>
              </button>

              <button
                type="button"
                onClick={handleFitPage}
                className={`h-8 px-2.5 rounded-lg text-[11px] font-medium transition flex items-center gap-1 cursor-pointer ${
                  fitMode === "fit-page"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
                title="Fit to Page"
                aria-label="Fit to Page"
              >
                <Maximize className="h-3 w-3" />
                <span className="hidden sm:inline">Page</span>
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                className={`h-8 px-2 rounded-lg text-[11px] font-medium transition cursor-pointer hidden sm:flex items-center gap-1 ${
                  fitMode === "custom" && Math.abs(scale - 1.0) < 0.01
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
                title="Actual Size (100%)"
                aria-label="Actual Size"
              >
                <RotateCcw className="h-3 w-3" />
                <span>100%</span>
              </button>
            </div>

            {/* Authenticated Student Tag */}
            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-400">
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
