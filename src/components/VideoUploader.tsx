import { useCallback, useRef, useState } from "react";
import { Upload, Film, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  file: File | null;
  onFile: (f: File | null) => void;
  disabled?: boolean;
}

const ACCEPTED = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"];

export function VideoUploader({ file, onFile, disabled }: Props) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handle = useCallback(
    (f: File | null) => {
      setError(null);
      if (!f) {
        onFile(null);
        return;
      }
      if (!f.type.startsWith("video/") && !ACCEPTED.includes(f.type)) {
        setError("Please upload a video file (MP4, MOV, AVI, or WebM).");
        return;
      }
      if (f.size > 200 * 1024 * 1024) {
        setError("File too large. Maximum 200 MB.");
        return;
      }
      onFile(f);
    },
    [onFile],
  );

  if (file) {
    const url = URL.createObjectURL(file);
    return (
      <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-card backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow">
              <Film className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
          </div>
          {!disabled && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onFile(null)}
              aria-label="Remove video"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <video
          src={url}
          controls
          className="mt-4 max-h-72 w-full rounded-lg bg-black/40"
        />
      </div>
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled)
            inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (disabled) return;
          const f = e.dataTransfer.files?.[0];
          if (f) handle(f);
        }}
        className={`group relative cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-smooth ${
          drag
            ? "border-primary bg-primary/10 shadow-glow"
            : "border-border bg-card/40 hover:border-primary/60 hover:bg-card/60"
        } ${disabled ? "pointer-events-none opacity-50" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,video/*"
          className="hidden"
          onChange={(e) => handle(e.target.files?.[0] ?? null)}
        />
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
          <Upload className="h-7 w-7" />
        </div>
        <p className="text-base font-semibold">Drop your presentation video</p>
        <p className="mt-1 text-sm text-muted-foreground">
          MP4, MOV, AVI, WebM · up to 200 MB · 30s–3min recommended
        </p>
      </div>
      {error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
