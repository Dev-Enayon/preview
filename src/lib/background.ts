import type { BackgroundConfig, ProjectionSettings } from "../types";

/** The app's original background: a plain solid color. */
export const DEFAULT_BACKGROUND: BackgroundConfig = {
  type: "default",
  color: "#000000",
  mediaId: null,
  fit: "cover",
  dim: 0,
};

/** Maximum dimming the operator can apply over the background (80%). */
export const MAX_BACKGROUND_DIM = 0.8;

export interface ColorPreset {
  label: string;
  value: string;
}

/**
 * Solid-color presets offered for backgrounds. The final entry is a dark,
 * near-transparent-looking gray represented as a real solid color (browsers
 * cannot use transparency for a projected background).
 */
export const BACKGROUND_COLOR_PRESETS: ColorPreset[] = [
  { label: "Black", value: "#000000" },
  { label: "White", value: "#ffffff" },
  { label: "Navy", value: "#0a2540" },
  { label: "Dark blue", value: "#0052ff" },
  { label: "Dark green", value: "#0b3d2e" },
  { label: "Purple", value: "#2e1065" },
  { label: "Dark gray", value: "#1f2937" },
];

/** Quick text-color choices kept alongside the background (with a custom option). */
export const TEXT_COLOR_PRESETS: ColorPreset[] = [
  { label: "White", value: "#ffffff" },
  { label: "Black", value: "#000000" },
];

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** True when `value` is a valid `#rgb` or `#rrggbb` hex color. */
export function isValidHexColor(value: string): boolean {
  return HEX_RE.test(value.trim());
}

/**
 * Normalise a hex color to lower-case `#rrggbb`, expanding shorthand
 * (`#abc` → `#aabbcc`). Returns null when the value is not a valid hex color.
 */
export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  if (!HEX_RE.test(trimmed)) return null;
  let hex = trimmed.slice(1).toLowerCase();
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }
  return `#${hex}`;
}

/** Clamp a dimming value into the allowed range. */
export function clampDim(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_BACKGROUND_DIM, Math.max(0, value));
}

/** The base solid color painted behind the active background. */
export function backgroundBaseColor(settings: ProjectionSettings): string {
  return settings.background.type === "default"
    ? settings.backgroundColor
    : settings.background.color;
}

/** True when the active background is a picture from the media library. */
export function isImageBackground(settings: ProjectionSettings): boolean {
  return settings.background.type === "image";
}

/** A short human label for the currently selected background. */
export function describeBackground(
  config: BackgroundConfig,
  imageName?: string | null,
): string {
  switch (config.type) {
    case "color":
      return `Solid ${config.color.toUpperCase()}`;
    case "image":
      return imageName ? `Image · ${imageName}` : "Image (none selected)";
    default:
      return "Default";
  }
}
