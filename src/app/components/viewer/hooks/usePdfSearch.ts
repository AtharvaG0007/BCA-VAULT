import { useState, useCallback, useRef, useEffect } from "react";
import type * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

export interface SearchMatch {
  pageIndex: number; // 0-based
  matchIndex: number;
}

export interface UsePdfSearchResult {
  isSearchOpen: boolean;
  searchQuery: string;
  matches: SearchMatch[];
  currentMatchIndex: number;
  isSearching: boolean;
  totalMatches: number;
  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (q: string) => void;
  goToNextMatch: () => void;
  goToPreviousMatch: () => void;
  currentMatchPage: number; // 1-based page number of current match
}

/**
 * Hook for PDF text search. Extracts text from pages and performs
 * case-insensitive substring matching. Results are cached per-query.
 */
export function usePdfSearch(
  pdfDoc: pdfjsLib.PDFDocumentProxy | null,
  onNavigateToPage?: (page: number) => void
): UsePdfSearchResult {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  // Cache extracted page text
  const pageTextsRef = useRef<Map<number, string>>(new Map());
  const searchAbortRef = useRef<{ cancelled: boolean } | null>(null);

  // Clear cache when document changes
  useEffect(() => {
    pageTextsRef.current.clear();
  }, [pdfDoc]);

  const extractPageText = useCallback(
    async (pageNum: number): Promise<string> => {
      const cached = pageTextsRef.current.get(pageNum);
      if (cached !== undefined) return cached;

      if (!pdfDoc) return "";

      try {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const text = textContent.items
          .map((item: any) => ("str" in item ? item.str : ""))
          .join(" ");
        pageTextsRef.current.set(pageNum, text);
        return text;
      } catch {
        return "";
      }
    },
    [pdfDoc]
  );

  const performSearch = useCallback(
    async (query: string) => {
      if (!pdfDoc || !query.trim()) {
        setMatches([]);
        setCurrentMatchIndex(0);
        setIsSearching(false);
        return;
      }

      // Cancel any previous search
      if (searchAbortRef.current) {
        searchAbortRef.current.cancelled = true;
      }
      const signal = { cancelled: false };
      searchAbortRef.current = signal;

      setIsSearching(true);
      const foundMatches: SearchMatch[] = [];
      const needle = query.toLowerCase();

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        if (signal.cancelled) return;

        const text = await extractPageText(i);
        if (signal.cancelled) return;

        const lowerText = text.toLowerCase();
        let searchPos = 0;
        let matchIdx = 0;

        while (true) {
          const idx = lowerText.indexOf(needle, searchPos);
          if (idx === -1) break;
          foundMatches.push({ pageIndex: i - 1, matchIndex: matchIdx++ });
          searchPos = idx + 1;
        }
      }

      if (!signal.cancelled) {
        setMatches(foundMatches);
        setCurrentMatchIndex(0);
        setIsSearching(false);

        // Navigate to first match
        if (foundMatches.length > 0 && onNavigateToPage) {
          onNavigateToPage(foundMatches[0].pageIndex + 1);
        }
      }
    },
    [pdfDoc, extractPageText, onNavigateToPage]
  );

  // Debounce search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (!searchQuery.trim()) {
      setMatches([]);
      setCurrentMatchIndex(0);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimerRef.current = setTimeout(() => {
      void performSearch(searchQuery);
    }, 300);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, performSearch]);

  const goToNextMatch = useCallback(() => {
    if (matches.length === 0) return;
    const next = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(next);
    onNavigateToPage?.(matches[next].pageIndex + 1);
  }, [matches, currentMatchIndex, onNavigateToPage]);

  const goToPreviousMatch = useCallback(() => {
    if (matches.length === 0) return;
    const prev = (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(prev);
    onNavigateToPage?.(matches[prev].pageIndex + 1);
  }, [matches, currentMatchIndex, onNavigateToPage]);

  const openSearch = useCallback(() => setIsSearchOpen(true), []);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setMatches([]);
    setCurrentMatchIndex(0);
    if (searchAbortRef.current) {
      searchAbortRef.current.cancelled = true;
    }
  }, []);

  const currentMatchPage =
    matches.length > 0 && currentMatchIndex < matches.length
      ? matches[currentMatchIndex].pageIndex + 1
      : 0;

  return {
    isSearchOpen,
    searchQuery,
    matches,
    currentMatchIndex,
    isSearching,
    totalMatches: matches.length,
    openSearch,
    closeSearch,
    setSearchQuery,
    goToNextMatch,
    goToPreviousMatch,
    currentMatchPage,
  };
}
