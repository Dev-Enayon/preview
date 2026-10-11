import type { MediaFit, MediaKind } from "../types";

interface VideoState {
  playing: boolean;
  muted: boolean;
  volume: number;
}

interface MediaToolbarProps {
  hasSelection: boolean;
  selectedKind: MediaKind | null;
  fit: MediaFit;
  onFit: (fit: MediaFit) => void;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onProject: () => void;
  onUpload: () => void;
  onOpenLibrary: () => void;
  onDelete: () => void;
  video: VideoState;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onToggleMute: () => void;
  onVolume: (volume: number) => void;
}

const btn =
  "rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-sky-500 disabled:cursor-not-allowed disabled:opacity-40";

export function MediaToolbar({
  hasSelection,
  selectedKind,
  fit,
  onFit,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onProject,
  onUpload,
  onOpenLibrary,
  onDelete,
  video,
  onPlay,
  onPause,
  onRestart,
  onToggleMute,
  onVolume,
}: MediaToolbarProps) {
  const isVideo = selectedKind === "video";
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
        Media controls
      </h2>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onUpload} className={btn}>
          Upload media
        </button>
        <button type="button" onClick={onOpenLibrary} className={btn}>
          Open library
        </button>
        <button
          type="button"
          onClick={onProject}
          disabled={!hasSelection}
          className="rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Project selected
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={!hasSelection}
          className="rounded-md border border-rose-500/60 px-3 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Delete media
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canPrev}
          className={btn}
        >
          ◀ Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className={btn}
        >
          Next ▶
        </button>

        {isVideo && (
          <div
            role="group"
            aria-label="Image fit"
            className="flex rounded-md border border-slate-700 p-0.5"
          >
            <button
              type="button"
              onClick={() => onFit("contain")}
              aria-pressed={fit === "contain"}
              className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                fit === "contain"
                  ? "bg-sky-600 text-white"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Contain
            </button>
            <button
              type="button"
              onClick={() => onFit("cover")}
              aria-pressed={fit === "cover"}
              className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                fit === "cover"
                  ? "bg-sky-600 text-white"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Cover
            </button>
          </div>
        )}
      </div>

      {isVideo && (
        <div className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            {video.playing ? (
              <button
                type="button"
                onClick={onPause}
                className="rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
              >
                Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={onPlay}
                className="rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
              >
                Play
              </button>
            )}
            <button type="button" onClick={onRestart} className={btn}>
              Restart
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              aria-pressed={video.muted}
              className={btn}
            >
              {video.muted ? "Unmute" : "Mute"}
            </button>
          </div>
          <label className="flex items-center gap-3 text-xs text-slate-400">
            <span className="w-14 shrink-0 uppercase tracking-wide">Volume</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={video.volume}
              onChange={(e) => onVolume(Number(e.target.value))}
              className="w-full accent-sky-500"
            />
            <span className="w-10 text-right tabular-nums">
              {Math.round(video.volume * 100)}%
            </span>
          </label>
          <p className="text-[11px] text-slate-500">
            Playback happens on the projection window; controls stay here. Some
            browsers require a click on the projection window before a video
            with sound can play.
          </p>
        </div>
      )}

      {!hasSelection && (
        <p className="text-sm text-slate-500">
          Select an item in the media library to project it.
        </p>
      )}
    </div>
  );
}
