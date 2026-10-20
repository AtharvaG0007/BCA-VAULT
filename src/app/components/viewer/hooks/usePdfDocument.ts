import { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

// Configure PDF.js worker once at module level
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export type PdfLoadError =
  | { kind: "unauthorized" }
  | { kind: "expired" }
  | { kind: "network"; message: string }
  | { kind: "corrupt"; message: string }
  | { kind: "unknown"; message: string };

export interface UsePdfDocumentResult {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  totalPages: number;
  isLoading: boolean;
  loadingProgress: number;
  error: PdfLoadError | null;
  reload: () => void;
}

export function usePdfDocument(
  url: string,
  onSessionExpired?: () => void
): UsePdfDocumentResult {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<PdfLoadError | null>(null);

  const docRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<pdfjsLib.PDFDocumentLoadingTask | null>(null);

  const loadDocument = useCallback(async () => {
    if (!url) {
      setError({ kind: "network", message: "No document link provided." });
      setIsLoading(false);
      return;
    }

    // Cleanup previous document
    if (loadingTaskRef.current) {
      try {
        loadingTaskRef.current.destroy();
      } catch {
        // ignore
      }
      loadingTaskRef.current = null;
    }
    if (docRef.current) {
      try {
        await (docRef.current as any).destroy?.();
      } catch {
        // ignore
      }
      docRef.current = null;
    }

    setIsLoading(true);
    setError(null);
    setLoadingProgress(0);
    setPdfDoc(null);
    setTotalPages(0);

    try {
      const loadingTask = pdfjsLib.getDocument({
        url,
        withCredentials: false,
        disableRange: false,
        disableStream: false,
        disableAutoFetch: false,
        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || "4.8.69"}/cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || "4.8.69"}/standard_fonts/`,
      });
      loadingTaskRef.current = loadingTask;

      loadingTask.onProgress = (progress: { loaded: number; total: number }) => {
        if (progress.total > 0) {
          setLoadingProgress(Math.round((progress.loaded / progress.total) * 100));
        }
      };

      const doc = await loadingTask.promise;
      docRef.current = doc;
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setIsLoading(false);
    } catch (err: any) {
      console.error("[usePdfDocument] Load Error:", err);
      setIsLoading(false);

      if (
        err.name === "MissingPDFException" ||
        err.status === 403 ||
        err.message?.includes("403")
      ) {
        setError({ kind: "unauthorized" });
      } else if (err.message?.includes("expired") || err.status === 401) {
        setError({ kind: "expired" });
        onSessionExpired?.();
      } else if (err.name === "InvalidPDFException") {
        setError({ kind: "corrupt", message: "This document appears to be corrupted or unsupported." });
      } else {
        setError({
          kind: "network",
          message: err.message || "Unable to render protected document. Please check your network connection.",
        });
      }
    }
  }, [url, onSessionExpired]);

  useEffect(() => {
    void loadDocument();

    return () => {
      if (loadingTaskRef.current) {
        try {
          loadingTaskRef.current.destroy();
        } catch {
          // ignore
        }
        loadingTaskRef.current = null;
      }
      if (docRef.current) {
        try {
          void (docRef.current as any).destroy?.();
        } catch {
          // ignore
        }
        docRef.current = null;
      }
    };
  }, [loadDocument]);

  return {
    pdfDoc,
    totalPages,
    isLoading,
    loadingProgress,
    error,
    reload: loadDocument,
  };
}
