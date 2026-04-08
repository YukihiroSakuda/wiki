"use client";

import { useState } from "react";
import { ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast-store";

interface LikeButtonProps {
  slug: string;
  initialLiked: boolean;
  initialCount: number;
}

export function LikeButton({ slug, initialLiked, initialCount }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/pages/${slug}/like`, { method: "POST" });
      if (!res.ok) {
        toast.error("いいねに失敗しました");
        return;
      }
      const data = await res.json();
      setLiked(data.liked);
      setCount(data.count);
      if (data.liked) toast.success("いいねしました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={cn(
        "flex items-center gap-1 rounded px-2 py-0.5 text-sm transition-colors duration-150",
        liked
          ? "text-[var(--color-accent)]"
          : "text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
      )}
    >
      <ThumbsUp size={12} className={liked ? "fill-current" : ""} />
      {count}
    </button>
  );
}
