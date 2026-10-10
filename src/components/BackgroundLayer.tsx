import { useEffect, useState } from "react";
import type { ProjectionSettings } from "../types";
import { mediaStore } from "../lib/mediaStore";

interface BackgroundLayerProps {
  settings: ProjectionSettings;
}

const layer: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
};

/**
 * Renders the custom background for lyrics / Bible projection: a base solid
 * color, an optional image from the local media library, and an optional
 * dimming overlay. It is always placed *underneath* the text so the dimming
 * never affects readability. Contains no filenames, labels or controls.
 *
 * Only the media id travels through the sync channel; the picture itself is
 * read from IndexedDB by id and resolved to a short-lived object URL here.
 */
export function BackgroundLayer({ settings }: BackgroundLayerProps) {
  const { background } = settings;
  const isImage = background.type === "image";
  const mediaId = isImage ? background.mediaId : null;

  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!mediaId) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    setUrl(null);

    (async () => {
      try {
        const blob = await mediaStore.getBlob(mediaId);
        if (cancelled || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch {
        /* missing/unavailable image: fall back to the base color */
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          /* ignore */
        }
      }
    };
  }, [mediaId]);

  const baseColor = settings.backgroundColor;
  const color = background.type === "default" ? baseColor : background.color;

  return (
    <div data-testid="bg-layer" style={{ ...layer, backgroundColor: color }}>
      {url && (
        <img
          data-testid="bg-image"
          src={url}
          alt=""
          draggable={false}
          style={{ ...layer, objectFit: background.fit }}
        />
      )}
      {background.dim > 0 && (
        <div
          data-testid="bg-dim"
          style={{ ...layer, backgroundColor: "#000", opacity: background.dim }}
        />
      )}
    </div>
  );
}
