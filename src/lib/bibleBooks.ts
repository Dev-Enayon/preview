/**
 * The 66 books of the Protestant canon with the chapter counts used to drive
 * the Bible book/chapter selectors and to validate references before we call
 * the API. Names match the canonical names returned by bible-api.com.
 */
export interface BibleBook {
  /** Canonical book name (matches the API, e.g. "Psalms", "Song of Solomon"). */
  name: string;
  /** Number of chapters in the book. */
  chapters: number;
  testament: "OT" | "NT";
  /** Single-chapter books need special handling for whole-book requests. */
  singleChapter?: boolean;
  /** Alternate spellings accepted in the free-text reference box. */
  aliases?: string[];
}

export const BIBLE_BOOKS: BibleBook[] = [
  { name: "Genesis", chapters: 50, testament: "OT", aliases: ["gen", "ge", "gn"] },
  { name: "Exodus", chapters: 40, testament: "OT", aliases: ["ex", "exo", "exod"] },
  { name: "Leviticus", chapters: 27, testament: "OT", aliases: ["lev", "lv"] },
  { name: "Numbers", chapters: 36, testament: "OT", aliases: ["num", "nm", "nu"] },
  { name: "Deuteronomy", chapters: 34, testament: "OT", aliases: ["deut", "dt", "de"] },
  { name: "Joshua", chapters: 24, testament: "OT", aliases: ["josh", "jos"] },
  { name: "Judges", chapters: 21, testament: "OT", aliases: ["judg", "jdg"] },
  { name: "Ruth", chapters: 4, testament: "OT", aliases: ["rut", "ru"] },
  { name: "1 Samuel", chapters: 31, testament: "OT", aliases: ["1 sam", "1sam", "1 sa"] },
  { name: "2 Samuel", chapters: 24, testament: "OT", aliases: ["2 sam", "2sam", "2 sa"] },
  { name: "1 Kings", chapters: 22, testament: "OT", aliases: ["1 kgs", "1 ki", "1 kg"] },
  { name: "2 Kings", chapters: 25, testament: "OT", aliases: ["2 kgs", "2 ki", "2 kg"] },
  { name: "1 Chronicles", chapters: 29, testament: "OT", aliases: ["1 chr", "1 chron", "1 ch"] },
  { name: "2 Chronicles", chapters: 36, testament: "OT", aliases: ["2 chr", "2 chron", "2 ch"] },
  { name: "Ezra", chapters: 10, testament: "OT", aliases: ["ezr"] },
  { name: "Nehemiah", chapters: 13, testament: "OT", aliases: ["neh"] },
  { name: "Esther", chapters: 10, testament: "OT", aliases: ["est", "esth"] },
  { name: "Job", chapters: 42, testament: "OT", aliases: ["jb"] },
  { name: "Psalms", chapters: 150, testament: "OT", aliases: ["psalm", "ps", "psa", "psm"] },
  { name: "Proverbs", chapters: 31, testament: "OT", aliases: ["prov", "pro", "pr"] },
  { name: "Ecclesiastes", chapters: 12, testament: "OT", aliases: ["eccl", "ecc", "ec"] },
  { name: "Song of Solomon", chapters: 8, testament: "OT", aliases: ["song of songs", "song", "sos", "canticles"] },
  { name: "Isaiah", chapters: 66, testament: "OT", aliases: ["isa", "is"] },
  { name: "Jeremiah", chapters: 52, testament: "OT", aliases: ["jer", "je"] },
  { name: "Lamentations", chapters: 5, testament: "OT", aliases: ["lam", "la"] },
  { name: "Ezekiel", chapters: 48, testament: "OT", aliases: ["ezek", "eze", "ez"] },
  { name: "Daniel", chapters: 12, testament: "OT", aliases: ["dan", "dn", "da"] },
  { name: "Hosea", chapters: 14, testament: "OT", aliases: ["hos", "ho"] },
  { name: "Joel", chapters: 3, testament: "OT", aliases: ["joe", "jl"] },
  { name: "Amos", chapters: 9, testament: "OT", aliases: ["amo", "am"] },
  { name: "Obadiah", chapters: 1, testament: "OT", singleChapter: true, aliases: ["oba", "ob"] },
  { name: "Jonah", chapters: 4, testament: "OT", aliases: ["jon", "jnh"] },
  { name: "Micah", chapters: 7, testament: "OT", aliases: ["mic", "mi"] },
  { name: "Nahum", chapters: 3, testament: "OT", aliases: ["nah", "na"] },
  { name: "Habakkuk", chapters: 3, testament: "OT", aliases: ["hab"] },
  { name: "Zephaniah", chapters: 3, testament: "OT", aliases: ["zeph", "zep", "zp"] },
  { name: "Haggai", chapters: 2, testament: "OT", aliases: ["hag", "hg"] },
  { name: "Zechariah", chapters: 14, testament: "OT", aliases: ["zech", "zec", "zc"] },
  { name: "Malachi", chapters: 4, testament: "OT", aliases: ["mal", "ml"] },
  { name: "Matthew", chapters: 28, testament: "NT", aliases: ["matt", "mt", "mat"] },
  { name: "Mark", chapters: 16, testament: "NT", aliases: ["mk", "mr", "mrk"] },
  { name: "Luke", chapters: 24, testament: "NT", aliases: ["lk", "luk"] },
  { name: "John", chapters: 21, testament: "NT", aliases: ["jn", "joh"] },
  { name: "Acts", chapters: 28, testament: "NT", aliases: ["ac", "act"] },
  { name: "Romans", chapters: 16, testament: "NT", aliases: ["rom", "ro", "rm"] },
  { name: "1 Corinthians", chapters: 16, testament: "NT", aliases: ["1 cor", "1cor", "1 co"] },
  { name: "2 Corinthians", chapters: 13, testament: "NT", aliases: ["2 cor", "2cor", "2 co"] },
  { name: "Galatians", chapters: 6, testament: "NT", aliases: ["gal", "ga"] },
  { name: "Ephesians", chapters: 6, testament: "NT", aliases: ["eph", "ep"] },
  { name: "Philippians", chapters: 4, testament: "NT", aliases: ["phil", "php", "pp"] },
  { name: "Colossians", chapters: 4, testament: "NT", aliases: ["col", "co"] },
  { name: "1 Thessalonians", chapters: 5, testament: "NT", aliases: ["1 thess", "1 thes", "1 th"] },
  { name: "2 Thessalonians", chapters: 3, testament: "NT", aliases: ["2 thess", "2 thes", "2 th"] },
  { name: "1 Timothy", chapters: 6, testament: "NT", aliases: ["1 tim", "1 ti"] },
  { name: "2 Timothy", chapters: 4, testament: "NT", aliases: ["2 tim", "2 ti"] },
  { name: "Titus", chapters: 3, testament: "NT", aliases: ["tit", "ti"] },
  { name: "Philemon", chapters: 1, testament: "NT", singleChapter: true, aliases: ["philem", "phm", "phile"] },
  { name: "Hebrews", chapters: 13, testament: "NT", aliases: ["heb", "hb"] },
  { name: "James", chapters: 5, testament: "NT", aliases: ["jas", "jm"] },
  { name: "1 Peter", chapters: 5, testament: "NT", aliases: ["1 pet", "1 pe", "1 pt"] },
  { name: "2 Peter", chapters: 3, testament: "NT", aliases: ["2 pet", "2 pe", "2 pt"] },
  { name: "1 John", chapters: 5, testament: "NT", aliases: ["1 jn", "1 joh"] },
  { name: "2 John", chapters: 1, testament: "NT", singleChapter: true, aliases: ["2 jn", "2 joh"] },
  { name: "3 John", chapters: 1, testament: "NT", singleChapter: true, aliases: ["3 jn", "3 joh"] },
  { name: "Jude", chapters: 1, testament: "NT", singleChapter: true, aliases: ["jud", "jd"] },
  { name: "Revelation", chapters: 22, testament: "NT", aliases: ["rev", "re", "rv", "apocalypse"] },
];

