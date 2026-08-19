import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, Mic, Download } from "lucide-react";

export type FileKind = "image" | "video" | "audio" | "pdf" | "doc" | "excel" | "file";

export function getFileKind(urlOrName: string, mimeType?: string): FileKind {
  if (mimeType) {
    if (mimeType.startsWith("image/"))  return "image";
    if (mimeType.startsWith("video/"))  return "video";
    if (mimeType.startsWith("audio/"))  return "audio";
    if (mimeType === "application/pdf") return "pdf";
  }

  const cleanPath = urlOrName.split("?")[0].split("#")[0];
  const ext = cleanPath.split(".").pop()?.toLowerCase() ?? "";

  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return "image";
  if (["mp4", "mov"].includes(ext))                        return "video";
  if (ext === "webm" && mimeType?.startsWith("audio/"))    return "audio";
  if (ext === "webm")                                       return "video";
  if (["mp3", "ogg", "wav", "m4a", "aac", "opus"].includes(ext)) return "audio";
  if (ext === "pdf")                                       return "pdf";
  if (["doc", "docx"].includes(ext))                      return "doc";
  if (["xls", "xlsx"].includes(ext))                      return "excel";

  const lower = urlOrName.toLowerCase();
  if (/[./]opus|[./]ogg|[./]m4a|[./]aac|[./]mp3|[./]wav|audio/.test(lower)) return "audio";
  if (/[./]mp4|[./]mov|[./]webm|video/.test(lower))                          return "video";
  if (/[./]jpg|[./]jpeg|[./]png|[./]webp|[./]gif|image/.test(lower))        return "image";

  return "file";
}

function fmtTime(s: number) {
  if (!s || isNaN(s)) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

const DOC_META: Record<string, { emoji: string; label: string }> = {
  pdf:   { emoji: "📄", label: "PDF" },
  doc:   { emoji: "📝", label: "Document" },
  excel: { emoji: "📊", label: "Spreadsheet" },
  file:  { emoji: "📎", label: "File" },
};

const BAR_COUNT = 32;
function getBars(src: string): number[] {
  const seed = src.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return Array.from({ length: BAR_COUNT }, (_, i) => {
    const x = Math.sin(seed + i * 127.1) * 43758.5453;
    return 0.15 + (x - Math.floor(x)) * 0.85;
  });
}

function VoicePlayer({ src, isMe }: { src: string; isMe: boolean }) {
  const ref        = useRef<HTMLAudioElement>(null);
  const [playing,  setPlaying]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [elapsed,  setElapsed]  = useState(0);
  const bars = getBars(src);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const play  = () => setPlaying(true);
    const pause = () => setPlaying(false);
    const end   = () => { setPlaying(false); setProgress(0); setElapsed(0); a.currentTime = 0; };
    const meta  = () => setDuration(a.duration);
    const tick  = () => { setElapsed(a.currentTime); setProgress(a.duration ? a.currentTime / a.duration : 0); };
    a.addEventListener("play",            play);
    a.addEventListener("pause",           pause);
    a.addEventListener("ended",           end);
    a.addEventListener("loadedmetadata",  meta);
    a.addEventListener("timeupdate",      tick);
    return () => {
      a.removeEventListener("play",           play);
      a.removeEventListener("pause",          pause);
      a.removeEventListener("ended",          end);
      a.removeEventListener("loadedmetadata", meta);
      a.removeEventListener("timeupdate",     tick);
    };
  }, []);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    playing ? ref.current?.pause() : ref.current?.play();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const a = ref.current;
    if (!a?.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - r.left) / r.width) * a.duration;
  };

  const lit = Math.round(progress * BAR_COUNT);

  return (
    <div
      className={`
        flex items-center gap-2 px-2.5 py-1.5 rounded-xl w-[200px]
        ${isMe ? "bg-black/20" : "bg-black/20"}
      `}
      onClick={e => e.stopPropagation()}
    >
      <audio ref={ref} src={src} preload="metadata" />

      {/* Play / Pause */}
      <button
        onClick={toggle}
        className="
          shrink-0 w-9 h-9 rounded-full
          flex items-center justify-center
          bg-white/20 hover:bg-white/30
          active:scale-90 transition-all duration-150
        "
      >
        {playing
          ? <Pause size={15} fill="white" className="text-white" />
          : <Play  size={15} fill="white" className="text-white" style={{ marginLeft: 1 }} />
        }
      </button>

      {/* Waveform + time */}
      <div className="flex flex-col gap-[3px] flex-1 min-w-0">
        <div
          className="flex items-center gap-[2px] h-5 cursor-pointer select-none"
          onClick={seek}
        >
          {bars.map((h, i) => (
            <div
              key={i}
              className={`
                rounded-full flex-1 transition-all duration-75
                ${i < lit
                  ? "bg-white"
                  : "bg-white/25"
                }
              `}
              style={{ height: `${h * 100}%` }}
            />
          ))}
        </div>
        <span className="text-[10px] text-white/50 tabular-nums leading-none">
          {playing || elapsed > 0 ? fmtTime(elapsed) : fmtTime(duration)}
        </span>
      </div>

      <Mic size={12} className="shrink-0 text-white/30" />
    </div>
  );
}

interface FilePreviewProps {
  file?: string;
    attachment?: File;
    mimeType?: string;
  isMe: boolean;
}

export default function FilePreview({ file, attachment, mimeType, isMe }: FilePreviewProps) {
  const name = file ?? attachment?.name ?? "";
  const kind = getFileKind(name, mimeType);

  const url: string | null = (() => {
    if (file) return file;
    if (attachment && typeof attachment === "object" && "size" in attachment && typeof (attachment as any).arrayBuffer === "function") return URL.createObjectURL(attachment as File);
    return null;
  })();

  if (!url) return null;

  /* ── IMAGE ── */
  if (kind === "image") {
    return (
      <div
        className="mt-1 overflow-hidden rounded-xl cursor-pointer"
        onClick={() => window.open(url, "_blank")}
      >
        <img
          src={url}
          alt="attachment"
          className="max-w-[200px] max-h-[260px] object-cover rounded-xl"
          loading="lazy"
        />
      </div>
    );
  }

  /* ── VIDEO ── */
  if (kind === "video") {
    return (
      <div className="mt-1 rounded-xl overflow-hidden bg-black/40 max-w-[200px]">
        <video
          src={url}
          controls
          preload="metadata"
          playsInline
          className="w-full max-h-[280px] object-contain rounded-xl"
          onClick={e => e.stopPropagation()}
        />
      </div>
    );
  }

  /* ── AUDIO / VOICE ── */
  if (kind === "audio") {
    return (
      <div className="mt-1">
        <VoicePlayer src={url} isMe={isMe} />
      </div>
    );
  }

  /* ── DOCUMENT ── */
  const meta = DOC_META[kind] ?? DOC_META.file;
  return (
    <div
      onClick={() => file && window.open(file, "_blank")}
      className="
        mt-1 flex items-center gap-2 px-2.5 py-1.5 rounded-xl
        bg-black/20 hover:bg-black/30
        cursor-pointer transition-colors duration-150
        max-w-[200px]
      "
    >
      <span className="text-2xl shrink-0">{meta.emoji}</span>
      <div className="flex flex-col min-w-0">
        <span className="text-xs text-white truncate max-w-[130px]">
          {name.split("/").pop()}
        </span>
        <span className="text-[10px] text-white/40">{meta.label} · Tap to open</span>
      </div>
      <Download size={14} className="shrink-0 text-white/30 ml-auto" />
    </div>
  );
}