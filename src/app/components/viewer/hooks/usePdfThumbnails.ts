import { useState, useRef, useEffect, useCallback } from "react";
import type * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

export interface ThumbnailData {
  pageNum: number;
  dataUrl: string;
  width: number;
  height: number;
}

export interface UsePdfThumbnailsResult {
  thumbnails: Map<number, ThumbnailData>;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  requestThumbnail: (pageNum: number) => void;
}

const THUMB_WIDTH = 120;

/**
 * Hook for lazy-loading PDF page thumbnails.
 * Renders thumbnails at a low resolution on-demand and caches them.
 */
export function usePdfThumbnails(
  pdfDoc: pdfjsLib.PDFDocumentProxy | null,
  totalPages: number
): UsePdfThumbnailsResult {
  const [thumbnails, setThumbnails] = useState<Map<number, ThumbnailData>>(new Map());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderingRef = useRef<Set<number>>(new Set());
  const queueRef = useRef<number[]>([]);
  const isProcessingRef = useRef(false);

  // Clear thumbnails when doc changes
  useEffect(() => {
    setThumbnails(new Map());
    renderingRef.current.clear();
    queueRef.current = [];
    isProcessingRef.current = false;
  }, [pdfDoc]);

  const renderThumbnail = useCallback(
    async (pageNum: number) => {
      if (!pdfDoc || renderingRef.current.has(pageNum)) return;

      renderingRef.current.add(pageNum);

      try {
        const page = await pdfDoc.getPage(pageNum);
        const unscaledVp = page.getViewport({ scale: 1.0 });
        const thumbScale = THUMB_WIDTH / unscaledVp.width;
        const viewport = page.getViewport({ scale: thumbScale });

        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        await (page.render as any)({
          canvasContext: ctx,
          viewport,
          canvas,
        }).promise;

        const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
        const thumbData: ThumbnailData = {
          pageNum,
          dataUrl,
          width: canvas.width,
          height: canvas.height,
        };

        setThumbnails((prev) => {
          const next = new Map(prev);
          next.set(pageNum, thumbData);
          return next;
        });

        // Clean up the offscreen canvas
        canvas.width = 0;
        canvas.height = 0;
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.warn(`[Thumbnails] Failed to render page ${pageNum}:`, err);
        }
      } finally {
        renderingRef.current.delete(pageNum);
      }
    },
    [pdfDoc]
  );

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    while (queueRef.current.length > 0) {
      const pageNum = queueRef.current.shift()!;
      await renderThumbnail(pageNum);
    }

    isProcessingRef.current = false;
  }, [renderThumbnail]);

  const requestThumbnail = useCallback(
    (pageNum: number) => {
      if (thumbnails.has(pageNum) || renderingRef.current.has(pageNum)) return;
      queueRef.current.push(pageNum);
      void processQueue();
    },
    [thumbnails, processQueue]
  );

  // Pre-load visible thumbnails when sidebar opens
  useEffect(() => {
    if (!isSidebarOpen || !pdfDoc || totalPages === 0) return;

    // Load first batch of thumbnails
    const batchSize = Math.min(totalPages, 10);
    for (let i = 1; i <= batchSize; i++) {
      requestThumbnail(i);
    }
  }, [isSidebarOpen, pdfDoc, totalPages, requestThumbnail]);

  const toggleSidebar = useCallback(() => setIsSidebarOpen((v) => !v), []);
  const setSidebarOpen = useCallback((open: boolean) => setIsSidebarOpen(open), []);

  return {
    thumbnails,
    isSidebarOpen,
    toggleSidebar,
    setSidebarOpen,
    requestThumbnail,
  };
}
