"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Paperclip, Loader } from "lucide-react";
import { toast } from "@/stores/toast-store";

interface FileUploadProps {
  onInsert: (markdown: string) => void;
}

const ACCEPTED = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
].join(",");

const STATUS_LABELS: Record<string, string> = {
  uploading: "uploading...",
  extracting: "extracting text...",
  converting: "converting...",
};

export function FileUpload({ onInsert }: FileUploadProps) {
  const [status, setStatus] = useState<keyof typeof STATUS_LABELS | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const process = async (file: File) => {
    setError(null);
    setStatus("uploading");

    const form = new FormData();
    form.append("file", file);

    try {
      setStatus("extracting");
      const res = await fetch("/api/extract-file", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        const msg = data.error ?? "Processing failed";
        setError(msg);
        toast.error(msg);
        return;
      }

      onInsert(`\n\n${data.markdown}\n\n`);
      toast.success(`Inserted ${file.name}`);
    } catch {
      setError("Processing failed");
      toast.error("File processing failed");
    } finally {
      setStatus(null);
    }
  };

  const handleFile = (file: File) => {
    if (file.size > 30 * 1024 * 1024) {
      setError("File size exceeds the 30MB limit");
      return;
    }
    process(file);
  };

  const isLoading = status !== null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isLoading}
        title="Attach file and convert to Markdown (PDF, Word, Excel, PPT, image)"
        className={cn(
          "flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs",
          "text-[var(--color-text-muted)] transition-colors duration-100",
          "hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]",
          "disabled:cursor-not-allowed disabled:opacity-40"
        )}
      >
        {isLoading ? <Loader size={12} className="animate-spin" /> : <Paperclip size={12} />}
        {isLoading ? STATUS_LABELS[status!] : "attach"}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {error && (
        <span className="border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 absolute left-0 top-full z-10 mt-1 whitespace-nowrap rounded border px-2 py-0.5 font-mono text-xs text-[var(--color-danger)]">
          {error}
        </span>
      )}
    </div>
  );
}
