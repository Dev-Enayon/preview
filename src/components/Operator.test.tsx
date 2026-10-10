import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { __resetMediaMemory } from "../lib/mediaStore";
import { probeMedia } from "../lib/mediaThumbnails";
import { Operator } from "./Operator";

// Thumbnail probing needs a real browser; keep it instant and inert in tests.
vi.mock("../lib/mediaThumbnails", () => ({ probeMedia: vi.fn() }));

beforeEach(() => {
  vi.mocked(probeMedia).mockResolvedValue({});
});

async function renderOperator() {
  const view = render(<Operator />);
  await screen.findByText(/No saved lyrics yet/i);
  return view;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  __resetMediaMemory();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const kjvJohn316 = {
  reference: "John 3:16",
  translation_id: "kjv",
  translation_name: "King James Version",
  translation_note: "Public Domain",
  verses: [
    {
      book_id: "JHN",
      book_name: "John",
      chapter: 3,
      verse: 16,
      text: "          For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.\n",
    },
  ],
  text: "…",
};

describe("Operator", () => {
  it("splits lyrics typed in the editor into slides", async () => {
    await renderOperator();

    const editor = screen.getByPlaceholderText(/Type or paste lyrics/i);
    await act(async () => {
      fireEvent.change(editor, {
        target: { value: "Amazing grace\n\nThat saved a wretch" },
      });
    });

    expect(screen.getByText(/2 slides detected/i)).toBeInTheDocument();
    expect(screen.getAllByText("Amazing grace").length).toBeGreaterThan(0);
    expect(screen.getAllByText("That saved a wretch").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText(/Slide 1 of 2/i)).toBeInTheDocument();
  });

  it("navigates between slides with the next control", async () => {
    await renderOperator();

    const editor = screen.getByPlaceholderText(/Type or paste lyrics/i);
    await act(async () => {
      fireEvent.change(editor, {
        target: { value: "first\n\nsecond\n\nthird" },
      });
    });

    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    expect(screen.getByText(/Slide 2 of 3/i)).toBeInTheDocument();
  });

  it("shows an error when saving with an empty editor", async () => {
    await renderOperator();
    fireEvent.click(screen.getByRole("button", { name: /Save lyrics/i }));
    expect(
      screen.getByText(/Add some lyrics before saving/i),
    ).toBeInTheDocument();
  });

  it("notifies when the projection window is blocked", async () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    await renderOperator();
    fireEvent.click(screen.getByRole("button", { name: /Start Projection/i }));
    expect(await screen.findByText(/allow pop-ups/i)).toBeInTheDocument();
    openSpy.mockRestore();
  });

  it("does not show a Not projecting label on the top bar", async () => {
    await renderOperator();
    expect(screen.queryByText(/Not projecting/i)).toBeNull();
    expect(
      screen.getByRole("button", { name: /^Project$/i }),
    ).toBeInTheDocument();
  });

  it("stages sections without projecting until Project is pressed, then stays live", async () => {
    const fakeWin = {
      closed: false,
      focus: vi.fn(),
      moveTo: vi.fn(),
      resizeTo: vi.fn(),
    } as unknown as Window;
    vi.spyOn(window, "open").mockReturnValue(fakeWin);
    await renderOperator();

    const editor = screen.getByPlaceholderText(/Type or paste lyrics/i);
    await act(async () => {
      fireEvent.change(editor, {
        target: { value: "first slide\n\nsecond slide" },
      });
    });
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));

    const projected = () =>
      JSON.parse(
        localStorage.getItem("lyrics-projection:state") ?? "null",
      ) as { text: string; blank: boolean };

    // Clicking slides only stages: the projector keeps the idle black screen.
    expect(projected().blank).toBe(true);
    expect(projected().text).toBe("");

    fireEvent.click(screen.getByRole("button", { name: /^Project$/i }));
    expect(await screen.findByText("Projecting")).toBeInTheDocument();

    await waitFor(() => {
      expect(projected().blank).toBe(false);
      expect(projected().text).toContain("second slide");
    });

    // After going live, subsequent edits broadcast immediately.
    await act(async () => {
      fireEvent.change(editor, {
        target: { value: "third slide" },
      });
    });
    await waitFor(() => {
      expect(projected().text).toContain("third slide");
    });
  });

  it("restores the editor session across a remount", async () => {
    const view = await renderOperator();

    const editor = screen.getByPlaceholderText(/Type or paste lyrics/i);
    await act(async () => {
      fireEvent.change(editor, {
        target: { value: "keeper lyrics\nline two\n\nsecond slide" },
      });
    });
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));

    view.unmount();
    await renderOperator();

    const restored = screen.getByPlaceholderText(
      /Type or paste lyrics/i,
    ) as HTMLTextAreaElement;
    expect(restored.value).toBe("keeper lyrics\nline two\n\nsecond slide");
    expect(screen.getByText(/Slide 2 of 2/i)).toBeInTheDocument();
  });

  it("switches to Bible mode and projects verse text without references", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => kjvJohn316,
      }) as unknown as typeof fetch,
    );

    await renderOperator();

    const bibleBtn = screen.getByRole("button", { name: /Bible/i });
    await act(async () => {
      fireEvent.click(bibleBtn);
    });

    // The Bible panel should be shown; lyrics editor hidden.
    expect(screen.getByText(/Bible search/i)).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/Type or paste lyrics/i),
    ).not.toBeInTheDocument();

    // Search for the default reference.
    const searchBtn = screen.getByRole("button", { name: /Search/i });
    await act(async () => {
      fireEvent.click(searchBtn);
    });

    // Wait for preview to show the verse text.
    const previewBox =
      document.querySelector(".aspect-video") ?? document.body;
    await screen.findByText(/For God so loved the world/i, {
      selector: ".aspect-video *",
    });

    const previewText = previewBox.textContent ?? "";
    expect(previewText).toContain("For God so loved the world");
    expect(previewText).not.toContain("John 3:16");
    expect(previewText).not.toContain("King James");

    // Verse numbers must be off by default.
    expect(previewText.trim().startsWith("16")).toBe(false);

    // Slides reflect the fetched verse.
    expect(screen.getByText(/Slide 1 of 1/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/For God so loved the world/i).length,
    ).toBeGreaterThan(0);
  });

  it("preserves lyrics work when switching back from Bible mode", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => kjvJohn316,
      }) as unknown as typeof fetch,
    );

    await renderOperator();

    const editor = screen.getByPlaceholderText(/Type or paste lyrics/i);
    await act(async () => {
      fireEvent.change(editor, {
        target: { value: "Amazing grace\n\nThat saved a wretch" },
      });
    });

    const bibleBtn = screen.getByRole("button", { name: /Bible/i });
    await act(async () => {
      fireEvent.click(bibleBtn);
    });

    const searchBtn = screen.getByRole("button", { name: /Search/i });
    await act(async () => {
      fireEvent.click(searchBtn);
    });
    await screen.findByText(/For God so loved the world/i, {
      selector: ".aspect-video *",
    });

    const lyricsBtn = screen.getByRole("button", { name: /^Lyrics$/i });
    await act(async () => {
      fireEvent.click(lyricsBtn);
    });

    const restored = screen.getByPlaceholderText(
      /Type or paste lyrics/i,
    ) as HTMLTextAreaElement;
    expect(restored.value).toBe("Amazing grace\n\nThat saved a wretch");
    expect(screen.getByText(/Slide 1 of 2/i)).toBeInTheDocument();
  });

  it("allows toggling verse numbers for Bible slides", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => kjvJohn316,
      }) as unknown as typeof fetch,
    );

    await renderOperator();

    const bibleBtn = screen.getByRole("button", { name: /Bible/i });
    await act(async () => {
      fireEvent.click(bibleBtn);
    });

    const searchBtn = screen.getByRole("button", { name: /Search/i });
    await act(async () => {
      fireEvent.click(searchBtn);
    });
    await screen.findByText(/For God so loved the world/i, {
      selector: ".aspect-video *",
    });

    const checkbox = screen.getByLabelText(
      /Show verse numbers on projector \(off by default\)/i,
    );
    await act(async () => {
      fireEvent.click(checkbox);
    });

    const previewBox =
      document.querySelector(".aspect-video") ?? document.body;
    await screen.findByText(/^16 For God so loved the world/i, {
      selector: ".aspect-video *",
    });
    const previewText = previewBox.textContent ?? "";
    expect(previewText.trim().startsWith("16 For God")).toBe(true);
  });
});

