import React, { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";

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

  // Helper to parse inline formatting (bold, italic, inline code)
  const formatInline = (text: string): React.ReactNode => {
    // Split by code `...`
    const parts = text.split(/(`[^`]+`)/g);
    return parts.map((part, index) => {
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        return (
          <code
            key={index}
            className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-indigo-700 border border-slate-200"
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
      <div key={key} className="my-3 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
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
                <tr key={ri} className="hover:bg-slate-50/70">
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
        elements.push(
          <div key={blockId} className="my-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 text-slate-100 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-3.5 py-1.5 text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-indigo-400" />
                <span>{codeLanguage || "code"}</span>
              </div>
              <button
                onClick={() => void handleCopyCode(codeText, blockId)}
                className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-white transition"
              >
                {copiedCode === blockId ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="overflow-x-auto p-3.5 font-mono text-xs leading-relaxed text-slate-200">
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

    // Headings
    if (line.startsWith("### ")) {
      elements.push(
        <h4 key={i} className="mt-3.5 mb-1.5 text-sm font-bold text-slate-900 flex items-center gap-1.5">
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
        <div key={i} className="flex items-start gap-2 my-1 pl-1 text-xs text-slate-700">
          <span className="text-indigo-500 font-bold text-sm leading-4">•</span>
          <div className="flex-1 leading-relaxed">{formatInline(line.trim().slice(2))}</div>
        </div>
      );
      continue;
    }

    // Numbered points (e.g. "1. ", "2. ")
    const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      elements.push(
        <div key={i} className="flex items-start gap-2 my-1 pl-1 text-xs text-slate-700">
          <span className="font-bold text-indigo-600 text-xs shrink-0 w-4">{numMatch[1]}.</span>
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
      <p key={i} className="my-1 text-xs leading-relaxed text-slate-700">
        {formatInline(line)}
      </p>
    );
  }

  if (inTable) {
    flushTable(`table-end`);
  }

  return <div className="space-y-0.5 text-xs text-slate-800">{elements}</div>;
}
