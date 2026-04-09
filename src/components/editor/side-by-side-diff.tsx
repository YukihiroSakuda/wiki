"use client";

/**
 * Side-by-side diff with inline character-level highlighting.
 * Same visual style as the AI proofread dialog.
 * Supports a `compact` mode that collapses long unchanged runs.
 */

type CharOp = { type: "eq" | "ins" | "del"; text: string };
export type LinePair =
  | { kind: "unchanged"; text: string }
  | { kind: "changed"; removed: string; added: string; charDiff: CharOp[] }
  | { kind: "removed"; text: string }
  | { kind: "added"; text: string };

// ─── Myers-ish character-level diff (LCS) ────────────────────────────────────

function charDiff(a: string, b: string): CharOp[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const ops: CharOp[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.unshift({ type: "eq", text: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ type: "ins", text: b[j - 1] });
      j--;
    } else {
      ops.unshift({ type: "del", text: a[i - 1] });
      i--;
    }
  }
  return ops.reduce<CharOp[]>((acc, op) => {
    const last = acc[acc.length - 1];
    if (last && last.type === op.type) {
      last.text += op.text;
    } else {
      acc.push({ ...op });
    }
    return acc;
  }, []);
}

// ─── Line-level diff with inline char diff for changed pairs ─────────────────

