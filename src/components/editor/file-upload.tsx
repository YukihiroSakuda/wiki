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
  uploading: "アップロード中...",
  extracting: "テキスト抽出中...",
  converting: "Markdown変換中...",
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
        const msg = data.error ?? "処理に失敗しました";
        setError(msg);
        toast.error(msg);
        return;
      }

      onInsert(`\n\n${data.markdown}\n\n`);
      toast.success(`${file.name} を挿入しました`);
    } catch {
      setError("処理に失敗しました");
      toast.error("ファイル処理に失敗しました");
    } finally {
      setStatus(null);
    }
  };

  const handleFile = (file: File) => {
    if (file.size > 30 * 1024 * 1024) {
      setError("ファイルサイズが上限(30MB)を超えています");
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
        title="ファイルを添付してMarkdownに変換 (PDF, Word, Excel, PPT, 画像)"
        className={cn(
          "flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs",
          "text-[var(--color-text-muted)] transition-colors duration-100",
          "hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]",
          "disabled:cursor-not-allowed disabled:opacity-40"
        )}
      >
        {isLoading ? <Loader size={12} className="animate-spin" /> : <Paperclip size={12} />}
        {isLoading ? STATUS_LABELS[status!] : "添付"}
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
        <span className="absolute left-0 top-full z-10 mt-1 whitespace-nowrap rounded border border-red-300 bg-red-50 px-2 py-0.5 font-mono text-xs text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </span>
      )}
    </div>
  );
}
