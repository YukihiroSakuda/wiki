"use client";

import { cn } from "@/lib/utils";

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
  lineNo?: number;
}

type RenderLine = DiffLine | { type: "gap"; hidden: number; content?: undefined };

interface DiffViewerProps {
  oldText: string;
  newText: string;
  /** If true, only show changed lines ±context, collapsing unchanged regions. */
  compact?: boolean;
}

/**
 * Simple line-level diff viewer.
 * Uses a greedy LCS approach for small diffs.
 */
export function DiffViewer({ oldText, newText, compact = false }: DiffViewerProps) {
  const rawLines = computeDiff(oldText, newText);

  if (rawLines.every((l) => l.type === "unchanged")) {
    return (
      <p className="text-sm text-[var(--color-text-muted)] font-mono py-4 text-center">
        変更はありません。
      </p>
    );
  }

  const lines: RenderLine[] = compact ? collapseUnchanged(rawLines, 2) : rawLines;

  return (
    <div className="overflow-x-auto rounded border border-[var(--color-border)] text-xs font-mono">
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((line, i) => {
            if (line.type === "gap") {
              return (
                <tr key={i} className="bg-[var(--color-bg-secondary)]">
                  <td
                    colSpan={2}
                    className="select-none px-3 py-1 text-center text-[var(--color-text-muted)]"
                  >
                    ⋯ {line.hidden} 行省略 ⋯
                  </td>
                </tr>
              );
            }
            return (
              <tr
                key={i}
                className={cn(
                  line.type === "added" && "bg-green-50 dark:bg-green-900/20",
                  line.type === "removed" && "bg-red-50 dark:bg-red-900/20",
                  line.type === "unchanged" && "bg-[var(--color-bg-primary)]"
                )}
              >
                <td
                  className={cn(
                    "select-none w-8 px-2 py-0.5 text-right border-r border-[var(--color-border)] text-[var(--color-text-muted)]",
                    line.type === "added" && "text-green-600 dark:text-green-400",
                    line.type === "removed" && "text-red-600 dark:text-red-400"
                  )}
                >
                  {line.type === "added" ? "+" : line.type === "removed" ? "−" : " "}
                </td>
                <td
                  className={cn(
                    "px-3 py-0.5 whitespace-pre-wrap break-all",
                    line.type === "added" && "text-green-700 dark:text-green-300",
                    line.type === "removed" && "text-red-700 dark:text-red-300 line-through opacity-75",
                    line.type === "unchanged" && "text-[var(--color-text-secondary)]"
                  )}
                >
                  {line.content || " "}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Collapse runs of unchanged lines, keeping `context` lines adjacent to changes. */
function collapseUnchanged(lines: DiffLine[], context: number): RenderLine[] {
  const keep = new Array(lines.length).fill(false);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].type !== "unchanged") {
      for (let j = Math.max(0, i - context); j <= Math.min(lines.length - 1, i + context); j++) {
        keep[j] = true;
      }
    }
  }
  const result: RenderLine[] = [];
  let hidden = 0;
  for (let i = 0; i < lines.length; i++) {
    if (keep[i]) {
      if (hidden > 0) {
        result.push({ type: "gap", hidden });
        hidden = 0;
      }
      result.push(lines[i]);
    } else {
      hidden++;
    }
  }
  if (hidden > 0) result.push({ type: "gap", hidden });
  return result;
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  // For large files, limit to first 500 lines each for performance
  const maxLines = 500;
  const oLines = oldLines.slice(0, maxLines);
  const nLines = newLines.slice(0, maxLines);

  const dp: number[][] = Array.from({ length: oLines.length + 1 }, () =>
    new Array(nLines.length + 1).fill(0)
  );

  for (let i = 1; i <= oLines.length; i++) {
    for (let j = 1; j <= nLines.length; j++) {
      if (oLines[i - 1] === nLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack
  const result: DiffLine[] = [];
  let i = oLines.length;
  let j = nLines.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oLines[i - 1] === nLines[j - 1]) {
      result.unshift({ type: "unchanged", content: oLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "added", content: nLines[j - 1] });
      j--;
    } else {
      result.unshift({ type: "removed", content: oLines[i - 1] });
      i--;
    }
  }

  return result;
}

/** Count added/removed lines between two texts (for badges, etc.) */
export function countDiff(oldText: string, newText: string): { added: number; removed: number } {
  const lines = computeDiff(oldText, newText);
  let added = 0;
  let removed = 0;
  for (const l of lines) {
    if (l.type === "added") added++;
    else if (l.type === "removed") removed++;
  }
  return { added, removed };
}
