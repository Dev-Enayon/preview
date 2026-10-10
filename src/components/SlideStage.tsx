import { useEffect, useLayoutEffect, useRef } from "react";
import type { ProjectionSettings } from "../types";
import { fitText } from "../lib/autofit";

interface SlideStageProps {
  text: string;
  settings: ProjectionSettings;
  /** Space between the stage edge and the text, as a CSS inset value. */
  inset?: string;
  /** Base font size (px) used when the stage is too small to measure. */
  className?: string;
  /**
   * When true the stage paints no background of its own so a separate
   * `BackgroundLayer` (color / image / dimming) shows through beneath the text.
   */
  transparentBackground?: boolean;
}

/**
 * Renders a single slide with the projection styling and auto-fits the text.
 * Used both by the operator preview and by the live projection window so the
 * two always look identical.
 */
export function SlideStage({
  text,
  settings,
  inset = "4% 5%",
  className,
  transparentBackground = false,
}: SlideStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;
    fitText(container, textEl, settings);
  }, [text, settings]);

  useEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;
    const observer = new ResizeObserver(() => {
      fitText(container, textEl, settings);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [settings]);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        height: "100%",
        width: "100%",
        backgroundColor: transparentBackground
          ? "transparent"
          : settings.backgroundColor,
        overflow: "hidden",
      }}
    >
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          inset,
          display: "flex",
          alignItems: settings.verticalAlign,
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <div
          ref={textRef}
          style={{
            width: "100%",
            margin: 0,
            whiteSpace: "pre-wrap",
            overflowWrap: "break-word",
            wordBreak: "normal",
            textAlign: settings.textAlign,
            color: settings.textColor,
            fontFamily: settings.fontFamily,
            fontWeight: settings.fontWeight,
            lineHeight: settings.lineHeight,
            fontSize: `${settings.fontSize}vh`,
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}
