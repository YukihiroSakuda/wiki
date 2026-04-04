"use client";

import { cn } from "@/lib/utils";

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
  lineNo?: number;
}

interface DiffViewerProps {
  oldText: string;
  newText: string;
}

/**
 * Simple line-level diff viewer.
 * Uses a greedy LCS approach for small diffs.
 */
export function DiffViewer({ oldText, newText }: DiffViewerProps) {
  const lines = computeDiff(oldText, newText);

  if (lines.every((l) => l.type === "unchanged")) {
    return (
      <p className="text-sm text-[var(--color-text-muted)] font-mono py-4 text-center">
        No differences.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-[var(--color-border)] text-xs font-mono">
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((line, i) => (
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
          ))}
        </tbody>
      </table>
    </div>
  );
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  // Build LCS table
  const m = oldLines.length;
  const n = newLines.length;

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
