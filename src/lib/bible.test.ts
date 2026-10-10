import { describe, expect, it, vi } from "vitest";
import {
  BibleError,
  buildApiUrl,
  estimateMaxCharsPerSlide,
  fetchPassage,
  normalizeVerseText,
  parseReference,
  renderSlideText,
  splitPassage,
  type BibleVerse,
} from "./bible";

function response(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  } as unknown as Response;
}

const john316 = {
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
      text: "          For God so loved the world,\nthat he gave his only begotten Son.\n",
    },
  ],
  text: "…",
};

describe("parseReference", () => {
  it("parses a single verse", () => {
    const result = parseReference("John 3:16");
    expect(result).toEqual({
      ok: true,
      value: { book: "John", chapter: 3, verseStart: 16, verseEnd: undefined },
    });
  });

  it("parses a whole chapter", () => {
    expect(parseReference("Psalm 23")).toEqual({
      ok: true,
      value: { book: "Psalms", chapter: 23, verseStart: undefined, verseEnd: undefined },
    });
  });

  it("parses a verse range", () => {
    expect(parseReference("Romans 8:28-39")).toEqual({
      ok: true,
      value: { book: "Romans", chapter: 8, verseStart: 28, verseEnd: 39 },
    });
  });

  it("accepts abbreviated and alternate book names", () => {
    expect(parseReference("jn 3:16")).toMatchObject({
      ok: true,
      value: { book: "John" },
    });
    expect(parseReference("Song of Songs 1:1")).toMatchObject({
      ok: true,
      value: { book: "Song of Solomon" },
    });
    expect(parseReference("1st Samuel 1:1")).toMatchObject({
      ok: true,
      value: { book: "1 Samuel" },
    });
  });

  it("rejects an unknown book", () => {
    const result = parseReference("Hezekiah 1:1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Unknown book/);
  });

  it("rejects a chapter out of range", () => {
    const result = parseReference("Jude 2");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Jude has 1 chapter/);
  });

  it("rejects a reversed verse range", () => {
    const result = parseReference("John 3:16-5");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/reversed/);
  });

  it("rejects an empty reference", () => {
    const result = parseReference("   ");
    expect(result.ok).toBe(false);
  });
});

describe("buildApiUrl", () => {
  it("always requests the KJV translation", () => {
    const parse = parseReference("John 3:16");
    if (!parse.ok) throw new Error("parse failed");
    expect(buildApiUrl(parse.value)).toContain("translation=kjv");
    expect(buildApiUrl(parse.value)).toContain("John+3:16");
  });

  it("normalizes Psalm to Psalms and encodes ranges", () => {
    const parse = parseReference("Romans 8:28-39");
    if (!parse.ok) throw new Error("parse failed");
    expect(buildApiUrl(parse.value)).toContain("Romans+8:28-39");
  });

  it("adds single_chapter_book_matching for a whole single-chapter book", () => {
    const parse = parseReference("Jude 1");
    if (!parse.ok) throw new Error("parse failed");
    expect(buildApiUrl(parse.value)).toContain(
      "single_chapter_book_matching=indifferent",
    );
  });

  it("does not add the single-chapter flag when a verse is requested", () => {
    const parse = parseReference("Jude 1:3");
    if (!parse.ok) throw new Error("parse failed");
    expect(buildApiUrl(parse.value)).not.toContain(
      "single_chapter_book_matching",
    );
  });
});

describe("normalizeVerseText", () => {
  it("collapses API whitespace and wrapping", () => {
    expect(
      normalizeVerseText("   The LORD\nis my shepherd;  I shall not want.\n"),
    ).toBe("The LORD is my shepherd; I shall not want.");
  });
});

