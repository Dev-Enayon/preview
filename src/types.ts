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
export type ContentType = "lyrics" | "bible";

export interface ProjectionSettings {
  /** Base/max font size expressed as a percentage of the stage height. */
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  textAlign: TextAlign;
  verticalAlign: VerticalAlign;
  textColor: string;
  backgroundColor: string;
  lineHeight: number;
  /** When true, shrink text so it always fits the stage. */
  autoFit: boolean;
  /**
   * Whether to prefix Bible verses with their verse number on the projection
   * screen. Disabled by default; has no effect on lyrics.
   */
  showVerseNumbers: boolean;
}

export interface ProjectionState {
  /** Which mode produced this state, so modes never bleed into each other. */
  contentType: ContentType;
  text: string;
  settings: ProjectionSettings;
  /** When true the projection shows a solid blank screen (background only). */
  blank: boolean;
}
