import type { ContentType } from "../types";
import type { BiblePassage } from "./bible";

export interface BibleFormState {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  reference: string;
}

export interface OperatorSession {
  editorName: string;
  editorText: string;
  editingId: string | null;
  currentIndex: number;
  blank: boolean;
  mode?: ContentType;
  bibleIndex?: number;
  biblePassage?: BiblePassage | null;
  bibleReference?: string;
  bibleSelectedVerses?: number[];
  bibleForm?: BibleFormState | null;
}

const KEY = "lyrics-projection:operator-session";

function asNumberArray(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const numbers = value.filter(
    (item): item is number => typeof item === "number" && Number.isFinite(item),
  );
  return numbers;
}

export function loadOperatorSession(): OperatorSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OperatorSession>;
    if (typeof parsed.editorText !== "string") return null;
    return {
      editorName: typeof parsed.editorName === "string" ? parsed.editorName : "",
      editorText: parsed.editorText,
      editingId: typeof parsed.editingId === "string" ? parsed.editingId : null,
      currentIndex:
        typeof parsed.currentIndex === "number" ? parsed.currentIndex : 0,
      blank: typeof parsed.blank === "boolean" ? parsed.blank : false,
      mode: parsed.mode === "bible" ? "bible" : "lyrics",
      bibleIndex:
        typeof parsed.bibleIndex === "number" ? parsed.bibleIndex : 0,
      biblePassage:
        parsed.biblePassage && typeof parsed.biblePassage === "object"
          ? parsed.biblePassage
          : null,
      bibleReference:
        typeof parsed.bibleReference === "string"
          ? parsed.bibleReference
          : undefined,
      bibleSelectedVerses: asNumberArray(parsed.bibleSelectedVerses),
      bibleForm:
        parsed.bibleForm && typeof parsed.bibleForm === "object"
          ? parsed.bibleForm
          : null,
    };
  } catch {
    return null;
  }
}

export function saveOperatorSession(session: OperatorSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable - ignore */
  }
}