describe("fetchPassage", () => {
  it("returns normalized KJV verses on success", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(john316));
    const passage = await fetchPassage("John 3:16", { fetchImpl });
    expect(passage.translationId).toBe("kjv");
    expect(passage.reference).toBe("John 3:16");
    expect(passage.verses).toEqual([
      {
        book: "John",
        chapter: 3,
        verse: 16,
        text: "For God so loved the world, that he gave his only begotten Son.",
      },
    ]);
  });

  it("rejects a non-KJV translation instead of substituting", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      response({
        ...john316,
        translation_id: "web",
        translation_name: "World English Bible",
      }),
    );
    await expect(fetchPassage("John 3:16", { fetchImpl })).rejects.toThrow(
      /King James Version is not available/,
    );
  });

  it("reports a 404 as an invalid reference", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(response({}, { ok: false, status: 404 }));
    await expect(
      fetchPassage("John 99:1", { fetchImpl }),
    ).rejects.toBeInstanceOf(BibleError);
    const fetchImpl2 = vi
      .fn()
      .mockResolvedValue(response({}, { ok: false, status: 404 }));
    await expect(fetchPassage("John 3:16", { fetchImpl: fetchImpl2 })).rejects
      .toThrow(/No passage found/);
  });

  it("reports an HTTP error", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(response({}, { ok: false, status: 503 }));
    await expect(fetchPassage("John 3:16", { fetchImpl })).rejects.toThrow(
      /HTTP 503/,
    );
  });

  it("reports a network failure", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("network"));
    await expect(fetchPassage("John 3:16", { fetchImpl })).rejects.toThrow(
      /Could not reach the Bible service/,
    );
  });

  it("reports malformed JSON", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("bad json");
      },
    } as unknown as Response);
    await expect(fetchPassage("John 3:16", { fetchImpl })).rejects.toThrow(
      /unreadable response/,
    );
  });

  it("reports an empty verse list without inventing text", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(response({ ...john316, verses: [] }));
    await expect(fetchPassage("John 3:16", { fetchImpl })).rejects.toThrow(
      /No verses were returned/,
    );
  });

  it("orders verses ascending even if the API returns them out of order", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      response({
        ...john316,
        verses: [
          { book_name: "John", chapter: 3, verse: 17, text: "Second" },
          { book_name: "John", chapter: 3, verse: 16, text: "First" },
        ],
      }),
    );
    const passage = await fetchPassage("John 3:16-17", { fetchImpl });
    expect(passage.verses.map((v) => v.verse)).toEqual([16, 17]);
  });
});

describe("splitPassage", () => {
  const shortVerses: BibleVerse[] = [
    { book: "Psalms", chapter: 117, verse: 1, text: "O praise the LORD." },
    { book: "Psalms", chapter: 117, verse: 2, text: "For his mercy." },
  ];

  it("packs short verses onto one slide", () => {
    const slides = splitPassage(shortVerses, 200);
    expect(slides).toHaveLength(1);
    expect(slides[0].segments.map((s) => s.verse)).toEqual([1, 2]);
  });

  it("never omits a verse and preserves order", () => {
    const verses: BibleVerse[] = Array.from({ length: 6 }, (_, i) => ({
      book: "John",
      chapter: 1,
      verse: i + 1,
      text: `Verse number ${i + 1} text.`,
    }));
    const slides = splitPassage(verses, 30);
    const seen: number[] = [];
    for (const slide of slides) {
      for (const segment of slide.segments) seen.push(segment.verse);
    }
    expect(seen).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("splits a long verse on word boundaries without cutting words", () => {
    const words = Array.from({ length: 40 }, (_, i) => `word${i}`);
    const verse: BibleVerse = {
      book: "John",
      chapter: 1,
      verse: 1,
      text: words.join(" "),
    };
    const slides = splitPassage([verse], 25);
    expect(slides.length).toBeGreaterThan(1);
    const chunks: string[] = [];
    for (const slide of slides) {
      for (const segment of slide.segments) {
        expect(segment.text.length).toBeLessThanOrEqual(25);
        chunks.push(segment.text);
      }
    }
    // No word is cut in half: rejoining reproduces the original text.
    expect(chunks.join(" ")).toBe(verse.text);
  });

  it("marks continuation segments of a split verse", () => {
    const words = Array.from({ length: 30 }, () => "abcdefgh");
    const verse: BibleVerse = {
      book: "John",
      chapter: 1,
      verse: 9,
      text: words.join(" "),
    };
    const slides = splitPassage([verse], 20);
    const segments = slides.flatMap((s) => s.segments);
    expect(segments[0].continuation).toBe(false);
    expect(segments.slice(1).every((s) => s.continuation)).toBe(true);
    expect(segments.every((s) => s.verse === 9)).toBe(true);
  });
});

describe("renderSlideText", () => {
  const slide = {
    segments: [
      { verse: 16, text: "For God so loved the world", continuation: false },
      { verse: 16, text: "that he gave his Son.", continuation: true },
    ],
  };

  it("omits verse numbers by default", () => {
    const text = renderSlideText(slide, false);
    expect(text).toBe("For God so loved the world\nthat he gave his Son.");
    expect(text).not.toContain("16");
  });

  it("includes the verse number only when enabled, once per verse", () => {
    const text = renderSlideText(slide, true);
    expect(text.startsWith("16 For God so loved the world")).toBe(true);
    expect(text.match(/16/g)).toHaveLength(1);
  });
});

describe("estimateMaxCharsPerSlide", () => {
  it("shrinks the budget as the font grows", () => {
    expect(estimateMaxCharsPerSlide(20)).toBeLessThan(
      estimateMaxCharsPerSlide(6),
    );
  });

  it("stays within sane bounds", () => {
    expect(estimateMaxCharsPerSlide(0)).toBeGreaterThan(0);
    expect(estimateMaxCharsPerSlide(1000)).toBeGreaterThanOrEqual(80);
  });
});
