import type { ProjectionSettings } from "../types";

const MIN_FONT_PX = 10;

/**
 * Size the text element so it fits inside its container.
 *
 * When `settings.autoFit` is enabled the largest font size (up to the value
 * requested by the operator) that keeps the text inside the available space is
 * chosen. Otherwise the requested size is used but the container still clips
 * overflow so nothing spills off screen.
 */
export function fitText(
  container: HTMLElement,
  text: HTMLElement,
  settings: ProjectionSettings,
): number {
  const availableHeight = container.clientHeight;
  const availableWidth = container.clientWidth;
  if (availableHeight <= 0 || availableWidth <= 0) return MIN_FONT_PX;

  const maxFontPx = Math.max(
    MIN_FONT_PX,
    (settings.fontSize / 100) * availableHeight,
  );

  const apply = (px: number) => {
    text.style.fontSize = `${px}px`;
  };

  apply(maxFontPx);

  if (!settings.autoFit) return maxFontPx;

  // If it already fits, keep the requested size.
  if (text.scrollHeight <= availableHeight + 1) return maxFontPx;

  // Binary search for the largest size that fits.
  let low = MIN_FONT_PX;
  let high = maxFontPx;
  let best = MIN_FONT_PX;

  for (let i = 0; i < 18 && high - low > 0.5; i++) {
    const mid = (low + high) / 2;
    apply(mid);
    if (text.scrollHeight <= availableHeight + 1) {
      best = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  apply(best);
  return best;
}