function makeFile(name: string, type: string, content = "data") {
  return new File([content], name, { type });
}

function fileInput(): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("file input not found");
  return input;
}

async function upload(files: File[]) {
  await act(async () => {
    fireEvent.change(fileInput(), { target: { files } });
  });
}

describe("Operator media mode", () => {
  it("switches to Media mode and shows the library and toolbar", async () => {
    await renderOperator();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Media" }));
    });

    expect(
      screen.getByRole("heading", { name: /Media library/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Media controls/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/Type or paste lyrics/i),
    ).not.toBeInTheDocument();
  });

  it("uploads multiple images and lists them", async () => {
    await renderOperator();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Media" }));
    });

    await upload([
      makeFile("one.png", "image/png"),
      makeFile("two.jpg", "image/jpeg"),
    ]);

    expect(await screen.findByText("one.png")).toBeInTheDocument();
    expect(screen.getByText("two.jpg")).toBeInTheDocument();
    expect(screen.getByText(/Added 2 files/i)).toBeInTheDocument();
  });

  it("accepts videos and shows a video badge", async () => {
    await renderOperator();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Media" }));
    });

    await upload([makeFile("clip.mp4", "video/mp4")]);
    expect(await screen.findByText("clip.mp4")).toBeInTheDocument();
    // The gallery badge and the toolbar reflect the video kind.
    expect(screen.getAllByText("Video").length).toBeGreaterThan(0);
  });

  it("rejects unsupported files with a clear error", async () => {
    await renderOperator();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Media" }));
    });

    await upload([makeFile("notes.txt", "text/plain")]);
    expect(
      await screen.findByText(/not a supported file type/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("notes.txt")).not.toBeInTheDocument();
  });

  it("deletes a media item after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await renderOperator();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Media" }));
    });

    await upload([makeFile("gone.png", "image/png")]);
    await screen.findByText("gone.png");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^Delete$/ }));
    });

    await waitFor(() =>
      expect(screen.queryByText("gone.png")).not.toBeInTheDocument(),
    );
  });

  it("restores the media library after a remount", async () => {
    const view = await renderOperator();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Media" }));
    });
    await upload([makeFile("keeper.png", "image/png")]);
    await screen.findByText("keeper.png");

    // Return to lyrics mode so the remount helper has its familiar anchor.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^Lyrics$/ }));
    });
    view.unmount();
    await renderOperator();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Media" }));
    });

    expect(await screen.findByText("keeper.png")).toBeInTheDocument();
  });

  it("keeps lyrics work when switching Media → Lyrics", async () => {
    await renderOperator();
    const editor = screen.getByPlaceholderText(/Type or paste lyrics/i);
    await act(async () => {
      fireEvent.change(editor, {
        target: { value: "Amazing grace\n\nThat saved a wretch" },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Media" }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^Lyrics$/ }));
    });

    const restored = screen.getByPlaceholderText(
      /Type or paste lyrics/i,
    ) as HTMLTextAreaElement;
    expect(restored.value).toBe("Amazing grace\n\nThat saved a wretch");
    expect(screen.getByText(/Slide 1 of 2/i)).toBeInTheDocument();
  });
});

