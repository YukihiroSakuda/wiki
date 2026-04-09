"use client";

import { cn } from "@/lib/utils";
import type { DynamicToolUIPart } from "ai";
import { Search, FileText, List, Loader2, CheckCircle2 } from "lucide-react";
import { useState } from "react";

const TOOL_META: Record<string, { icon: typeof Search; label: string }> = {
  searchWiki: { icon: Search, label: "searchWiki" },
  fetchPage: { icon: FileText, label: "fetchPage" },
  listPages: { icon: List, label: "listPages" },
};

function summarizeResult(toolName: string, output: unknown): string {
  if (typeof output !== "string") return "done";
  if (output.startsWith("No results")) return "no results";
  if (output.startsWith("Page not found")) return "not found";
  if (toolName === "searchWiki") {
    const count = (output.match(/^\d+\./gm) ?? []).length;
    return `${count} result${count !== 1 ? "s" : ""}`;
  }
  if (toolName === "fetchPage") {
    const match = output.match(/^# (.+)/);
    return match ? `loaded "${match[1]}"` : "loaded";
  }
  if (toolName === "listPages") {
    const count = (output.match(/^- /gm) ?? []).length;
    return `${count} page${count !== 1 ? "s" : ""}`;
  }
  return "done";
}

function formatArgs(toolName: string, input: unknown): string {
  if (!input || typeof input !== "object") return "";
  const args = input as Record<string, unknown>;
  if (toolName === "searchWiki") {
    const mode = args.mode ?? "hybrid";
    return `"${args.query}" (${mode})`;
  }
  if (toolName === "fetchPage") return `slug:${args.slug}`;
  if (toolName === "listPages") return `limit:${args.limit ?? 20}`;
  return JSON.stringify(args);
}

export function ToolStep({ part }: { part: DynamicToolUIPart }) {
  const [expanded, setExpanded] = useState(false);
  const meta = TOOL_META[part.toolName] ?? { icon: Search, label: part.toolName };
  const Icon = meta.icon;
  const isComplete = part.state === "output-available";
  const input = "input" in part ? part.input : undefined;
  const output = "output" in part ? part.output : undefined;

  return (
    <div className="font-mono text-xs">
      <button
        type="button"
        onClick={() => isComplete && setExpanded(!expanded)}
        className={cn(
          "flex w-full items-center gap-1.5 rounded px-2 py-1",
          "bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]",
          isComplete && "cursor-pointer hover:bg-[var(--color-bg-hover)]"
        )}
      >
        <Icon size={11} className="shrink-0 text-[var(--color-accent)]" />
        <span className="text-[var(--color-accent)]">{meta.label}</span>
        <span className="truncate text-[var(--color-text-dim)]">
          {formatArgs(part.toolName, input)}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1">
          {isComplete ? (
            <>
              <CheckCircle2 size={10} className="text-[var(--color-success)]" />
              <span className="text-[var(--color-text-dim)]">
                {summarizeResult(part.toolName, output)}
              </span>
            </>
          ) : (
            <Loader2 size={10} className="animate-spin text-[var(--color-accent)]" />
          )}
        </span>
      </button>
      {expanded && isComplete && (
        <pre className="mt-1 max-h-40 overflow-auto rounded bg-[var(--color-bg-primary)] px-2 py-1.5 text-[10px] leading-relaxed text-[var(--color-text-dim)]">
          {typeof output === "string" ? output : JSON.stringify(output, null, 2)}
        </pre>
      )}
    </div>
  );
}
