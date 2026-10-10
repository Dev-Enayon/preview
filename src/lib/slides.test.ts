import { describe, expect, it } from "vitest";
import { clampSlideIndex, splitLyrics } from "./slides";

describe("splitLyrics", () => {
  it("returns no slides for empty input", () => {
    expect(splitLyrics("")).toEqual([]);
    expect(splitLyrics("   \n\n  ")).toEqual([]);
  });

  it("keeps a single paragraph as one slide", () => {
    expect(splitLyrics("Amazing grace")).toEqual(["Amazing grace"]);
  });

  it("splits on a blank line", () => {
    const lyrics = "Amazing grace\n\nThat saved a wretch";
    expect(splitLyrics(lyrics)).toEqual([
      "Amazing grace",
      "That saved a wretch",
    ]);
  });

  it("preserves line breaks inside a slide", () => {
    const lyrics = "line one\nline two\n\nnew slide";
    expect(splitLyrics(lyrics)).toEqual(["line one\nline two", "new slide"]);
  });

  it("collapses multiple blank lines into a single break", () => {
    const lyrics = "one\n\n\n\n\ntwo";
    expect(splitLyrics(lyrics)).toEqual(["one", "two"]);
  });

  it("treats a rule of dashes as a separator", () => {
    const lyrics = "one\n---\ntwo";
    expect(splitLyrics(lyrics)).toEqual(["one", "two"]);
  });

  it("normalizes windows line endings", () => {
    expect(splitLyrics("one\r\n\r\ntwo")).toEqual(["one", "two"]);
  });

  it("handles a single very long line as one slide", () => {
    expect(splitLyrics("A".repeat(5000))).toEqual(["A".repeat(5000)]);
  });

  it("preserves leading indentation inside a slide", () => {
    const lyrics = "  indented line\n    deeper line\n\nnext";
    expect(splitLyrics(lyrics)).toEqual([
      "  indented line\n    deeper line",
      "next",
    ]);
  });

  it("handles Unicode characters and accents", () => {
    const lyrics = "Amazing γρáce 🎶 élan\nque nos unen\n\nNuevo verso";
    expect(splitLyrics(lyrics)).toEqual([
      "Amazing γρáce 🎶 élan\nque nos unen",
      "Nuevo verso",
    ]);
  });

  it("treats whitespace-only lines as blank separators", () => {
    const lyrics = "one\n   \n\t\ntwo";
    expect(splitLyrics(lyrics)).toEqual(["one", "two"]);
  });

  it("drops slides that are only whitespace", () => {
    expect(splitLyrics("real verse\n\n\n   \n\nreal chorus")).toEqual([
      "real verse",
      "real chorus",
    ]);
  });

  it("does not split a verse containing a single dash separator line remotely", () => {
    expect(splitLyrics("a -- b\n-- c")).toEqual(["a -- b\n-- c"]);
  });

  it("matches the two-slide example from the brief", () => {
    const lyrics =
      "Amazing grace, how sweet the sound\n\nThat saved a wretch like me\n\nI once was lost, but now am found\n\nWas blind, but now I see";
    expect(splitLyrics(lyrics)).toHaveLength(4);
  });
});

describe("clampSlideIndex", () => {
  it("clamps to valid bounds", () => {
    expect(clampSlideIndex(-2, 5)).toBe(0);
    expect(clampSlideIndex(9, 5)).toBe(4);
    expect(clampSlideIndex(2, 5)).toBe(2);
  });

  it("returns 0 when there are no slides", () => {
    expect(clampSlideIndex(3, 0)).toBe(0);
  });
});
