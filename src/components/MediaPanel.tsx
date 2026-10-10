import { useRef, useState } from "react";
import type { MediaItem } from "../types";
import type { MediaApi } from "../hooks/useMedia";
import {
  formatBytes,
  formatDuration,
  mediaKindLabel,
  MEDIA_ACCEPT_ATTR,
} from "../lib/media";

interface MediaPanelProps {
  media: MediaApi;
  selectedId: string | null;
  isProjectingSelected: boolean;
  onSelect: (id: string) => void;
  onProject: (id: string) => void;
  onDelete: (item: MediaItem) => void;
}

export function MediaPanel({
  media,
  selectedId,
  isProjectingSelected,
  onSelect,
  onProject,
  onDelete,
}: MediaPanelProps) {
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  const handleFiles = (files: FileList | null) => {
    if (files && files.length > 0) void media.upload(files);
  };

  return (
    <div className="flex min-h-0 flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          Media library
        </h2>
        <p className="text-xs text-slate-500">
          Images and video uploaded from this computer. Stored in this browser
          only — not on any server, and not shared with other devices.
        </p>
      </div>

      <div
        id="media-library-dropzone"
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepth.current += 1;
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          dragDepth.current -= 1;
          if (dragDepth.current <= 0) {
            dragDepth.current = 0;
            setDragging(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          handleFiles(e.dataTransfer?.files ?? null);
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-5 text-center transition ${
          dragging
            ? "border-sky-500 bg-sky-500/10"
            : "border-slate-700 bg-slate-950/40"
        }`}
      >
        <p className="text-sm text-slate-300">
          Drag &amp; drop images or video here
        </p>
        <p className="text-[11px] text-slate-500">
          JPG, PNG, WebP, GIF · MP4, WebM — multiple files supported
        </p>
        <label className="mt-1 cursor-pointer rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-500">
          {media.uploading ? "Uploading…" : "Browse files"}
          <input
            type="file"
            multiple
            accept={MEDIA_ACCEPT_ATTR}
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {media.error && (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {media.error}
        </p>
      )}
      {!media.error && media.notice && (
        <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {media.notice}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {media.loading && <p className="text-sm text-slate-500">Loading…</p>}
        {!media.loading && media.items.length === 0 && (
          <p className="text-sm text-slate-500">
            No media yet. Upload images or video to get started.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {media.items.map((item) => {
            const selected = item.id === selectedId;
            return (
              <div
                key={item.id}
                className={`flex flex-col overflow-hidden rounded-lg border transition ${
                  selected
                    ? "border-sky-500 bg-sky-500/10"
                    : "border-slate-800 bg-slate-950/50 hover:border-slate-600"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className="relative aspect-video w-full overflow-hidden bg-black"
                  title={`Select ${item.name}`}
                >
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                      {mediaKindLabel(item.kind)}
                    </span>
                  )}
                  <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-200">
                    {mediaKindLabel(item.kind)}
                  </span>
                  {item.kind === "video" && item.duration ? (
                    <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-slate-200">
                      {formatDuration(item.duration)}
                    </span>
                  ) : null}
                </button>
                <div className="flex flex-col gap-1 p-2">
                  <p
                    className="truncate text-xs font-medium text-slate-100"
                    title={item.name}
                  >
                    {item.name}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {formatBytes(item.size)}
                  </p>
                  <div className="mt-1 flex gap-1">
                    <button
                      type="button"
                      onClick={() => onProject(item.id)}
                      className="flex-1 rounded border border-sky-600/60 px-2 py-1 text-[11px] font-medium text-sky-300 transition hover:bg-sky-500/10"
                    >
                      {isProjectingSelected && selected ? "Projecting" : "Project"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item)}
                      className="rounded border border-rose-500/50 px-2 py-1 text-[11px] font-medium text-rose-300 transition hover:bg-rose-500/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
