import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Operator } from "./Operator";

async function renderOperator() {
  const view = render(<Operator />);
  await screen.findByText(/No saved lyrics yet/i);
  return view;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
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