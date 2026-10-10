import { useCallback, useRef, useState } from "react";
import type { BibleFormState } from "../lib/session";
import {
  BibleError,
  buildReference,
  fetchPassage,
  parseReference,
  referenceFromParsed,
  type BiblePassage,
} from "../lib/bible";
import { bibleCache } from "../lib/bibleCache";
import { normalizeBookName } from "../lib/bibleBooks";

export const DEFAULT_BIBLE_FORM: BibleFormState = {
  book: "John",
  chapter: 3,
  verseStart: 16,
  verseEnd: 0,
  reference: "John 3:16",
};

export interface UseBible {
  form: BibleFormState;
  passage: BiblePassage | null;
  reference: string;
  selectedVerses: number[];
  loading: boolean;
  error: string | null;
  status: string | null;
  setForm: (patch: Partial<BibleFormState>) => void;
  selectBook: (book: string) => void;
  runSearch: (referenceOverride?: string) => Promise<void>;
  toggleVerse: (verse: number) => void;
  selectAllVerses: () => void;
  clearVerseSelection: () => void;
  hydrate: (
    passage: BiblePassage | null,
    reference: string,
    selected: number[],
  ) => void;
  loadCached: (reference: string) => boolean;
  setError: (message: string | null) => void;
  clearStatus: () => void;
}

interface UseBibleOptions {
  form?: BibleFormState | null;
  passage?: BiblePassage | null;
  reference?: string;
  selectedVerses?: number[];
  fetchImpl?: typeof fetch;
}

export function useBible(options: UseBibleOptions = {}): UseBible {
  // Restore the persisted passage, or fall back to a cached copy so a reload
  // never needs the network just to keep projecting.
  const [initialPassage] = useState<BiblePassage | null>(() =>
    options.passage ??
      (options.reference ? bibleCache.get(options.reference) : null),
  );

  const [form, setFormState] = useState<BibleFormState>(
    options.form ?? { ...DEFAULT_BIBLE_FORM },
  );
  const [passage, setPassage] = useState<BiblePassage | null>(initialPassage);
  const [reference, setReference] = useState<string>(
    options.reference ?? initialPassage?.reference ?? "",
  );
  const [selectedVerses, setSelectedVerses] = useState<number[]>(
    options.selectedVerses ??
      initialPassage?.verses.map((v) => v.verse) ??
      [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const setForm = useCallback((patch: Partial<BibleFormState>) => {
    setFormState((prev) => {
      const next = { ...prev, ...patch };
      const changedSelector =
        patch.book !== undefined ||
        patch.chapter !== undefined ||
        patch.verseStart !== undefined ||
        patch.verseEnd !== undefined;
      if (changedSelector) {
        next.reference = buildReference(
          next.book,
          next.chapter,
          next.verseStart,
          next.verseEnd,
        );
      }
      return next;
    });
  }, []);

  const selectBook = useCallback(
    (book: string) => {
      setForm({ book, chapter: 1, verseStart: 0, verseEnd: 0 });
    },
    [setForm],
  );

  const applyPassage = useCallback((loaded: BiblePassage) => {
    setPassage(loaded);
    setReference(loaded.reference);
    setSelectedVerses(loaded.verses.map((v) => v.verse));
    const first = loaded.verses[0];
    if (first) {
      const numbers = loaded.verses.map((v) => v.verse);
      const start = Math.min(...numbers);
      const end = Math.max(...numbers);
      setFormState((prev) => ({
        book: normalizeBookName(first.book) ?? prev.book,
        chapter: first.chapter,
        verseStart: start,
        verseEnd: end === start ? 0 : end,
        reference: loaded.reference,
      }));
    }
  }, []);

  const runSearch = useCallback(
    async (referenceOverride?: string) => {
      const input = (referenceOverride ?? form.reference).trim();
      const parse = parseReference(input);
      if (!parse.ok) {
        setError(parse.error);
        setStatus(null);
        return;
      }
      const canonical = referenceFromParsed(parse.value);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      setStatus(null);
      try {
        const loaded = await fetchPassage(input, {
          signal: controller.signal,
          fetchImpl: options.fetchImpl,
        });
        bibleCache.put(loaded);
        applyPassage(loaded);
        setStatus(`Loaded ${loaded.reference} (${loaded.translationName}).`);
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        const message =
          err instanceof BibleError
            ? err.message
            : "Could not load that passage.";
        const cached = bibleCache.get(canonical);
        if (cached) {
          applyPassage(cached);
          setError(null);
          setStatus(
            `Offline: showing the saved copy of ${cached.reference}. You can keep projecting it.`,
          );
        } else {
          setError(message);
        }
      } finally {
        setLoading(false);
      }
    },
    [form.reference, applyPassage, options.fetchImpl],
  );

  const toggleVerse = useCallback((verse: number) => {
    setSelectedVerses((prev) =>
      prev.includes(verse)
        ? prev.filter((v) => v !== verse)
        : [...prev, verse].sort((a, b) => a - b),
    );
  }, []);

  const selectAllVerses = useCallback(() => {
    setSelectedVerses(passage ? passage.verses.map((v) => v.verse) : []);
  }, [passage]);

  const clearVerseSelection = useCallback(() => {
    setSelectedVerses([]);
  }, []);

  const hydrate = useCallback(
    (loaded: BiblePassage | null, ref: string, selected: number[]) => {
      if (loaded) {
        setPassage(loaded);
        setSelectedVerses(
          selected.length > 0 ? selected : loaded.verses.map((v) => v.verse),
        );
      }
      if (ref) setReference(ref);
    },
    [],
  );

  const loadCached = useCallback(
    (ref: string) => {
      const cached = bibleCache.get(ref);
      if (cached) {
        applyPassage(cached);
        return true;
      }
      return false;
    },
    [applyPassage],
  );

  const clearStatus = useCallback(() => setStatus(null), []);

  return {
    form,
    passage,
    reference,
    selectedVerses,
    loading,
    error,
    status,
    setForm,
    selectBook,
    runSearch,
    toggleVerse,
    selectAllVerses,
    clearVerseSelection,
    hydrate,
    loadCached,
    setError,
    clearStatus,
  };
}