export function computeLinePairs(oldText: string, newText: string): LinePair[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  // Cap for performance on large files
  const maxLines = 1000;
  const oLines = oldLines.slice(0, maxLines);
  const nLines = newLines.slice(0, maxLines);
  const m = oLines.length;
  const n = nLines.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        oLines[i - 1] === nLines[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  type RawOp = { type: "eq" | "del" | "ins"; text: string };
  const raw: RawOp[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oLines[i - 1] === nLines[j - 1]) {
      raw.unshift({ type: "eq", text: oLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      raw.unshift({ type: "ins", text: nLines[j - 1] });
      j--;
    } else {
      raw.unshift({ type: "del", text: oLines[i - 1] });
      i--;
    }
  }

  const pairs: LinePair[] = [];
  let k = 0;
  while (k < raw.length) {
    const cur = raw[k];
    if (cur.type === "del" && k + 1 < raw.length && raw[k + 1].type === "ins") {
      const removed = cur.text;
      const added = raw[k + 1].text;
      pairs.push({ kind: "changed", removed, added, charDiff: charDiff(removed, added) });
      k += 2;
    } else if (cur.type === "del") {
      pairs.push({ kind: "removed", text: cur.text });
      k++;
    } else if (cur.type === "ins") {
      pairs.push({ kind: "added", text: cur.text });
      k++;
    } else {
      pairs.push({ kind: "unchanged", text: cur.text });
      k++;
    }
  }
  return pairs;
}

export function countLinePairs(pairs: LinePair[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const p of pairs) {
    if (p.kind === "added") added++;
    else if (p.kind === "removed") removed++;
    else if (p.kind === "changed") {
      added++;
      removed++;
    }
  }
  return { added, removed };
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function InlineCharDiff({ ops }: { ops: CharOp[] }) {
  return (
    <>
      {ops.map((op, i) => {
        if (op.type === "eq") return <span key={i}>{op.text}</span>;
        if (op.type === "del")
          return (
            <span
              key={i}
              className="bg-[var(--color-danger)]/20 rounded text-[var(--color-danger)]"
            >
              {op.text}
            </span>
          );
        return (
          <span
            key={i}
            className="bg-[var(--color-success)]/20 rounded text-[var(--color-success)]"
          >
            {op.text}
          </span>
        );
      })}
    </>
  );
}

type Row = { kind: "pair"; pair: LinePair } | { kind: "gap"; hidden: number };

/** Collapse runs of unchanged lines, keeping `context` lines around changes. */
function collapsePairs(pairs: LinePair[], context: number): Row[] {
  const keep = new Array(pairs.length).fill(false);
  for (let i = 0; i < pairs.length; i++) {
    if (pairs[i].kind !== "unchanged") {
      for (let j = Math.max(0, i - context); j <= Math.min(pairs.length - 1, i + context); j++) {
        keep[j] = true;
      }
    }
  }
  const rows: Row[] = [];
  let hidden = 0;
  for (let i = 0; i < pairs.length; i++) {
    if (keep[i]) {
      if (hidden > 0) {
        rows.push({ kind: "gap", hidden });
        hidden = 0;
      }
      rows.push({ kind: "pair", pair: pairs[i] });
    } else {
      hidden++;
    }
  }
  if (hidden > 0) rows.push({ kind: "gap", hidden });
  return rows;
}

interface SideBySideDiffProps {
  pairs: LinePair[];
  /** Labels for the two columns. */
  leftLabel?: string;
  rightLabel?: string;
  /** When true, hide unchanged runs beyond ±context lines. */
  compact?: boolean;
  /** Message shown when there are no differences. */
  emptyMessage?: string;
}

export function SideBySideDiff({
  pairs,
  leftLabel = "before",
  rightLabel = "after",
  compact = false,
  emptyMessage = "no changes",
}: SideBySideDiffProps) {
  const allUnchanged = pairs.every((p) => p.kind === "unchanged");
  if (allUnchanged) {
    return (
      <p className="py-6 text-center font-mono text-sm text-[var(--color-text-muted)]">
        {emptyMessage}
      </p>
    );
  }

  const rows: Row[] = compact
    ? collapsePairs(pairs, 2)
    : pairs.map((pair) => ({ kind: "pair", pair }));

  return (
    <div className="overflow-x-auto rounded border border-[var(--color-border)] font-mono text-xs">
      {/* Column headers */}
      <div className="grid grid-cols-2 divide-x divide-[var(--color-border)] border-b border-[var(--color-border)] bg-[var(--color-bg-sidebar)]">
        <div className="px-3 py-1.5 font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
          {leftLabel}
        </div>
        <div className="px-3 py-1.5 font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
          {rightLabel}
        </div>
      </div>

      {rows.map((row, idx) => {
        if (row.kind === "gap") {
          return (
            <div
              key={idx}
              className="border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1 text-center text-[var(--color-text-muted)]"
            >
              ⋯ {row.hidden} lines hidden ⋯
            </div>
          );
        }
        const pair = row.pair;

        if (pair.kind === "unchanged") {
          return (
            <div
              key={idx}
              className="grid grid-cols-2 divide-x divide-[var(--color-border)] bg-[var(--color-bg-primary)]"
            >
              <div className="whitespace-pre-wrap break-all px-3 py-0.5 text-[var(--color-text-secondary)]">
                {pair.text || "\u00a0"}
              </div>
              <div className="whitespace-pre-wrap break-all px-3 py-0.5 text-[var(--color-text-secondary)]">
                {pair.text || "\u00a0"}
              </div>
            </div>
          );
        }

        if (pair.kind === "removed") {
          return (
            <div key={idx} className="grid grid-cols-2 divide-x divide-[var(--color-border)]">
              <div className="bg-[var(--color-danger)]/10 whitespace-pre-wrap break-all px-3 py-0.5 text-[var(--color-danger)]">
                {pair.text || "\u00a0"}
              </div>
              <div className="bg-[var(--color-bg-primary)] px-3 py-0.5">{"\u00a0"}</div>
            </div>
          );
        }

        if (pair.kind === "added") {
          return (
            <div key={idx} className="grid grid-cols-2 divide-x divide-[var(--color-border)]">
              <div className="bg-[var(--color-bg-primary)] px-3 py-0.5">{"\u00a0"}</div>
              <div className="bg-[var(--color-success)]/10 whitespace-pre-wrap break-all px-3 py-0.5 text-[var(--color-success)]">
                {pair.text || "\u00a0"}
              </div>
            </div>
          );
        }

        // changed — left shows del+eq, right shows ins+eq with inline highlights
        return (
          <div key={idx} className="grid grid-cols-2 divide-x divide-[var(--color-border)]">
            <div className="bg-[var(--color-danger)]/10 whitespace-pre-wrap break-all px-3 py-0.5 text-[var(--color-danger)]">
              <InlineCharDiff ops={pair.charDiff.filter((op) => op.type !== "ins")} />
            </div>
            <div className="bg-[var(--color-success)]/10 whitespace-pre-wrap break-all px-3 py-0.5 text-[var(--color-success)]">
              <InlineCharDiff ops={pair.charDiff.filter((op) => op.type !== "del")} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
