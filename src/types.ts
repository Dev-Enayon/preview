export interface Song {
  id: string;
  name: string;
  lyrics: string;
  createdAt: number;
  updatedAt: number;
}

export type TextAlign = "center" | "left";
export type VerticalAlign = "flex-start" | "center" | "flex-end";

/** What kind of content is currently being projected. */
export type ContentType = "lyrics" | "bible" | "media";

/** A locally stored image or video. */
export type MediaKind = "image" | "video";

/** How a projected image or video is fitted to the projection area. */
export type MediaFit = "contain" | "cover";

/**
 * Metadata for a media item stored in the local library. The file itself is
 * kept separately as a Blob (IndexedDB) so large videos never have to be
 * serialised through BroadcastChannel or localStorage.
 */
export interface MediaItem {
  id: string;
  name: string;
  kind: MediaKind;
  mimeType: string;
  size: number;
  /** Epoch ms when the file was added to the library. */
  addedAt: number;
  /** Natural pixel dimensions, when the browser could determine them. */
  width?: number;
  height?: number;
  /** Duration in seconds for videos, when known. */
  duration?: number;
  /** Small data-URL preview used by the operator gallery (never projected). */
  thumbnail?: string;
}

/** The media reference carried in the projection state (never the file). */
export interface MediaProjection {
  id: string;
  kind: MediaKind;
  fit: MediaFit;
  muted: boolean;
  /** 0..1 */
  volume: number;
  /** Whether the operator expects the video to be playing. */
  playing: boolean;
  /** Bumped by the operator to request a restart (seek to 0 and play). */
  restartToken: number;
}

/**
 * Which background the lyrics / Bible projection is drawn on.
 * - "default": the app's original solid background (`backgroundColor`).
 * - "color":   a solid color chosen by the operator.
 * - "image":   a picture from the local media library.
 */
export type BackgroundType = "default" | "color" | "image";

/**
 * Background configuration for lyrics and Bible projection. Kept inside the
 * projection settings so it is synchronized to the projection window and
 * persisted with the rest of the appearance settings automatically.
 *
 * Only a lightweight media *identifier* is stored here — never image bytes.
 */
export interface BackgroundConfig {
  type: BackgroundType;
  /** Solid color for the "color" type, and the fill behind "contain" images. */
  color: string;
  /** Local media library id of the background image (null when unset). */
  mediaId: string | null;
  /** How an image background fills the screen. */
  fit: MediaFit;
  /** Dimming opacity applied over the background only, 0..0.8. */
  dim: number;
}

export interface ProjectionSettings {
  /** Base/max font size expressed as a percentage of the stage height. */
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  textAlign: TextAlign;
  verticalAlign: VerticalAlign;
  textColor: string;
  /** Solid background used by the original "default" background type. */
  backgroundColor: string;
  lineHeight: number;
  /** When true, shrink text so it always fits the stage. */
  autoFit: boolean;
  /**
   * Whether to prefix Bible verses with their verse number on the projection
   * screen. Disabled by default; has no effect on lyrics.
   */
  showVerseNumbers: boolean;
  /** Custom background for lyrics / Bible projection. */
  background: BackgroundConfig;
}

export interface ProjectionState {
  /** Which mode produced this state, so modes never bleed into each other. */
  contentType: ContentType;
  text: string;
  settings: ProjectionSettings;
  /** When true the projection shows a solid blank screen (background only). */
  blank: boolean;
  /**
   * Present only when `contentType` is "media". Carries a reference to the
   * locally stored file (by id) plus playback state, never the file itself.
   */
  media?: MediaProjection | null;
}
