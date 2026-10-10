import type { MediaKind } from "../types";

/** Image formats the library accepts. */
export const ACCEPTED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/** Video formats the library accepts. */
export const ACCEPTED_VIDEO_MIME = ["video/mp4", "video/webm"] as const;

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"] as const;
const VIDEO_EXTENSIONS = [".mp4", ".webm"] as const;

/** Value for an <input type="file" accept="..."> attribute. */
export const MEDIA_ACCEPT_ATTR = [
  ...ACCEPTED_IMAGE_MIME,
  ...ACCEPTED_VIDEO_MIME,
  ...IMAGE_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
].join(",");

/** Size limits keep large files from exhausting browser memory. */
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 512 * 1024 * 1024;

const EXTENSION_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

export type MediaClassification =
  | { ok: true; kind: MediaKind; mimeType: string }
  | { ok: false; error: string };

interface FileLike {
  name: string;
  type: string;
  size: number;
}

/**
 * Validate a candidate file by extension *and* MIME type. A mismatch (for
 * example a `.mp4` claiming `text/plain`) is rejected rather than trusted, so
 * a renamed document can never be treated as projectable media.
 */
export function classifyMedia(file: FileLike): MediaClassification {
  const ext = extensionOf(file.name);
  const extMime = EXTENSION_TO_MIME[ext];

  if (!extMime) {
    return {
      ok: false,
      error: `“${file.name}” is not a supported file type. Use JPG, PNG, WebP, GIF, MP4 or WebM.`,
    };
  }

  const declared = (file.type || "").toLowerCase();
  if (declared && declared !== extMime) {
    return {
      ok: false,
      error: `“${file.name}” does not look like a valid ${ext} file.`,
    };
  }

  if (file.size <= 0) {
    return { ok: false, error: `“${file.name}” is empty.` };
  }

  const kind: MediaKind = extMime.startsWith("video/") ? "video" : "image";
  const limit = kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) {
    return {
      ok: false,
      error: `“${file.name}” is ${formatBytes(file.size)} — larger than the ${formatBytes(
        limit,
      )} limit for ${kind}s.`,
    };
  }

  return { ok: true, kind, mimeType: extMime };
}

/** Human-readable file size. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

/** Short duration label (m:ss) for videos. */
export function formatDuration(seconds: number | undefined): string {
  if (!seconds || !Number.isFinite(seconds) || seconds < 0) return "";
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/** "Image" / "Video" label for badges. */
export function mediaKindLabel(kind: MediaKind): string {
  return kind === "video" ? "Video" : "Image";
}
