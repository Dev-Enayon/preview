import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { MediaProjection, ProjectionState } from "../types";
import { DEFAULT_SETTINGS } from "../lib/settings";
import { mediaStore } from "../lib/mediaStore";
import { Projection } from "./Projection";

const STATE_KEY = "lyrics-projection:state";

function setState(state: ProjectionState) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function media(overrides: Partial<MediaProjection> = {}): MediaProjection {
  return {
    id: "m1",
    kind: "image",
    fit: "contain",
    muted: false,
    volume: 1,
    playing: false,
    restartToken: 0,
    ...overrides,
  };
}

beforeEach(() => {
  (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(
    () => "blob:mock",
  );
  (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
  // jsdom does not implement media playback; stub it so effects stay quiet.
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  HTMLMediaElement.prototype.pause = vi.fn();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("Projection", () => {
  it("renders lyrics text without any media elements", () => {
    setState({
      contentType: "lyrics",
      text: "Only these lyrics",
      settings: DEFAULT_SETTINGS,
      blank: false,
    });
    const { container } = render(<Projection />);
    expect(screen.getByText("Only these lyrics")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("video")).toBeNull();
  });

  it("projects only the image in media mode — no text, no chrome", async () => {
    vi.spyOn(mediaStore, "getBlob").mockResolvedValue(
      new Blob(["x"], { type: "image/png" }),
    );
    setState({
      contentType: "media",
      text: "SHOULD NOT APPEAR",
      settings: DEFAULT_SETTINGS,
      blank: false,
      media: media(),
    });

    const { container } = render(<Projection />);
    await waitFor(() => expect(container.querySelector("img")).not.toBeNull());

    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.style.objectFit).toBe("contain");
    expect(container.querySelector("video")).toBeNull();
    expect(screen.queryByText(/SHOULD NOT APPEAR/)).toBeNull();
  });

  it("preserves the aspect ratio with cover fit", async () => {
    vi.spyOn(mediaStore, "getBlob").mockResolvedValue(
      new Blob(["x"], { type: "image/png" }),
    );
    setState({
      contentType: "media",
      text: "",
      settings: DEFAULT_SETTINGS,
      blank: false,
      media: media({ fit: "cover" }),
    });

    const { container } = render(<Projection />);
    await waitFor(() => expect(container.querySelector("img")).not.toBeNull());
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.style.objectFit).toBe("cover");
  });

  it("renders a video without native controls and without overlays", async () => {
    vi.spyOn(mediaStore, "getBlob").mockResolvedValue(
      new Blob(["x"], { type: "video/mp4" }),
    );
    setState({
      contentType: "media",
      text: "caption that must not show",
      settings: DEFAULT_SETTINGS,
      blank: false,
      media: media({ kind: "video" }),
    });

    const { container } = render(<Projection />);
    await waitFor(() =>
      expect(container.querySelector("video")).not.toBeNull(),
    );
    const video = container.querySelector("video") as HTMLVideoElement;
    expect(video.hasAttribute("controls")).toBe(false);
    expect(screen.queryByText(/caption that must not show/)).toBeNull();
  });

  it("handles missing media without crashing or showing anything", async () => {
    vi.spyOn(mediaStore, "getBlob").mockResolvedValue(null);
    setState({
      contentType: "media",
      text: "ghost",
      settings: DEFAULT_SETTINGS,
      blank: false,
      media: media(),
    });

    const { container } = render(<Projection />);
    await waitFor(() => expect(mediaStore.getBlob).toHaveBeenCalled());
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("video")).toBeNull();
    expect(screen.queryByText(/ghost/)).toBeNull();
  });
});