const SETTINGS_KEY = "lyrics-projection:settings";

function storedSettings(): {
  textColor?: string;
  background?: { type?: string; color?: string; mediaId?: string | null; fit?: string; dim?: number };
} {
  return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
}

async function click(name: string | RegExp) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
}

describe("Operator backgrounds", () => {
  it("shows the Background panel in lyrics/Bible mode and hides it in Media mode", async () => {
    await renderOperator();
    expect(
      screen.getByRole("heading", { name: /^Background$/i }),
    ).toBeInTheDocument();

    await click("Media");
    expect(
      screen.queryByRole("heading", { name: /^Background$/i }),
    ).not.toBeInTheDocument();

    await click("Bible");
    expect(
      screen.getByRole("heading", { name: /^Background$/i }),
    ).toBeInTheDocument();
  });

  it("applies a solid-color preset and persists it without changing the slide", async () => {
    await renderOperator();
    const editor = screen.getByPlaceholderText(/Type or paste lyrics/i);
    await act(async () => {
      fireEvent.change(editor, {
        target: { value: "first\n\nsecond" },
      });
    });
    await click(/Next/);
    expect(screen.getByText(/Slide 2 of 2/i)).toBeInTheDocument();

    await click("Solid Color");
    await click("Background color Navy");

    const stored = storedSettings();
    expect(stored.background?.type).toBe("color");
    expect(stored.background?.color).toBe("#0a2540");
    // The current slide is untouched by a background change.
    expect(screen.getByText(/Slide 2 of 2/i)).toBeInTheDocument();
  });

  it("validates HEX input and normalises shorthand", async () => {
    await renderOperator();
    await click("Solid Color");
    const hex = screen.getByLabelText("Background color HEX");

    await act(async () => {
      fireEvent.change(hex, { target: { value: "notacolor" } });
    });
    expect(screen.getByText(/valid HEX color/i)).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(hex, { target: { value: "#123" } });
    });
    expect(storedSettings().background?.color).toBe("#112233");
  });

  it("selects a background image from the Media Library", async () => {
    await renderOperator();
    await click("Media");
    await upload([makeFile("bg.png", "image/png")]);
    await screen.findByText("bg.png");

    await click(/^Lyrics$/);
    await click("Image");
    await click("Use bg.png as background");

    expect(storedSettings().background?.type).toBe("image");
    expect(storedSettings().background?.mediaId).toBeTruthy();
    expect(screen.getByText("Selected background")).toBeInTheDocument();
  });

  it("stores the cover/contain fit choice", async () => {
    await renderOperator();
    await click("Media");
    await upload([makeFile("bg.png", "image/png")]);
    await screen.findByText("bg.png");
    await click(/^Lyrics$/);
    await click("Image");
    await click("Use bg.png as background");

    await click("Contain");
    expect(storedSettings().background?.fit).toBe("contain");
    await click("Cover");
    expect(storedSettings().background?.fit).toBe("cover");
  });

  it("persists background settings across a reload", async () => {
    const view = await renderOperator();
    await click("Solid Color");
    await click("Background color Purple");
    await click(/^Lyrics$/);
    view.unmount();

    await renderOperator();
    const hex = screen.getByLabelText("Background color HEX") as HTMLInputElement;
    expect(hex.value).toBe("#2e1065");
    expect(storedSettings().background?.color).toBe("#2e1065");
  });

  it("resets the background and text color to the defaults without deleting media", async () => {
    await renderOperator();
    await click("Media");
    await upload([makeFile("keep-me.png", "image/png")]);
    await screen.findByText("keep-me.png");
    await click(/^Lyrics$/);
    await click("Image");
    await click("Use keep-me.png as background");
    await click("Text color Black");

    await click("Reset to Default");

    const stored = storedSettings();
    expect(stored.background?.type).toBe("default");
    expect(stored.textColor).toBe("#ffffff");

    // Uploaded media is never deleted by a background reset.
    await click("Media");
    expect(screen.getByText("keep-me.png")).toBeInTheDocument();
  });

  it("handles a missing background image gracefully in the operator only", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await renderOperator();
    await click("Media");
    await upload([makeFile("gone.png", "image/png")]);
    await screen.findByText("gone.png");
    await click(/^Lyrics$/);
    await click("Image");
    await click("Use gone.png as background");

    // Delete the image while it is still the chosen background.
    await click("Media");
    await click(/^Delete$/);
    await click(/^Lyrics$/);

    expect(
      await screen.findByText(/no longer available in the media library/i),
    ).toBeInTheDocument();
  });

  it("keeps Media Mode fully functional after using backgrounds", async () => {
    await renderOperator();
    await click("Solid Color");
    await click("Background color Black");
    await click("Media");
    await upload([makeFile("still-works.png", "image/png")]);
    expect(await screen.findByText("still-works.png")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Media controls/i }),
    ).toBeInTheDocument();
  });
});