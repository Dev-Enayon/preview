import type { ProjectionSettings } from "../types";

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
};

export interface BackgroundPreset {
  id: string;
  label: string;
  backgroundColor: string;
  textColor: string;
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: "black-white",
    label: "Black / White",
    backgroundColor: "#000000",
    textColor: "#ffffff",
  },
  {
    id: "white-black",
    label: "White / Black",
    backgroundColor: "#ffffff",
    textColor: "#111111",
  },
  {
    id: "blue-white",
    label: "Dark Blue / White",
    backgroundColor: "#0b1f3a",
    textColor: "#ffffff",
  },
];

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
    return { ...DEFAULT_SETTINGS, ...parsed };
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
