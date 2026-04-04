"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PageContentProps {
  content: string;
}

// Custom renderer for [[wiki links]]
function transformWikiLinks(content: string): string {
  return content.replace(/\[\[([^\]]+)\]\]/g, (_, title) => {
    const slug = title.trim().toLowerCase().replace(/\s+/g, "-");
    return `[${title}](/wiki/${encodeURIComponent(slug)})`;
  });
}

export function PageContent({ content }: PageContentProps) {
  const transformed = transformWikiLinks(content);

  return (
    <div className={cn(
      "prose prose-sm max-w-none font-mono",
      // Headings
      "prose-headings:font-bold prose-headings:text-[var(--color-text-primary)] prose-headings:tracking-tight",
      "prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-md",
      "prose-h1:mt-6 prose-h1:mb-3 prose-h2:mt-5 prose-h2:mb-2 prose-h3:mt-4 prose-h3:mb-2",
      // Body text
      "prose-p:text-[var(--color-text-primary)] prose-p:leading-relaxed prose-p:my-3",
      // Links
      "prose-a:text-[var(--color-accent)] prose-a:no-underline hover:prose-a:underline",
      // Code
      "prose-code:text-[var(--color-text-primary)] prose-code:bg-[var(--color-bg-sidebar)]",
      "prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono",
      "prose-code:before:content-none prose-code:after:content-none",
      // Pre/code blocks
      "prose-pre:bg-[var(--color-bg-sidebar)] prose-pre:border prose-pre:border-[var(--color-border)] prose-pre:rounded",
      "prose-pre:p-4 prose-pre:overflow-x-auto",
      // Blockquote
      "prose-blockquote:border-l-2 prose-blockquote:border-[var(--color-accent)]",
      "prose-blockquote:text-[var(--color-text-secondary)] prose-blockquote:pl-4 prose-blockquote:my-4",
      "prose-blockquote:not-italic",
      // Lists
      "prose-ul:text-[var(--color-text-primary)] prose-ol:text-[var(--color-text-primary)]",
      "prose-li:my-1",
      // Tables
      "prose-table:border prose-table:border-[var(--color-border)]",
      "prose-th:bg-[var(--color-bg-sidebar)] prose-th:text-[var(--color-text-primary)] prose-th:font-medium",
      "prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2",
      "prose-td:border prose-td:border-[var(--color-border)] prose-th:border prose-th:border-[var(--color-border)]",
      // HR
      "prose-hr:border-[var(--color-border)]",
      // Strong / em
      "prose-strong:text-[var(--color-text-primary)] prose-strong:font-bold",
    )}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, rehypeHighlight]}
        components={{
          a: ({ href, children }) => (
            <Link href={href ?? "#"} className="text-[var(--color-accent)] hover:underline">
              {children}
            </Link>
          ),
        }}
      >
        {transformed}
      </ReactMarkdown>
    </div>
  );
}
