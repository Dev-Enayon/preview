import { useEffect, useRef, useState } from "react";
import type { BackgroundConfig, ProjectionSettings } from "../types";
import type { MediaApi } from "../hooks/useMedia";
import {
  BACKGROUND_COLOR_PRESETS,
  describeBackground,
  isValidHexColor,
  MAX_BACKGROUND_DIM,
  normalizeHexColor,
  TEXT_COLOR_PRESETS,
} from "../lib/background";
import { ACCEPTED_IMAGE_MIME } from "../lib/media";

interface BackgroundPanelProps {
  settings: ProjectionSettings;
  onChange: (patch: Partial<ProjectionSettings>) => void;
  /** Restore the original default background and default text styling. */
  onReset: () => void;
  /** Surface a short confirmation in the operator status bar. */
  onNotify?: (message: string) => void;
  media: MediaApi;
}

const IMAGE_ACCEPT_ATTR = ACCEPTED_IMAGE_MIME.join(",");

const inputClass =
  "rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500";

const segBase =
  "rounded px-3 py-1.5 text-sm font-medium transition";
const segOn = "bg-sky-600 text-white";
const segOff = "text-slate-300 hover:text-white";

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
      {children}
    </span>
  );
}

export function BackgroundPanel({
  settings,
  onChange,
  onReset,
  onNotify,
  media,
}: BackgroundPanelProps) {
  const bg = settings.background;
  const [open, setOpen] = useState(true);
  const [hexText, setHexText] = useState(bg.color);
  const [hexError, setHexError] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Keep the HEX field in step when the color changes from a preset/picker.
  useEffect(() => {
    setHexText(bg.color);
    setHexError(null);
  }, [bg.color]);

  const setBg = (patch: Partial<BackgroundConfig>) =>
    onChange({ background: { ...bg, ...patch } });

  const chooseType = (type: BackgroundConfig["type"]) => {
    if (type === "image") {
      setBg({ type });
      setShowGallery(true);
      return;
    }
    setBg({ type });
  };

  const commitHex = (raw: string) => {
    setHexText(raw);
    if (isValidHexColor(raw)) {
      setHexError(null);
      setBg({ color: normalizeHexColor(raw) ?? bg.color });
    } else {
      setHexError("Enter a valid HEX color, e.g. #0A2540.");
    }
  };

  const images = media.items.filter((item) => item.kind === "image");
  const selectedImage = images.find((item) => item.id === bg.mediaId) ?? null;
  const missingImage =
    bg.type === "image" &&
    !!bg.mediaId &&
    !media.loading &&
    !images.some((item) => item.id === bg.mediaId);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const result = await media.upload(files);
    const added = result.added.find((item) => item.kind === "image");
    if (added) setBg({ type: "image", mediaId: added.id });
  };

  const summary = describeBackground(
    bg,
    selectedImage?.name ?? (missingImage ? "missing" : null),
  );

  const apply = () => {
    setOpen(false);
    onNotify?.("Background applied to the projection.");
  };

  const reset = () => {
    onReset();
    setShowGallery(false);
    onNotify?.("Background reset to the default.");
  };

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          Background
        </h2>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 transition hover:border-sky-500"
          >
            Open settings
          </button>
        )}
      </div>

      {!open && (
        <p className="truncate text-xs text-slate-500" title={summary}>
          {summary}
        </p>
      )}

      {open && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <GroupLabel>Background type</GroupLabel>
            <div
              role="group"
              aria-label="Background type"
              className="flex flex-wrap rounded-md border border-slate-700 p-0.5"
            >
              {(
                [
                  ["default", "Default"],
                  ["color", "Solid Color"],
                  ["image", "Image"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={bg.type === value}
                  onClick={() => chooseType(value)}
                  className={`${segBase} ${bg.type === value ? segOn : segOff}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {(bg.type === "color" || bg.type === "image") && (
            <div className="flex flex-col gap-2">
              <GroupLabel>Solid color</GroupLabel>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Background color"
                  value={normalizeHexColor(bg.color) ?? "#000000"}
                  onChange={(e) => setBg({ color: e.target.value })}
                  className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-slate-700 bg-slate-900"
                />
                <input
                  type="text"
                  aria-label="Background color HEX"
                  value={hexText}
                  spellCheck={false}
                  onChange={(e) => commitHex(e.target.value)}
                  onBlur={() => {
                    if (!isValidHexColor(hexText)) {
                      setHexText(bg.color);
                      setHexError(null);
                    }
                  }}
                  className={`${inputClass} min-w-0 flex-1`}
                  placeholder="#000000"
                />
                <span
                  aria-label="Selected background color"
                  className="h-9 w-9 shrink-0 rounded-md border border-slate-700"
                  style={{ backgroundColor: normalizeHexColor(bg.color) ?? "#000000" }}
                />
              </div>
              {hexError && (
                <p className="text-xs text-rose-300">{hexError}</p>
              )}
              <div className="grid grid-cols-4 gap-2">
                {BACKGROUND_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    title={preset.label}
                    aria-label={`Background color ${preset.label}`}
                    aria-pressed={
                      normalizeHexColor(bg.color) === preset.value &&
                      bg.type !== "default"
                    }
                    onClick={() =>
                      setBg({
                        color: preset.value,
                        type: bg.type === "default" ? "color" : bg.type,
                      })
                    }
                    className={`h-7 rounded border transition ${
                      normalizeHexColor(bg.color) === preset.value &&
                      bg.type !== "default"
                        ? "border-sky-400 ring-2 ring-sky-500/50"
                        : "border-slate-700 hover:border-sky-500"
                    }`}
                    style={{ backgroundColor: preset.value }}
                  />
                ))}
              </div>
            </div>
          )}

          {bg.type === "image" && (
            <div className="flex flex-col gap-2">
              <GroupLabel>Background image</GroupLabel>
              <button
                type="button"
                onClick={() => setShowGallery((v) => !v)}
                className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-sky-500"
              >
                {showGallery ? "Hide Media Library" : "Choose from Media Library"}
              </button>

              {selectedImage && (
                <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/50 p-2">
                  {selectedImage.thumbnail ? (
                    <img
                      src={selectedImage.thumbnail}
                      alt=""
                      className="h-12 w-20 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded bg-slate-900 text-xs text-slate-500">
                      Image
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-100">
                      {selectedImage.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Selected background
                    </p>
                  </div>
                </div>
              )}

              {missingImage && (
                <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  This background image is no longer available in the media
                  library. The projection will fall back to the solid color
                  until you choose another one.
                </p>
              )}

              {showGallery && (
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2">
                  {media.loading ? (
                    <p className="p-2 text-sm text-slate-500">Loading…</p>
                  ) : images.length === 0 ? (
                    <div className="flex flex-col gap-2 p-2">
                      <p className="text-sm text-slate-500">
                        No images in the media library yet.
                      </p>
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="self-start rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
                      >
                        Upload an image
                      </button>
                    </div>
                  ) : (
                    <div className="grid max-h-52 grid-cols-3 gap-2 overflow-y-auto pr-1">
                      {images.map((item) => {
                        const active = item.id === bg.mediaId;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            title={item.name}
                            aria-label={`Use ${item.name} as background`}
                            aria-pressed={active}
                            onClick={() => setBg({ mediaId: item.id })}
                            className={`overflow-hidden rounded border transition ${
                              active
                                ? "border-sky-400 ring-2 ring-sky-500/50"
                                : "border-slate-800 hover:border-sky-500"
                            }`}
                          >
                            {item.thumbnail ? (
                              <img
                                src={item.thumbnail}
                                alt=""
                                className="aspect-video w-full object-cover"
                              />
                            ) : (
                              <span className="flex aspect-video w-full items-center justify-center bg-slate-900 text-[10px] text-slate-500">
                                Image
                              </span>
                            )}
                            <span className="block truncate px-1 py-0.5 text-[10px] text-slate-300">
                              {item.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="mt-2 rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 transition hover:border-sky-500"
                  >
                    Upload another image
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <GroupLabel>Image fit</GroupLabel>
                <div
                  role="group"
                  aria-label="Image fit"
                  className="flex rounded-md border border-slate-700 p-0.5"
                >
                  {(
                    [
                      ["cover", "Cover"],
                      ["contain", "Contain"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={bg.fit === value}
                      onClick={() => setBg({ fit: value })}
                      className={`${segBase} ${
                        bg.fit === value ? segOn : segOff
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <GroupLabel>Dimming</GroupLabel>
                  <span className="text-xs text-slate-400">
                    {Math.round(bg.dim * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Background dimming"
                  min={0}
                  max={MAX_BACKGROUND_DIM}
                  step={0.05}
                  value={bg.dim}
                  onChange={(e) => setBg({ dim: Number(e.target.value) })}
                  className="accent-sky-500"
                />
                <p className="text-[11px] text-slate-500">
                  Dims the picture only — lyrics and Bible text stay bright.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <GroupLabel>Text color</GroupLabel>
            <div
              role="group"
              aria-label="Text color"
              className="flex flex-wrap items-center gap-2"
            >
              {TEXT_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  aria-label={`Text color ${preset.label}`}
                  aria-pressed={
                    settings.textColor.toLowerCase() === preset.value
                  }
                  onClick={() => onChange({ textColor: preset.value })}
                  className={`${segBase} border ${
                    settings.textColor.toLowerCase() === preset.value
                      ? "border-sky-400 bg-sky-600 text-white"
                      : "border-slate-700 text-slate-300 hover:border-sky-500"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <label className="flex items-center gap-2 text-xs text-slate-400">
                Custom
                <input
                  type="color"
                  aria-label="Custom text color"
                  value={settings.textColor}
                  onChange={(e) => onChange({ textColor: e.target.value })}
                  className="h-8 w-10 cursor-pointer rounded border border-slate-700 bg-slate-900"
                />
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={apply}
              className="rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-sky-500"
            >
              Reset to Default
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-sky-500"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={IMAGE_ACCEPT_ATTR}
        multiple
        className="hidden"
        onChange={(e) => {
          void handleUpload(e.target.files);
          e.target.value = "";
        }}
      />
    </section>
  );
}
