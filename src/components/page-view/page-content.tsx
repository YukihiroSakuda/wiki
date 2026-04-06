"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PageContentProps {
  content: string;
  /** title → slug map for resolving [[wiki links]]. Falls back to titleToSlug when not provided. */
  pageMap?: Record<string, string>;
  /** If provided, internal /wiki/* links call this instead of navigating. Used for in-panel preview. */
  onWikiLinkClick?: (slug: string) => void;
}

// Fallback: derive a slug from a title (same logic as generateSlug in src/lib/slug.ts)
function titleToSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/[^\w\u3040-\u30FF\u4E00-\u9FFF\u3400-\u4DBF-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "page"
  );
}

function transformWikiLinks(content: string, pageMap?: Record<string, string>): string {
  return content.replace(/\[\[([^\]]+)\]\]/g, (_, title) => {
    const trimmed = title.trim();
    // Exact title lookup first, then fallback to derived slug
    const slug = pageMap?.[trimmed] ?? titleToSlug(trimmed);
    return `[${trimmed}](/wiki/${encodeURIComponent(slug)})`;
  });
}

export function PageContent({ content, pageMap, onWikiLinkClick }: PageContentProps) {
  const transformed = transformWikiLinks(content, pageMap);

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none font-mono",
        // Headings
        "prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-[var(--color-text-primary)]",
        "prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-md",
        "prose-h1:mb-3 prose-h1:mt-6 prose-h2:mb-2 prose-h2:mt-5 prose-h3:mb-2 prose-h3:mt-4",
        // Body text
        "prose-p:my-3 prose-p:leading-relaxed prose-p:text-[var(--color-text-primary)]",
        // Links
        "prose-a:text-[var(--color-accent)] prose-a:no-underline hover:prose-a:underline",
        // Code
        "prose-code:bg-[var(--color-bg-sidebar)] prose-code:text-[var(--color-text-primary)]",
        "prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-sm",
        "prose-code:before:content-none prose-code:after:content-none",
        // Pre/code blocks
        "prose-pre:rounded prose-pre:border prose-pre:border-[var(--color-border)] prose-pre:bg-[var(--color-bg-sidebar)]",
        "prose-pre:overflow-x-auto prose-pre:p-4",
        // Blockquote
        "prose-blockquote:border-l-2 prose-blockquote:border-[var(--color-accent)]",
        "prose-blockquote:my-4 prose-blockquote:pl-4 prose-blockquote:text-[var(--color-text-secondary)]",
        "prose-blockquote:not-italic",
        // Lists
        "prose-ol:text-[var(--color-text-primary)] prose-ul:text-[var(--color-text-primary)]",
        "prose-li:my-1",
        // Tables
        "prose-table:border prose-table:border-[var(--color-border)]",
        "prose-th:bg-[var(--color-bg-sidebar)] prose-th:font-medium prose-th:text-[var(--color-text-primary)]",
        "prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2",
        "prose-th:border prose-th:border-[var(--color-border)] prose-td:border prose-td:border-[var(--color-border)]",
        // HR
        "prose-hr:border-[var(--color-border)]",
        // Strong / em
        "prose-strong:font-bold prose-strong:text-[var(--color-text-primary)]"
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, rehypeHighlight]}
        components={{
          a: ({ href, children }) => {
            const isWikiLink = href?.startsWith("/wiki/");
            if (isWikiLink && onWikiLinkClick) {
              const slug = decodeURIComponent(href!.replace("/wiki/", ""));
              return (
                <button
                  type="button"
                  onClick={() => onWikiLinkClick(slug)}
                  className="cursor-pointer text-[var(--color-accent)] hover:underline"
                >
                  {children}
                </button>
              );
            }
            return (
              <Link href={href ?? "#"} className="text-[var(--color-accent)] hover:underline">
                {children}
              </Link>
            );
          },
        }}
      >
        {transformed}
      </ReactMarkdown>
    </div>
  );
}
