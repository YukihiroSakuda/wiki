"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  placeholder?: string;
  autoFocus?: boolean;
  onCancel?: () => void;
}

export function CommentForm({
  onSubmit,
  placeholder = "Write a comment...",
  autoFocus,
  onCancel,
}: CommentFormProps) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape" && onCancel) {
      onCancel();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={3}
        autoFocus={autoFocus}
        onKeyDown={handleKeyDown}
        className="min-h-[72px]"
      />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-[var(--color-text-dim)]">
          Ctrl+Enter to submit
        </span>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="ghost" size="xs" onClick={onCancel}>
              cancel
            </Button>
          )}
          <Button
            variant="primary"
            size="xs"
            onClick={handleSubmit}
            loading={submitting}
            disabled={!content.trim() || submitting}
          >
            <Send size={10} />
            post
          </Button>
        </div>
      </div>
    </div>
  );
}
