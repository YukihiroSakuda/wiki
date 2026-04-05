"use client";

import { useEffect } from "react";

export function PageViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    fetch(`/api/pages/${slug}/view`, { method: "POST" }).catch(() => {});
  }, [slug]);
  return null;
}
