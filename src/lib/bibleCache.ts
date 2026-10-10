import type { BiblePassage } from "./bible";
import { parseReference, referenceFromParsed } from "./bible";

const CACHE_KEY = "lyrics-projection:bible-cache";
const MAX_ENTRIES = 80;

type CacheMap = Record<string, BiblePassage>;

function load(): CacheMap {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as CacheMap) : {};
  } catch {
    return {};
  }
}

function persist(map: CacheMap): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable - ignore */
  }
}

/** Normalize a reference string into a stable cache key. */
function cacheKey(reference: string): string {
  return reference.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Resolve any acceptable reference spelling to the canonical cache key. */
function canonicalKey(reference: string): string {
  const parse = parseReference(reference);
  if (parse.ok) return cacheKey(referenceFromParsed(parse.value));
  return cacheKey(reference);
}

/**
 * A small persistent cache of successfully fetched KJV passages so previously
 * opened passages can still be projected with no network connection.
 */
export const bibleCache = {
  get(reference: string): BiblePassage | null {
    const map = load();
    return map[canonicalKey(reference)] ?? map[cacheKey(reference)] ?? null;
  },

  has(reference: string): boolean {
    return this.get(reference) !== null;
  },

  put(passage: BiblePassage): void {
    const map = load();
    map[cacheKey(passage.reference)] = passage;
    const entries = Object.entries(map);
    if (entries.length > MAX_ENTRIES) {
      entries
        .sort((a, b) => (a[1].fetchedAt ?? 0) - (b[1].fetchedAt ?? 0))
        .slice(0, entries.length - MAX_ENTRIES)
        .forEach(([key]) => delete map[key]);
    }
    persist(map);
  },

  clear(): void {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      /* ignore */
    }
  },
};
