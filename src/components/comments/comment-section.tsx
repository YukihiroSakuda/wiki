"use client";

import { useCallback, useEffect, useState } from "react";
import { CommentItem, type CommentData } from "./comment-item";
import { CommentForm } from "./comment-form";
import { MessageSquare } from "lucide-react";
import { toast } from "@/stores/toast-store";

interface CommentSectionProps {
  slug: string;
  currentUserId?: string;
}

export function CommentSection({ slug, currentUserId }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/pages/${slug}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handlePost = async (content: string) => {
    const res = await fetch(`/api/pages/${slug}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error("Failed to post comment");
    toast.success("Comment posted");
    await fetchComments();
  };

  const handleReply = async (parentId: string, content: string) => {
    const res = await fetch(`/api/pages/${slug}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, parentId }),
    });
    if (!res.ok) throw new Error("Failed to post reply");
    toast.success("Reply posted");
    await fetchComments();
  };

  const handleEdit = async (commentId: string, content: string) => {
    const res = await fetch(`/api/comments/${commentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error("Failed to edit comment");
    toast.success("Comment updated");
    await fetchComments();
  };

  const handleDelete = async (commentId: string) => {
    const res = await fetch(`/api/comments/${commentId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete comment");
    toast.warn("Comment deleted");
    await fetchComments();
  };

  const totalCount = comments.reduce(
    (acc, c) => acc + 1 + (c.replies?.length ?? 0),
    0
  );

  return (
    <section className="mt-8 border-t border-[var(--color-border)] pt-6">
      {/* Section header */}
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare size={14} className="text-[var(--color-text-muted)]" />
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
          Comments
        </span>
        {totalCount > 0 && (
          <span className="rounded border border-[var(--color-border)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-secondary)]">
            {totalCount}
          </span>
        )}
      </div>

      {/* New comment form */}
      <CommentForm onSubmit={handlePost} placeholder="Write a comment..." />

      {/* Comments list */}
      <div className="mt-4 flex flex-col gap-3">
        {loading && (
          <p className="py-4 text-center font-mono text-xs text-[var(--color-text-dim)]">
            Loading comments...
          </p>
        )}

        {!loading && comments.length === 0 && (
          <p className="py-4 text-center font-mono text-xs text-[var(--color-text-dim)]">
            No comments yet. Be the first to comment.
          </p>
        )}

        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            currentUserId={currentUserId}
            onReply={handleReply}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </section>
  );
}
