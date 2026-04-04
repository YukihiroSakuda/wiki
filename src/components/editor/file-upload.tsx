"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Paperclip, Loader } from "lucide-react";

interface FileUploadProps {
  onInsert: (markdown: string) => void;
}

export function FileUpload({ onInsert }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }

      // Insert markdown image syntax
      const alt = file.name.replace(/\.[^.]+$/, "");
      onInsert(`![${alt}](${data.url})`);
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large (max 10MB)");
      return;
    }
    upload(file);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="Upload image"
        className={cn(
          "flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs",
          "text-[var(--color-text-muted)] transition-colors duration-100",
          "hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]",
          "disabled:opacity-40 disabled:cursor-not-allowed"
        )}
      >
        {uploading ? (
          <Loader size={12} className="animate-spin" />
        ) : (
          <Paperclip size={12} />
        )}
        {uploading ? "Uploading..." : "Image"}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {error && (
        <span className="absolute left-0 top-full mt-1 whitespace-nowrap rounded border border-red-300 bg-red-50 px-2 py-0.5 font-mono text-xs text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </span>
      )}
    </div>
  );
}
