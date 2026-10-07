import { useRef, useCallback, useEffect } from "react";
import type * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

/**
 * Maximum canvas pixel area to prevent GPU/memory crashes.
 * ~33 million pixels ≈ 4K x 8K. Safe for most devices.
 */
const MAX_CANVAS_PIXELS = 33_554_432;

/**
 * Cap the effective devicePixelRatio to avoid enormous canvases on ultra-high-DPI screens.
 */
const MAX_DPR = 2;

export interface RenderRequest {
  page: number;
  scale: number;
  fitMode: "fit-width" | "fit-page" | "custom";
  containerWidth: number;
  containerHeight: number;
}

export interface RenderResult {
  width: number;
  height: number;
  actualScale: number;
}

export interface UsePdfRendererOptions {
  debounceMs?: number;
  onRenderStart?: () => void;
  onRenderComplete?: (result: RenderResult) => void;
  onRenderError?: (error: Error) => void;
}

/**
 * Computes the effective scale from a RenderRequest.
 */
export function computeEffectiveScale(
  viewport: { width: number; height: number },
  request: RenderRequest
): number {
  if (request.fitMode === "custom") return request.scale;

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const hPad = isMobile ? 16 : 32;
  const vPad = isMobile ? 16 : 32;

  const availW = Math.max(request.containerWidth - hPad, 100);
  const availH = Math.max(request.containerHeight - vPad, 100);

  if (request.fitMode === "fit-width") {
    return Math.min(Math.max(availW / viewport.width, 0.25), 4.0);
  }

  // fit-page
  const scaleW = availW / viewport.width;
  const scaleH = availH / viewport.height;
  return Math.min(Math.max(Math.min(scaleW, scaleH), 0.25), 4.0);
}

/**
 * Renders a PDF page to a canvas with DPR scaling and pixel capping.
 * Returns a RenderResult with the CSS dimensions and actual scale used.
 */
export async function renderPageToCanvas(
  page: pdfjsLib.PDFPageProxy,
  canvas: HTMLCanvasElement,
  effectiveScale: number,
  signal?: { cancelled: boolean }
): Promise<RenderResult> {
  const viewport = page.getViewport({ scale: effectiveScale });
  const rawDpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  let dpr = Math.min(rawDpr, MAX_DPR);

  // Check pixel budget
  let canvasW = Math.floor(viewport.width * dpr);
  let canvasH = Math.floor(viewport.height * dpr);
  const totalPixels = canvasW * canvasH;

  if (totalPixels > MAX_CANVAS_PIXELS) {
    const ratio = Math.sqrt(MAX_CANVAS_PIXELS / totalPixels);
    dpr = dpr * ratio;
    canvasW = Math.floor(viewport.width * dpr);
    canvasH = Math.floor(viewport.height * dpr);
  }

  const cssWidth = Math.floor(viewport.width);
  const cssHeight = Math.floor(viewport.height);

  canvas.width = canvasW;
  canvas.height = canvasH;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas 2D context");

  if (signal?.cancelled) throw new DOMException("Render cancelled", "AbortError");

  ctx.save();
  ctx.scale(dpr, dpr);

  const renderTask = (page.render as any)({
    canvasContext: ctx,
    viewport,
    canvas,
  });

  // Store cancel function
  const cancelHandle = renderTask;

  try {
    await renderTask.promise;
  } catch (err: any) {
    ctx.restore();
    if (err?.name === "RenderingCancelledException") {
      throw new DOMException("Render cancelled", "AbortError");
    }
    throw err;
  }

  ctx.restore();

  return {
    width: cssWidth,
    height: cssHeight,
    actualScale: effectiveScale,
  };
}

/**
 * Hook that manages render scheduling with debouncing and cancellation.
 * Ensures only the latest render request is executed; stale renders are cancelled.
 */
export function usePdfRenderer(options: UsePdfRendererOptions = {}) {
  const { debounceMs = 150, onRenderStart, onRenderComplete, onRenderError } = options;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRenderRef = useRef<{ cancelled: boolean } | null>(null);
  const activeRenderTaskRef = useRef<any>(null);
  const latestRequestRef = useRef<{
    pdfDoc: pdfjsLib.PDFDocumentProxy;
    canvas: HTMLCanvasElement;
    request: RenderRequest;
  } | null>(null);

  const cancelCurrentRender = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (activeRenderRef.current) {
      activeRenderRef.current.cancelled = true;
      activeRenderRef.current = null;
    }
  }, []);

  const executeRender = useCallback(async (
    pdfDoc: pdfjsLib.PDFDocumentProxy,
    canvas: HTMLCanvasElement,
    request: RenderRequest
  ) => {
    // Cancel any existing render
    if (activeRenderRef.current) {
      activeRenderRef.current.cancelled = true;
    }

    const signal = { cancelled: false };
    activeRenderRef.current = signal;

    onRenderStart?.();

    try {
      const page = await pdfDoc.getPage(request.page);

      if (signal.cancelled) return;

      const unscaledVp = page.getViewport({ scale: 1.0 });
      const effectiveScale = computeEffectiveScale(
        { width: unscaledVp.width, height: unscaledVp.height },
        request
      );

      if (signal.cancelled) return;

      const result = await renderPageToCanvas(page, canvas, effectiveScale, signal);

      if (signal.cancelled) return;

      onRenderComplete?.(result);
    } catch (err: any) {
      if (err?.name === "AbortError" || err?.message?.includes("cancelled")) {
        return; // Normal cancellation
      }
      if (err?.name === "RenderingCancelledException") return;
      onRenderError?.(err);
    }
  }, [onRenderStart, onRenderComplete, onRenderError]);

  const scheduleRender = useCallback((
    pdfDoc: pdfjsLib.PDFDocumentProxy,
    canvas: HTMLCanvasElement,
    request: RenderRequest,
    immediate = false
  ) => {
    latestRequestRef.current = { pdfDoc, canvas, request };

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (immediate) {
      void executeRender(pdfDoc, canvas, request);
    } else {
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void executeRender(pdfDoc, canvas, request);
      }, debounceMs);
    }
  }, [executeRender, debounceMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelCurrentRender();
    };
  }, [cancelCurrentRender]);

  return {
    scheduleRender,
    cancelCurrentRender,
  };
}
