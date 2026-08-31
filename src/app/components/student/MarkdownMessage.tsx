import React, { useState } from "react";
import {
  AlertTriangle,
  Award,
  Check,
  Copy,
  FileCode2,
  Lightbulb,
  Sparkles,
  Terminal,
} from "lucide-react";

interface MarkdownMessageProps {
  content: string;
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code).catch(() => undefined);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Helper to parse inline formatting (bold, italic, inline code, arrows)
  const formatInline = (text: string): React.ReactNode => {
    // Replace arrow notations for clarity
    const cleaned = text.replace(/->/g, " → ").replace(/<-/g, " ← ");

    // Split by inline code `...`
    const parts = cleaned.split(/(`[^`]+`)/g);
    return parts.map((part, index) => {
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        return (
          <code
            key={index}
            className="rounded-md bg-indigo-50/80 px-1.5 py-0.5 font-mono text-[11px] font-bold text-indigo-800 border border-indigo-100"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      // Handle **bold**
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((bPart, bIndex) => {
        if (bPart.startsWith("**") && bPart.endsWith("**") && bPart.length > 4) {
          return (
            <strong key={`${index}-${bIndex}`} className="font-bold text-slate-900">
              {bPart.slice(2, -2)}
            </strong>
          );
        }
        return bPart;
      });
    });
  };

  // Parse lines and blocks
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLanguage = "";
  let tableBuffer: string[] = [];
  let inTable = false;

  const flushTable = (key: string) => {
    if (tableBuffer.length === 0) return;
    const headerRow = tableBuffer[0];
    const dataRows = tableBuffer.slice(1).filter((r) => !r.includes("---"));

    const parseRow = (row: string) =>
      row
        .split("|")
        .map((cell) => cell.trim())
        .filter((cell, idx, arr) => idx > 0 && idx < arr.length);

    const headers = parseRow(headerRow);

    elements.push(
      <div key={key} className="my-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-800 font-bold">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-3.5 py-2.5">
                  {formatInline(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            {dataRows.map((r, ri) => {
              const cells = parseRow(r);
              return (
                <tr key={ri} className="hover:bg-indigo-50/30 transition">
                  {cells.map((c, ci) => (
                    <td key={ci} className="px-3.5 py-2">
                      {formatInline(c)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
    tableBuffer = [];
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        // Flush code block
        const codeText = codeBuffer.join("\n");
        const blockId = `code-${i}`;
        const isDiagram =
          ["ascii", "diagram", "flowchart", "text"].includes(codeLanguage.toLowerCase()) ||
          codeText.includes("+---") ||
          codeText.includes("┌───") ||
          codeText.includes("[ ");

        elements.push(
          <div
            key={blockId}
            className={`my-3.5 overflow-hidden rounded-2xl border shadow-sm ${
              isDiagram
                ? "border-indigo-200 bg-slate-900 text-indigo-300"
                : "border-slate-800 bg-slate-950 text-slate-100"
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950 px-4 py-2 text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-2">
                {isDiagram ? (
                  <FileCode2 className="h-3.5 w-3.5 text-amber-400" />
                ) : (
                  <Terminal className="h-3.5 w-3.5 text-indigo-400" />
                )}
                <span className="font-semibold uppercase tracking-wider text-[10px]">
                  {codeLanguage || (isDiagram ? "diagram" : "code")}
                </span>
              </div>
              <button
                onClick={() => void handleCopyCode(codeText, blockId)}
                className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-white transition"
              >
                {copiedCode === blockId ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-slate-200">
              <code>{codeText}</code>
            </pre>
          </div>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        if (inTable) flushTable(`table-${i}`);
        inCodeBlock = true;
        codeLanguage = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Table detection
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      inTable = true;
      tableBuffer.push(line.trim());
      continue;
    } else if (inTable) {
      flushTable(`table-${i}`);
    }

    // Special Academic Callout Headers
    const lowerLine = line.toLowerCase();

    // 1. Exam Point / Tips Callout
    if (
      lowerLine.includes("exam point") ||
      lowerLine.includes("exam tip") ||
      lowerLine.includes("5-mark") ||
      lowerLine.includes("10-mark")
    ) {
      elements.push(
        <div
          key={i}
          className="mt-3.5 mb-2 flex items-center gap-2 rounded-xl bg-purple-50 border border-purple-200 px-3.5 py-2 text-xs font-bold text-purple-900 shadow-2xs"
        >
          <Award className="h-4 w-4 text-purple-600 shrink-0" />
          <span>{formatInline(line.replace(/^[#*\s-]+/, ""))}</span>
        </div>
      );
      continue;
    }

    // 2. Real-World Analogy Callout
    if (lowerLine.includes("real-world analogy") || lowerLine.includes("analogy:")) {
      elements.push(
        <div
          key={i}
          className="mt-3.5 mb-2 flex items-center gap-2 rounded-xl bg-amber-50/80 border border-amber-200 px-3.5 py-2 text-xs font-bold text-amber-900 shadow-2xs"
        >
          <Lightbulb className="h-4 w-4 text-amber-600 shrink-0" />
          <span>{formatInline(line.replace(/^[#*\s-]+/, ""))}</span>
        </div>
      );
      continue;
    }

    // 3. Quick Revision / Summary Callout
    if (lowerLine.includes("one-line revision") || lowerLine.includes("quick revision")) {
      elements.push(
        <div
          key={i}
          className="mt-3.5 mb-2 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-bold text-emerald-900 shadow-2xs"
        >
          <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{formatInline(line.replace(/^[#*\s-]+/, ""))}</span>
        </div>
      );
      continue;
    }

    // 4. Warning / Mistakes Callout
    if (lowerLine.includes("common mistake") || lowerLine.includes("warning:")) {
      elements.push(
        <div
          key={i}
          className="mt-3.5 mb-2 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2 text-xs font-bold text-rose-900 shadow-2xs"
        >
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{formatInline(line.replace(/^[#*\s-]+/, ""))}</span>
        </div>
      );
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      elements.push(
        <h4 key={i} className="mt-4 mb-1.5 text-sm font-bold text-slate-900 flex items-center gap-1.5">
          {formatInline(line.slice(4))}
        </h4>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h3 key={i} className="mt-4 mb-2 text-base font-black text-slate-900 border-b border-slate-100 pb-1">
          {formatInline(line.slice(3))}
        </h3>
      );
      continue;
    }
    if (line.startsWith("# ")) {
      elements.push(
        <h2 key={i} className="mt-5 mb-2.5 text-lg font-black text-slate-900">
          {formatInline(line.slice(2))}
        </h2>
      );
      continue;
    }

    // Bullet points
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      elements.push(
        <div key={i} className="flex items-start gap-2.5 my-1 pl-1 text-xs text-slate-700">
          <span className="text-indigo-600 font-bold text-sm leading-4 shrink-0">•</span>
          <div className="flex-1 leading-relaxed">{formatInline(line.trim().slice(2))}</div>
        </div>
      );
      continue;
    }

    // Numbered points (e.g. "1. ", "2. ")
    const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      elements.push(
        <div key={i} className="flex items-start gap-2.5 my-1.5 pl-1 text-xs text-slate-700">
          <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-md px-1.5 py-0.5 text-[10px] shrink-0">
            {numMatch[1]}
          </span>
          <div className="flex-1 leading-relaxed">{formatInline(numMatch[2])}</div>
        </div>
      );
      continue;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    // Standard paragraph
    elements.push(
      <p key={i} className="my-1.5 text-xs sm:text-[13px] leading-relaxed text-slate-700">
        {formatInline(line)}
      </p>
    );
  }

  if (inTable) {
    flushTable(`table-end`);
  }

  return <div className="space-y-0.5 text-xs sm:text-[13px] text-slate-800 leading-relaxed">{elements}</div>;
}
