import { getBook, normalizeBookName } from "./bibleBooks";

export const BIBLE_API_BASE = "https://bible-api.com";
export const TRANSLATION_ID = "kjv";
export const TRANSLATION_NAME = "King James Version";

/** Target characters per slide. Larger text (higher font size) => smaller
 * budget, because fewer characters fit comfortably on screen. */
export const DEFAULT_MAX_CHARS_PER_SLIDE = 240;

export interface BibleVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface BiblePassage {
  /** Human-readable reference exactly as returned/accepted, e.g. "John 3:16". */
  reference: string;
  translationId: string;
  translationName: string;
  verses: BibleVerse[];
  fetchedAt: number;
}

export interface PassageSegment {
  verse: number;
  text: string;
  /** True when this is a continuation of a verse split across slides. */
  continuation: boolean;
}

export interface PassageSlide {
  segments: PassageSegment[];
}

export interface ParsedReference {
  book: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
}

export type ParseResult =
  | { ok: true; value: ParsedReference }
  | { ok: false; error: string };

/** Error type whose message is safe to show to the operator. */
export class BibleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BibleError";
  }
}

/**
 * Collapse the whitespace artefacts the API returns (leading indentation and
 * mid-verse line wrapping) into clean, single-spaced text while preserving the
 * order and content of every word.
 */
export function normalizeVerseText(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/** Parse and validate a reference such as "John 3:16", "Psalm 23" or
 * "Romans 8:28-39". Returns a canonical book name from `BIBLE_BOOKS`. */
export function parseReference(input: string): ParseResult {
  const collapsed = input.replace(/\s+/g, " ").trim();
  if (!collapsed) {
    return {
      ok: false,
      error: "Enter a Bible reference, for example “John 3:16” or “Psalm 23”.",
    };
  }

  const match = collapsed.match(
    /^(.+?)\s+(\d+)(?:\s*:\s*(\d+)(?:\s*-\s*(\d+))?)?$/,
  );
  if (!match) {
    return {
      ok: false,
      error: `“${input.trim()}” is not a valid reference. Try “John 3:16”, “Psalm 23” or “Romans 8:28-39”.`,
    };
  }

  const [, bookPart, chapterStr, startStr, endStr] = match;
  const book = normalizeBookName(bookPart);
  if (!book) {
    return { ok: false, error: `Unknown book “${bookPart.trim()}”.` };
  }
  const info = getBook(book)!;

  const chapter = Number(chapterStr);
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > info.chapters) {
    const plural = info.chapters === 1 ? "" : "s";
    return {
      ok: false,
      error: `${book} has ${info.chapters} chapter${plural}.`,
    };
  }

  const verseStart = startStr ? Number(startStr) : undefined;
  const verseEnd = endStr ? Number(endStr) : undefined;

  if (verseStart !== undefined && (!Number.isInteger(verseStart) || verseStart < 1)) {
    return { ok: false, error: "Verse numbers start at 1." };
  }
  if (
    verseEnd !== undefined &&
    verseStart !== undefined &&
    verseEnd < verseStart
  ) {
    return {
      ok: false,
      error: "The verse range is reversed — the end must not be before the start.",
    };
  }

  return { ok: true, value: { book, chapter, verseStart, verseEnd } };
}

/** Build the canonical reference string (used for display and cache keys). */
export function buildReference(
  book: string,
  chapter: number,
  verseStart?: number,
  verseEnd?: number,
): string {
  let reference = `${book} ${chapter}`;
  if (verseStart && verseStart > 0) {
    reference += `:${verseStart}`;
    if (verseEnd && verseEnd > 0 && verseEnd !== verseStart) {
      reference += `-${verseEnd}`;
    }
  }
  return reference;
}

export function referenceFromParsed(parsed: ParsedReference): string {
  return buildReference(
    parsed.book,
    parsed.chapter,
    parsed.verseStart,
    parsed.verseEnd,
  );
}

/** Construct the bible-api.com URL, always requesting the KJV translation. */
export function buildApiUrl(parsed: ParsedReference): string {
  const reference = referenceFromParsed(parsed);
  const path = encodeURIComponent(reference)
    .replace(/%20/g, "+")
    .replace(/%3A/gi, ":");
  const params = new URLSearchParams();
  params.set("translation", TRANSLATION_ID);
  const info = getBook(parsed.book);
  if (info?.singleChapter && !parsed.verseStart) {
    // Without this, "Jude 1" would be interpreted as verse 1 of Jude.
    params.set("single_chapter_book_matching", "indifferent");
  }
  return `${BIBLE_API_BASE}/${path}?${params.toString()}`;
}

