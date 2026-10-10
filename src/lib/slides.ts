/**
 * Split raw lyrics into slides.
 *
 * Slides are separated by one or more blank lines. A line containing only
 * three or more dashes ("---") is also treated as an explicit break, which
 * makes it convenient to paste lyrics that already use rule separators.
 * Line breaks *inside* a slide are preserved.
 */
export function splitLyrics(lyrics: string): string[] {
  const normalized = lyrics.replace(/\r\n?/g, "\n");

  const withoutRules = normalized.replace(/^[ \t]*[-–—]{3,}[ \t]*$/gm, "");

  // A slide separator is one or more blank lines. A "blank line" may contain
  // spaces or tabs, so `a\n   \n\t\nb` still separates into two slides.
  return withoutRules
    .split(/\n[ \t]*\n(?:[ \t]*\n)*/)
    .map((chunk) => chunk.replace(/[ \t]+$/gm, ""))
    .filter((chunk) => chunk.trim().length > 0);
}

export function clampSlideIndex(index: number, slideCount: number): number {
  if (slideCount <= 0) return 0;
  if (index < 0) return 0;
  if (index > slideCount - 1) return slideCount - 1;
  return index;
}
