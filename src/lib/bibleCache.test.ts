import { afterEach, describe, expect, it } from "vitest";
import type { BiblePassage } from "./bible";
import { bibleCache } from "./bibleCache";

const passage: BiblePassage = {
  reference: "Psalms 23",
  translationId: "kjv",
  translationName: "King James Version",
  verses: [
    { book: "Psalms", chapter: 23, verse: 1, text: "The LORD is my shepherd." },
  ],
  fetchedAt: Date.now(),
};

afterEach(() => {
  bibleCache.clear();
  localStorage.clear();
});

describe("bibleCache", () => {
  it("stores and retrieves a passage by canonical reference", () => {
    bibleCache.put(passage);
    const cached = bibleCache.get("Psalms 23");
    expect(cached).not.toBeNull();
    expect(cached?.reference).toBe("Psalms 23");
    expect(cached?.translationId).toBe("kjv");
  });

  it("finds a passage by a differently cased/spelled equivalent", () => {
    bibleCache.put(passage);
    const cached = bibleCache.get("psalm 23");
    expect(cached).not.toBeNull();
    expect(cached?.reference).toBe("Psalms 23");
  });

  it("canonicalizes Psalm/Psalms for lookup", () => {
    bibleCache.put(passage);
    const cached = bibleCache.get("Psalm 23");
    expect(cached).not.toBeNull();
  });

  it("stores by the passage reference and can be looked up by the original input", () => {
    bibleCache.put(passage);
    const cached = bibleCache.get("Psalms 23");
    expect(cached).not.toBeNull();
    expect(bibleCache.has("Psalms 23")).toBe(true);
  });

  it("returns null for a passage that has not been stored", () => {
    expect(bibleCache.get("Romans 8:28")).toBeNull();
    expect(bibleCache.has("Romans 8:28")).toBe(false);
  });

  it("overwrites the stored entry for the same reference", () => {
    bibleCache.put(passage);
    const newer: BiblePassage = {
      ...passage,
      verses: [
        {
          book: "Psalms",
          chapter: 23,
          verse: 1,
          text: "Updated text",
        },
      ],
      fetchedAt: Date.now() + 1000,
    };
    bibleCache.put(newer);
    const cached = bibleCache.get("Psalms 23");
    expect(cached?.verses[0].text).toBe("Updated text");
    expect(bibleCache.has("Psalms 23")).toBe(true);
  });

  it("clears the entire cache", () => {
    bibleCache.put(passage);
    bibleCache.clear();
    expect(bibleCache.get("Psalms 23")).toBeNull();
  });
});
