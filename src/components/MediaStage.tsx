import { useEffect, useRef, useState } from "react";
import type { MediaProjection } from "../types";
import { mediaStore } from "../lib/mediaStore";
import { postSync } from "../lib/sync";

interface MediaStageProps {
  media: MediaProjection;
}

/**
 * Renders the selected media full-bleed on the projection screen. Contains no
 * controls, captions, filenames or chrome of any kind — for a video only the
 * video content is shown (the browser's native controls are never enabled).
 * The file is read from local storage by id; the operator sends playback
 * state, not the file itself.
 */
export function MediaStage({ media }: MediaStageProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastRestart = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setUrl(null);
    setFailed(false);

    (async () => {
      try {
        const blob = await mediaStore.getBlob(media.id);
        if (cancelled) return;
        if (!blob) {
          setFailed(true);
          postSync({
            type: "media-error",
            id: media.id,
            message: "The selected media is no longer available in local storage.",
          });
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
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
  }, [media.id]);

  // Keep audio settings in sync with the operator.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = media.muted;
    video.volume = Math.min(1, Math.max(0, media.volume));
  }, [media.muted, media.volume, url]);

  // Play / pause as requested by the operator.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (media.playing) {
      void video.play().catch(() => {
        /* autoplay policy may require a gesture in this window */
      });
    } else {
      try {
        video.pause();
      } catch {
        /* ignore */
      }
    }
  }, [media.playing, url]);

  // Restart requests seek to the beginning and resume.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (media.restartToken > lastRestart.current) {
      lastRestart.current = media.restartToken;
      try {
        video.currentTime = 0;
      } catch {
        /* ignore */
      }
      void video.play().catch(() => {
        /* ignore */
      });
    }
  }, [media.restartToken, url]);

  if (failed || !url) {
    return <div style={fill} />;
  }

  if (media.kind === "image") {
    // Images are always projected in full. "contain" scales the picture to fit
    // the whole screen while preserving its aspect ratio, so nothing is ever
    // cropped off (the "cover" mode intentionally crops and is never used for a
    // still image).
    return (
      <img
        src={url}
        alt=""
        draggable={false}
        onError={() => {
          setFailed(true);
          postSync({
            type: "media-error",
            id: media.id,
            message: "This image could not be decoded by the browser.",
          });
        }}
        style={{ ...fill, objectFit: "contain" }}
      />
    );
  }

  return (
    <video
      ref={videoRef}
      src={url}
      playsInline
      onError={() => {
        setFailed(true);
        postSync({
          type: "media-error",
          id: media.id,
          message:
            "This video could not be played by the browser. Try an MP4 (H.264) or WebM file.",
        });
      }}
      style={{ ...fill, objectFit: media.fit }}
    />
  );
}

const fill: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  display: "block",
  background: "#000",
};
