import type { MediaKind } from "../types";

export interface MediaProbe {
  thumbnail?: string;
  width?: number;
  height?: number;
  duration?: number;
}

const THUMB_MAX = 320;

function makeObjectUrl(blob: Blob): string | null {
  try {
    if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
      return null;
    }
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

function revokeObjectUrl(url: string | null): void {
  if (!url) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    /* ignore */
  }
}

function drawThumbnail(
  source: CanvasImageSource,
  width: number,
  height: number,
): string | undefined {
  try {
    if (!width || !height) return undefined;
    const scale = Math.min(1, THUMB_MAX / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(source, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch {
    return undefined;
  }
}

function probeImage(url: string): Promise<MediaProbe> {
  return new Promise((resolve) => {
    const img = new Image();
    const done = (probe: MediaProbe) => {
      img.onload = null;
      img.onerror = null;
      resolve(probe);
    };
    img.onload = () => {
      done({
        width: img.naturalWidth,
        height: img.naturalHeight,
        thumbnail: drawThumbnail(img, img.naturalWidth, img.naturalHeight),
      });
    };
    img.onerror = () => done({});
    img.src = url;
  });
}

function probeVideo(url: string): Promise<MediaProbe> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    let settled = false;
    const finish = (probe: MediaProbe) => {
      if (settled) return;
      settled = true;
      video.onloadeddata = null;
      video.onseeked = null;
      video.onerror = null;
      video.src = "";
      resolve(probe);
    };

    video.onloadeddata = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      const duration = video.duration;
      const seek = Number.isFinite(duration) ? Math.min(1, duration / 2) : 0;
      video.onloadeddata = null;
      video.onseeked = () => {
        finish({
          width,
          height,
          duration,
          thumbnail: drawThumbnail(video, width, height),
        });
      };
      try {
        video.currentTime = seek;
      } catch {
        finish({ width, height, duration });
      }
    };
    video.onerror = () => finish({});
    video.src = url;
  });
}

const PROBE_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve({} as T), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve({} as T);
      });
  });
}

/**
 * Best-effort metadata + thumbnail extraction for a media file. Never throws
 * and never hangs: if the browser cannot probe a file (a corrupt file, or a
 * headless test environment) it resolves with whatever it managed to read.
 */
export async function probeMedia(
  file: Blob,
  kind: MediaKind,
): Promise<MediaProbe> {
  const url = makeObjectUrl(file);
  if (!url) return {};
  try {
    const probe = kind === "video" ? probeVideo(url) : probeImage(url);
    return await withTimeout(probe, PROBE_TIMEOUT_MS);
  } catch {
    return {};
  } finally {
    revokeObjectUrl(url);
  }
}
