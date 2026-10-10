import type { ProjectionSettings } from "../types";
import { DEFAULT_BACKGROUND } from "./background";

export const DEFAULT_SETTINGS: ProjectionSettings = {
  fontSize: 9,
  fontFamily:
    "Inter, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  fontWeight: 600,
  textAlign: "center",
  verticalAlign: "center",
  textColor: "#ffffff",
  backgroundColor: "#000000",
  lineHeight: 1.25,
  autoFit: true,
  showVerseNumbers: false,
  background: { ...DEFAULT_BACKGROUND },
};

/**
 * Settings the "Reset text & layout" control restores. Background and text
 * color are owned by the Background panel so resetting layout never surprises
 * the operator by changing the live background mid-service.
 */
export const DEFAULT_TEXT_SETTINGS: Pick<
  ProjectionSettings,
  | "fontSize"
  | "fontFamily"
  | "fontWeight"
  | "textAlign"
  | "verticalAlign"
  | "lineHeight"
  | "autoFit"
  | "showVerseNumbers"
> = {
  fontSize: DEFAULT_SETTINGS.fontSize,
  fontFamily: DEFAULT_SETTINGS.fontFamily,
  fontWeight: DEFAULT_SETTINGS.fontWeight,
  textAlign: DEFAULT_SETTINGS.textAlign,
  verticalAlign: DEFAULT_SETTINGS.verticalAlign,
  lineHeight: DEFAULT_SETTINGS.lineHeight,
  autoFit: DEFAULT_SETTINGS.autoFit,
  showVerseNumbers: DEFAULT_SETTINGS.showVerseNumbers,
};

export const FONT_FAMILIES: { label: string; value: string }[] = [
  {
    label: "Inter / System Sans",
    value: "Inter, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Georgia (Serif)", value: "Georgia, 'Times New Roman', serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Courier New", value: "'Courier New', Courier, monospace" },
];

const SETTINGS_KEY = "lyrics-projection:settings";

export function loadSettings(): ProjectionSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<ProjectionSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      // `background` is nested, so merge it explicitly to avoid losing fields
      // when an older, partial value is read from storage.
      background: {
        ...DEFAULT_BACKGROUND,
        ...(parsed.background ?? {}),
      },
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: ProjectionSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable - ignore */
  }
}
