"use client";

import { useState } from "react";
import { CommentForm } from "./comment-form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Reply, Pencil, Trash2, Check, X } from "lucide-react";

export interface CommentAuthor {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface CommentData {
  id: string;
  content: string;
  authorId: string;
  author: CommentAuthor;
  createdAt: string;
  updatedAt: string;
  replies?: CommentData[];
}

interface CommentItemProps {
  comment: CommentData;
  currentUserId?: string;
  onReply: (parentId: string, content: string) => Promise<void>;
  onEdit: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  isReply?: boolean;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function CommentItem({
  comment,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  isReply = false,
}: CommentItemProps) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const isOwner = currentUserId === comment.authorId;
  const isEdited = comment.createdAt !== comment.updatedAt;

  const handleSaveEdit = async () => {
    if (!editContent.trim() || saving) return;
    setSaving(true);
    try {
      await onEdit(comment.id, editContent.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await onDelete(comment.id);
  };

  return (
    <div className={cn("flex gap-3", isReply && "ml-8")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] font-mono text-[10px] font-bold text-[var(--color-text-muted)]",
          isReply ? "h-6 w-6" : "h-7 w-7"
        )}
      >
        {getInitials(comment.author.name)}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-[var(--color-text-primary)]">
            {comment.author.name}
          </span>
          <span className="font-mono text-[10px] text-[var(--color-text-dim)]">
            {formatDate(comment.createdAt)}
          </span>
          {isEdited && (
            <span className="font-mono text-[10px] text-[var(--color-text-dim)]">
              (edited)
            </span>
          )}
        </div>

        {/* Body */}
        {editing ? (
          <div className="mt-1 flex flex-col gap-1.5">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSaveEdit();
                }
                if (e.key === "Escape") setEditing(false);
              }}
              className="min-h-[56px]"
            />
            <div className="flex items-center gap-1.5">
              <Button
                variant="primary"
                size="xs"
                onClick={handleSaveEdit}
                loading={saving}
                disabled={!editContent.trim() || saving}
              >
                <Check size={10} />
                save
              </Button>
              <Button variant="ghost" size="xs" onClick={() => setEditing(false)}>
                <X size={10} />
                cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 whitespace-pre-wrap font-mono text-sm text-[var(--color-text-secondary)]">
            {comment.content}
          </p>
        )}

        {/* Actions */}
        {!editing && (
          <div className="mt-1 flex items-center gap-2">
            {!isReply && (
              <button
                type="button"
                onClick={() => setReplyOpen((v) => !v)}
                className="flex items-center gap-1 font-mono text-[10px] text-[var(--color-text-dim)] hover:text-[var(--color-accent)]"
              >
                <Reply size={10} />
                reply
              </button>
            )}
            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditContent(comment.content);
                    setEditing(true);
                  }}
                  className="flex items-center gap-1 font-mono text-[10px] text-[var(--color-text-dim)] hover:text-[var(--color-accent)]"
                >
                  <Pencil size={10} />
                  edit
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className={cn(
                    "flex items-center gap-1 font-mono text-[10px]",
                    confirmDelete
                      ? "text-[var(--color-danger)]"
                      : "text-[var(--color-text-dim)] hover:text-[var(--color-danger)]"
                  )}
                  onBlur={() => setConfirmDelete(false)}
                >
                  <Trash2 size={10} />
                  {confirmDelete ? "confirm?" : "delete"}
                </button>
              </>
            )}
          </div>
        )}

        {/* Reply form */}
        {replyOpen && (
          <div className="mt-2">
            <CommentForm
              onSubmit={async (content) => {
                await onReply(comment.id, content);
                setReplyOpen(false);
              }}
              placeholder="Write a reply..."
              autoFocus
              onCancel={() => setReplyOpen(false)}
            />
          </div>
        )}

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 flex flex-col gap-3">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                isReply
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
