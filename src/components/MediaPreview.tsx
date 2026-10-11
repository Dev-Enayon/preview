import type { MediaFit, MediaItem } from "../types";
import { mediaKindLabel } from "../lib/media";

interface MediaPreviewProps {
  item: MediaItem | null;
  fit: MediaFit;
  blank: boolean;
}

const frame: React.CSSProperties = {
  position: "relative",
  height: "100%",
  width: "100%",
  background: "#000",
  overflow: "hidden",
};

/**
 * Operator-only preview of the selected media. Uses the stored thumbnail so
 * the gallery stays light. The real, full-resolution file is only ever loaded
 * by the projection window.
 */
export function MediaPreview({ item, fit, blank }: MediaPreviewProps) {
  if (!item || blank) {
    return (
      <div
        style={{
          ...frame,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!blank && (
          <span className="text-xs text-slate-500">No media selected</span>
        )}
      </div>
    );
  }

  return (
    <div style={frame}>
      {item.thumbnail ? (
        <img
          src={item.thumbnail}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            // Match the projector: still images are always shown in full.
            objectFit: item.kind === "image" ? "contain" : fit,
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
          {mediaKindLabel(item.kind)} selected — {item.name}
        </div>
      )}
    </div>
  );
}
