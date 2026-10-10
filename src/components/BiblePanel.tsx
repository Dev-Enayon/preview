import { useMemo } from "react";
import type { UseBible } from "../hooks/useBible";
import { BIBLE_BOOKS, getBook } from "../lib/bibleBooks";

interface BiblePanelProps {
  bible: UseBible;
}

const inputClass =
  "w-full rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500";
const labelClass =
  "text-xs font-medium uppercase tracking-wide text-slate-400";

export function BiblePanel({ bible }: BiblePanelProps) {
  const {
    form,
    passage,
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
  } = bible;

  const book = getBook(form.book) ?? BIBLE_BOOKS[0];
  const chapters = useMemo(
    () => Array.from({ length: book.chapters }, (_, i) => i + 1),
    [book.chapters],
  );

  const oldTestament = BIBLE_BOOKS.filter((b) => b.testament === "OT");
  const newTestament = BIBLE_BOOKS.filter((b) => b.testament === "NT");

  return (
    <div className="flex min-h-0 flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          Bible search
        </h2>
        <p className="text-xs text-slate-500">
          King James Version · references stay here, never on the projector.
        </p>
      </div>

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void runSearch();
        }}
      >
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="bible-reference">
            Reference
          </label>
          <div className="flex gap-2">
            <input
              id="bible-reference"
              value={form.reference}
              onChange={(e) => setForm({ reference: e.target.value })}
              placeholder="e.g. John 3:16, Psalm 23, Romans 8:28-39"
              className={inputClass}
            />
            <button
              type="submit"
              disabled={loading}
              className="shrink-0 rounded-md bg-sky-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-50"
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="bible-book">
              Book
            </label>
            <select
              id="bible-book"
              className={inputClass}
              value={form.book}
              onChange={(e) => selectBook(e.target.value)}
            >
              <optgroup label="Old Testament">
                {oldTestament.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="New Testament">
                {newTestament.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="bible-chapter">
              Chapter
            </label>
            <select
              id="bible-chapter"
              className={inputClass}
              value={form.chapter}
              onChange={(e) => setForm({ chapter: Number(e.target.value) })}
            >
              {chapters.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="bible-verse-start">
              From verse <span className="normal-case">(0 = whole chapter)</span>
            </label>
            <input
              id="bible-verse-start"
              type="number"
              min={0}
              value={form.verseStart}
              onChange={(e) => setForm({ verseStart: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass} htmlFor="bible-verse-end">
              To verse <span className="normal-case">(optional)</span>
            </label>
            <input
              id="bible-verse-end"
              type="number"
              min={0}
              value={form.verseEnd}
              onChange={(e) => setForm({ verseEnd: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
        </div>
      </form>

      {error && (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}
      {!error && status && (
        <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {status}
        </p>
      )}
      {!error && !status && loading && (
        <p className="text-sm text-slate-400">Loading passage…</p>
      )}

      {passage && (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-100">
                {passage.reference}
              </p>
              <p className="text-[11px] text-slate-500">
                {passage.translationName} · {selectedVerses.length} of{" "}
                {passage.verses.length} verses selected
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={selectAllVerses}
                className="rounded px-2 py-1 text-xs text-sky-400 hover:text-sky-300"
              >
                All
              </button>
              <button
                type="button"
                onClick={clearVerseSelection}
                className="rounded px-2 py-1 text-xs text-slate-300 hover:text-white"
              >
                None
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            Tick verses to include them. Review the whole passage here before
            projecting.
          </p>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {passage.verses.map((verse) => {
              const selected = selectedVerses.includes(verse.verse);
              return (
                <label
                  key={verse.verse}
                  className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-sm transition ${
                    selected
                      ? "border-sky-500/60 bg-sky-500/5"
                      : "border-slate-800 bg-slate-950/50 opacity-60"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleVerse(verse.verse)}
                    className="mt-0.5 accent-sky-500"
                  />
                  <span className="min-w-0">
                    <span className="mr-1 font-semibold text-sky-400">
                      {verse.verse}
                    </span>
                    <span className="whitespace-pre-wrap break-words text-slate-200">
                      {verse.text}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {!passage && !error && !loading && (
        <p className="text-sm text-slate-500">
          Search for a passage to load its verses.
        </p>
      )}
    </div>
  );
}
