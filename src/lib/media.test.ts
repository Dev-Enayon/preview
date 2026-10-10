import { describe, expect, it } from "vitest";
import {
  classifyMedia,
  formatBytes,
  formatDuration,
  mediaKindLabel,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
} from "./media";

function file(name: string, type: string, size = 1024) {
  return { name, type, size };
}

describe("classifyMedia", () => {
  it("accepts the supported image formats", () => {
    for (const [name, type] of [
      ["photo.jpg", "image/jpeg"],
      ["photo.jpeg", "image/jpeg"],
      ["art.png", "image/png"],
      ["graphic.webp", "image/webp"],
      ["anim.gif", "image/gif"],
    ] as const) {
      const result = classifyMedia(file(name, type));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.kind).toBe("image");
    }
  });

  it("accepts the supported video formats", () => {
    for (const [name, type] of [
      ["clip.mp4", "video/mp4"],
      ["clip.webm", "video/webm"],
    ] as const) {
      const result = classifyMedia(file(name, type));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.kind).toBe("video");
    }
  });

  it("is case-insensitive about extensions", () => {
    const result = classifyMedia(file("PHOTO.JPG", "image/jpeg"));
    expect(result.ok).toBe(true);
  });

  it("rejects unsupported file types", () => {
    const result = classifyMedia(file("notes.txt", "text/plain"));
    expect(result.ok).toBe(false);
  });

  it("rejects a file whose extension and MIME disagree", () => {
    const result = classifyMedia(file("fake.mp4", "text/plain"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/valid .mp4/i);
  });

  it("accepts files with an empty MIME type when the extension is valid", () => {
    const result = classifyMedia(file("art.png", ""));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.mimeType).toBe("image/png");
  });

  it("rejects empty files", () => {
    const result = classifyMedia(file("art.png", "image/png", 0));
    expect(result.ok).toBe(false);
  });

  it("rejects images larger than the image limit", () => {
    const result = classifyMedia(
      file("big.png", "image/png", MAX_IMAGE_BYTES + 1),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/limit/i);
  });

  it("rejects videos larger than the video limit", () => {
    const result = classifyMedia(
      file("big.mp4", "video/mp4", MAX_VIDEO_BYTES + 1),
    );
    expect(result.ok).toBe(false);
  });

  it("allows a video just under the limit", () => {
    const result = classifyMedia(
      file("ok.mp4", "video/mp4", MAX_VIDEO_BYTES - 1),
    );
    expect(result.ok).toBe(true);
  });
});

describe("formatting helpers", () => {
  it("formats byte sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("formats durations as m:ss", () => {
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(undefined)).toBe("");
  });

  it("labels media kinds", () => {
    expect(mediaKindLabel("image")).toBe("Image");
    expect(mediaKindLabel("video")).toBe("Video");
  });
});