const BOOK_BY_NAME = new Map<string, BibleBook>();
const BOOK_BY_ALIAS = new Map<string, BibleBook>();

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Build the lookup tables once.
for (const book of BIBLE_BOOKS) {
  BOOK_BY_NAME.set(normalizeKey(book.name), book);
  for (const alias of book.aliases ?? []) {
    BOOK_BY_ALIAS.set(normalizeKey(alias), book);
  }
}

/**
 * Resolve a user-typed book name (full name or common abbreviation) to its
 * canonical name, or `null` when it does not match any book.
 */
export function normalizeBookName(input: string): string | null {
  let key = normalizeKey(input);
  if (!key) return null;

  // Accept ordinal spellings ("1st Samuel", "first John").
  key = key
    .replace(/^1st\b/, "1")
    .replace(/^2nd\b/, "2")
    .replace(/^3rd\b/, "3")
    .replace(/^first\b/, "1")
    .replace(/^second\b/, "2")
    .replace(/^third\b/, "3");

  const book = BOOK_BY_NAME.get(key) ?? BOOK_BY_ALIAS.get(key);
  return book ? book.name : null;
}

export function getBook(name: string): BibleBook | null {
  const canonical = normalizeBookName(name);
  return canonical ? BOOK_BY_NAME.get(normalizeKey(canonical)) ?? null : null;
}