interface FetchOptions {
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

function buildPassage(
  data: unknown,
  parsed: ParsedReference,
  fallbackReference: string,
): BiblePassage {
  if (!data || typeof data !== "object") {
    throw new BibleError("The Bible service returned an unexpected response.");
  }
  const obj = data as Record<string, unknown>;

  const translationId =
    typeof obj.translation_id === "string" ? obj.translation_id.trim() : "";
  if (translationId.toLowerCase() !== TRANSLATION_ID) {
    const returned =
      typeof obj.translation_name === "string" && obj.translation_name
        ? obj.translation_name
        : translationId || "an unknown translation";
    throw new BibleError(
      `The King James Version is not available for this passage — the service returned “${returned}”. Nothing was projected.`,
    );
  }

  const rawVerses = Array.isArray(obj.verses) ? obj.verses : [];
  const verses: BibleVerse[] = [];
  for (const item of rawVerses) {
    if (!item || typeof item !== "object") continue;
    const v = item as Record<string, unknown>;
    const verseNum = Number(v.verse);
    const text = typeof v.text === "string" ? normalizeVerseText(v.text) : "";
    if (!Number.isInteger(verseNum) || verseNum < 1 || !text) continue;
    verses.push({
      book:
        typeof v.book_name === "string" && v.book_name
          ? v.book_name
          : parsed.book,
      chapter: typeof v.chapter === "number" ? v.chapter : parsed.chapter,
      verse: verseNum,
      text,
    });
  }

  if (verses.length === 0) {
    throw new BibleError(
      `No verses were returned for “${fallbackReference}”. Check the reference and try again.`,
    );
  }

  // Guarantee verse order even if the API response is out of order.
  verses.sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);

  const reference =
    typeof obj.reference === "string" && obj.reference.trim()
      ? obj.reference.trim()
      : fallbackReference;

  return {
    reference,
    translationId: TRANSLATION_ID,
    translationName: TRANSLATION_NAME,
    verses,
    fetchedAt: Date.now(),
  };
}

/**
 * Fetch a passage from bible-api.com, explicitly requesting the KJV and
 * verifying that the returned translation really is the KJV. Throws a
 * `BibleError` (safe to display) on any problem.
 */
export async function fetchPassage(
  referenceInput: string,
  options: FetchOptions = {},
): Promise<BiblePassage> {
  const parse = parseReference(referenceInput);
  if (!parse.ok) throw new BibleError(parse.error);
  const parsed = parse.value;
  const canonical = referenceFromParsed(parsed);
  const doFetch = options.fetchImpl ?? fetch;

  let response: Response;
  try {
    response = await doFetch(buildApiUrl(parsed), {
      headers: { Accept: "application/json" },
      signal: options.signal,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    throw new BibleError(
      "Could not reach the Bible service. Check your internet connection, or open a passage you have used before (it may be saved for offline use).",
    );
  }

  if (response.status === 404) {
    throw new BibleError(
      `No passage found for “${canonical}”. Check the book, chapter and verse numbers.`,
    );
  }
  if (!response.ok) {
    throw new BibleError(
      `The Bible service responded with an error (HTTP ${response.status}). Please try again.`,
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new BibleError("The Bible service returned an unreadable response.");
  }

  return buildPassage(data, parsed, canonical);
}

/** Heuristic character budget per slide derived from the chosen font size. */
export function estimateMaxCharsPerSlide(fontSize: number): number {
  if (!Number.isFinite(fontSize) || fontSize <= 0) {
    return DEFAULT_MAX_CHARS_PER_SLIDE;
  }
  const chars = Math.round(2200 / fontSize);
  return Math.min(700, Math.max(80, chars));
}

/**
 * Split a verse's text on word boundaries so no chunk exceeds `maxChars`.
 * A single word longer than the limit becomes its own chunk — words are never
 * cut in half.
 */
function splitVerseIntoChunks(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const chunks: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= maxChars) {
      current += " " + word;
    } else {
      chunks.push(current);
      current = word;
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text];
}

/**
 * Split a passage into projection slides. Short verses are packed together;
 * a single verse that is too long is split across slides on word boundaries.
 * Verse order is preserved and no verse (or word) is ever dropped.
 */
export function splitPassage(
  verses: BibleVerse[],
  maxChars: number = DEFAULT_MAX_CHARS_PER_SLIDE,
): PassageSlide[] {
  const limit = Math.max(1, Math.floor(maxChars));
  const slides: PassageSlide[] = [];
  let current: PassageSegment[] = [];
  let currentLength = 0;

  const flush = () => {
    if (current.length > 0) {
      slides.push({ segments: current });
      current = [];
      currentLength = 0;
    }
  };

  for (const verse of verses) {
    const text = verse.text.trim();
    if (!text) continue;

    if (text.length <= limit) {
      const projected = currentLength + (current.length > 0 ? 1 : 0) + text.length;
      if (current.length > 0 && projected > limit) flush();
      currentLength += (current.length > 0 ? 1 : 0) + text.length;
      current.push({ verse: verse.verse, text, continuation: false });
    } else {
      flush();
      const chunks = splitVerseIntoChunks(text, limit);
      chunks.forEach((chunk, index) => {
        slides.push({
          segments: [
            { verse: verse.verse, text: chunk, continuation: index > 0 },
          ],
        });
      });
    }
  }

  flush();
  return slides;
}

/**
 * Render a slide to the exact text shown on the projection screen.
 * Verse numbers are included only when explicitly enabled.
 */
export function renderSlideText(
  slide: PassageSlide,
  showVerseNumbers: boolean,
): string {
  return slide.segments
    .map((segment) => {
      if (!showVerseNumbers) return segment.text;
      return segment.continuation
        ? segment.text
        : `${segment.verse} ${segment.text}`;
    })
    .join("\n");
}
