import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { NavAction, SyncMessage } from "../lib/sync";
import {
  initSync,
  persistProjectionState,
  postSync,
  PROJECTION_HASH,
} from "../lib/sync";
import { clampSlideIndex, splitLyrics } from "../lib/slides";
import {
  estimateMaxCharsPerSlide,
  renderSlideText,
  splitPassage,
} from "../lib/bible";
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "../lib/settings";
import {
  loadOperatorSession,
  saveOperatorSession,
} from "../lib/session";
import type {
  ContentType,
  MediaFit,
  MediaItem,
  ProjectionSettings,
  ProjectionState,
  Song,
} from "../types";
import { useSongs } from "../hooks/useSongs";
import { useBible } from "../hooks/useBible";
import { useMedia } from "../hooks/useMedia";
import { SlideStage } from "./SlideStage";
import { BackgroundLayer } from "./BackgroundLayer";
import { BackgroundPanel } from "./BackgroundPanel";
import { SettingsPanel } from "./SettingsPanel";
import { BiblePanel } from "./BiblePanel";
import { MediaPanel } from "./MediaPanel";
import { MediaToolbar } from "./MediaToolbar";
import { MediaPreview } from "./MediaPreview";

interface ScreenLike {
  availLeft: number;
  availTop: number;
  availWidth: number;
  availHeight: number;
}
interface ScreenDetailsLike {
  currentScreen: ScreenLike;
  screens: ScreenLike[];
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// What the projector shows until the operator explicitly goes live. It is a
// plain black screen so staged edits (slides, verses, media) never leak before
// the "Project" button is pressed.
const IDLE_STATE: ProjectionState = {
  contentType: "lyrics",
  text: "",
  settings: DEFAULT_SETTINGS,
  blank: true,
  media: null,
};

export function Operator() {
  const [initialSession] = useState(loadOperatorSession);
  const [mode, setMode] = useState<ContentType>(
    initialSession?.mode ?? "lyrics",
  );
  const [editorName, setEditorName] = useState(
    initialSession?.editorName ?? "",
  );
  const [editorText, setEditorText] = useState(
    initialSession?.editorText ?? "",
  );
  const [editingId, setEditingId] = useState<string | null>(
    initialSession?.editingId ?? null,
  );
  const [search, setSearch] = useState("");
  const [settings, setSettings] = useState<ProjectionSettings>(() =>
    loadSettings(),
  );
  const [currentIndex, setCurrentIndex] = useState(
    initialSession?.currentIndex ?? 0,
  );
  const [bibleIndex, setBibleIndex] = useState(
    initialSession?.bibleIndex ?? 0,
  );
  const [isProjecting, setIsProjecting] = useState(false);
  const [live, setLive] = useState(false);
  const [blank, setBlank] = useState(initialSession?.blank ?? false);
  const [status, setStatus] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [mediaId, setMediaId] = useState<string | null>(
    initialSession?.mediaId ?? null,
  );
  const [mediaFit, setMediaFit] = useState<MediaFit>(
    initialSession?.mediaFit ?? "contain",
  );
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoMuted, setVideoMuted] = useState(
    initialSession?.mediaMuted ?? false,
  );
  const [videoVolume, setVideoVolume] = useState(
    initialSession?.mediaVolume ?? 1,
  );
  const [videoRestartToken, setVideoRestartToken] = useState(0);

  const { songs, loading, error, save, remove, setError } = useSongs();
  const media = useMedia();
  const mediaItems = media.items;

  const bible = useBible({
    form: initialSession?.bibleForm ?? null,
    passage: initialSession?.biblePassage ?? null,
    reference: initialSession?.bibleReference,
    selectedVerses: initialSession?.bibleSelectedVerses,
  });

  const projectionWindowRef = useRef<Window | null>(null);

  const lyricsSlides = useMemo(() => splitLyrics(editorText), [editorText]);

  const maxChars = useMemo(
    () => estimateMaxCharsPerSlide(settings.fontSize),
    [settings.fontSize],
  );

  const bibleSlides = useMemo(() => {
    if (!bible.passage) return [];
    const selected = new Set(bible.selectedVerses);
    const verses = bible.passage.verses.filter((v) => selected.has(v.verse));
    return splitPassage(verses, maxChars);
  }, [bible.passage, bible.selectedVerses, maxChars]);

  // The slides that are actually live for the current mode. Keeping this
  // derived from `mode` guarantees lyrics never overwrite a Bible passage (or
  // vice-versa) when switching modes.
  const activeSlides = useMemo(() => {
    if (mode === "bible") {
      return bibleSlides.map((slide) =>
        renderSlideText(slide, settings.showVerseNumbers),
      );
    }
    if (mode === "media") return [];
    return lyricsSlides;
  }, [mode, bibleSlides, settings.showVerseNumbers, lyricsSlides]);

  const activeIndex = mode === "bible" ? bibleIndex : currentIndex;
  const activeText = activeSlides[activeIndex] ?? "";

  const selectedMedia = useMemo(
    () => mediaItems.find((item) => item.id === mediaId) ?? null,
    [mediaItems, mediaId],
  );
  const mediaCount = mediaItems.length;
  const mediaPosition = useMemo(
    () => mediaItems.findIndex((item) => item.id === mediaId),
    [mediaItems, mediaId],
  );

  const activeSlidesRef = useRef(activeSlides);
  activeSlidesRef.current = activeSlides;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const mediaItemsRef = useRef(mediaItems);
  mediaItemsRef.current = mediaItems;
  const selectedMediaRef = useRef(selectedMedia);
  selectedMediaRef.current = selectedMedia;

  const setActiveIndex = useCallback((index: number) => {
    if (modeRef.current === "bible") setBibleIndex(index);
    else setCurrentIndex(index);
  }, []);

  const projectionState: ProjectionState = useMemo(() => {
    if (mode === "media") {
      return {
        contentType: "media",
        text: "",
        settings,
        blank,
        media: selectedMedia
          ? {
              id: selectedMedia.id,
              kind: selectedMedia.kind,
              fit: mediaFit,
              muted: videoMuted,
              volume: videoVolume,
              playing:
                selectedMedia.kind === "video" ? videoPlaying : false,
              restartToken: videoRestartToken,
            }
          : null,
      };
    }
    return {
      contentType: mode,
      text: activeText,
      settings,
      blank,
      media: null,
    };
  }, [
    mode,
    selectedMedia,
    mediaFit,
    videoMuted,
    videoVolume,
    videoPlaying,
    videoRestartToken,
    activeText,
    settings,
    blank,
  ]);
  // Until the operator goes live, the projector only ever receives the idle
  // screen; once live, every staged change is sent immediately.
  const broadcastState = live ? projectionState : IDLE_STATE;
  const broadcastStateRef = useRef(broadcastState);
  broadcastStateRef.current = broadcastState;

  const selectMedia = useCallback((id: string | null) => {
    setMediaId(id);
    setVideoPlaying(false);
  }, []);

  const moveMedia = useCallback((action: NavAction) => {
    const items = mediaItemsRef.current;
    if (items.length === 0) return;
    setMediaId((prev) => {
      const current = items.findIndex((item) => item.id === prev);
      let next = current;
      switch (action) {
        case "next":
          next = current < 0 ? 0 : Math.min(current + 1, items.length - 1);
          break;
        case "prev":
          next = current < 0 ? items.length - 1 : Math.max(current - 1, 0);
          break;
        case "first":
          next = 0;
          break;
        case "last":
          next = items.length - 1;
          break;
        default:
          next = current;
      }
      return items[next]?.id ?? prev;
    });
    setVideoPlaying(false);
  }, []);

  const navigate = useCallback(
    (action: NavAction) => {
      if (modeRef.current === "media") {
        moveMedia(action);
        return;
      }
      const count = activeSlidesRef.current.length;
      const setter =
        modeRef.current === "bible" ? setBibleIndex : setCurrentIndex;
      setter((prev) => {
        if (count === 0) return 0;
        switch (action) {
          case "next":
            return Math.min(prev + 1, count - 1);
          case "prev":
            return Math.max(prev - 1, 0);
          case "first":
            return 0;
          case "last":
            return count - 1;
          default:
            return prev;
        }
      });
    },
    [moveMedia],
  );

  // Keep each mode's index valid as its slides change.
  useEffect(() => {
    setCurrentIndex((prev) => clampSlideIndex(prev, lyricsSlides.length));
  }, [lyricsSlides.length]);

  useEffect(() => {
    setBibleIndex((prev) => clampSlideIndex(prev, bibleSlides.length));
  }, [bibleSlides.length]);

  // Persist the operator session so a refresh restores the current work
  // (lyrics and Bible alike) without ever blanking a live projection screen.
  useEffect(() => {
    saveOperatorSession({
      editorName,
      editorText,
      editingId,
      currentIndex,
      blank,
      mode,
      bibleIndex,
      biblePassage: bible.passage,
      bibleReference: bible.reference,
      bibleSelectedVerses: bible.selectedVerses,
      bibleForm: bible.form,
      mediaId,
      mediaFit,
      mediaMuted: videoMuted,
      mediaVolume: videoVolume,
    });
  }, [
    editorName,
    editorText,
    editingId,
    currentIndex,
    blank,
    mode,
    bibleIndex,
    bible.passage,
    bible.reference,
    bible.selectedVerses,
    bible.form,
    mediaId,
    mediaFit,
    videoMuted,
    videoVolume,
  ]);

  // Persist settings whenever they change.
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Broadcast + persist the projection state on every relevant change. While
  // not live this is the idle screen, so staging never reaches the audience.
  useEffect(() => {
    persistProjectionState(broadcastState);
    postSync({ type: "projection-state", state: broadcastState });
  }, [broadcastState]);

  // Receive navigation / state requests from the projection window.
  useEffect(() => {
    const unsubscribe = initSync((message: SyncMessage) => {
      if (message.type === "request-state") {
        postSync({
          type: "projection-state",
          state: broadcastStateRef.current,
        });
      } else if (message.type === "nav") {
        navigate(message.action);
      } else if (message.type === "media-error") {
        setError(message.message);
      }
    });
    return unsubscribe;
  }, [navigate, setError]);

  // Detect when the projection window is closed by the user.
  useEffect(() => {
    if (!isProjecting) return;
    const id = window.setInterval(() => {
      if (!projectionWindowRef.current || projectionWindowRef.current.closed) {
        setIsProjecting(false);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [isProjecting]);

  // Open the window synchronously (inside the click gesture) so popup
  // blockers do not reject it, then place it on the best screen after the
  // Window Management permission resolves.
  const placeProjectionWindow = useCallback(async (win: Window) => {
    try {
      const anyWindow = window as unknown as {
        getScreenDetails?: () => Promise<ScreenDetailsLike>;
      };
      if (typeof anyWindow.getScreenDetails !== "function") return;
      const details = await anyWindow.getScreenDetails();
      const target =
        details.screens.find((s) => s !== details.currentScreen) ??
        details.currentScreen;
      win.moveTo(target.availLeft, target.availTop);
      win.resizeTo(target.availWidth, target.availHeight);
    } catch {
      /* permission denied or unsupported - keep the default placement */
    }
  }, []);

  const startProjection = useCallback(() => {
    setError(null);
    try {
      let win = projectionWindowRef.current;
      if (!win || win.closed) {
        const url = new URL(window.location.href);
        url.hash = PROJECTION_HASH;
        win = window.open(
          url.toString(),
          "lyrics-projection",
          "popup=yes,left=96,top=96,width=1280,height=800",
        );
        projectionWindowRef.current = win;
        if (win) void placeProjectionWindow(win);
      } else {
        win.focus();
      }
      if (!win) {
        setError(
          "Could not open the projection window. Please allow pop-ups for this site and try again.",
        );
        return false;
      }
      setIsProjecting(true);
      setBlank(false);
      postSync({ type: "projection-state", state: broadcastStateRef.current });
      window.setTimeout(
        () => postSync({ type: "fullscreen", action: "enter" }),
        500,
      );
      return true;
    } catch {
      setError("Could not open the projection window.");
      return false;
    }
  }, [placeProjectionWindow, setError]);

  // Go live: make sure the projection window exists, then push the staged
  // content to the audience. From here on every edit is broadcast immediately,
  // so Project is only needed to go live the first time.
  const projectLive = useCallback(() => {
    setError(null);
    let ready = true;
    const win = projectionWindowRef.current;
    if (!win || win.closed) {
      ready = startProjection();
    } else {
      win.focus();
    }
    if (ready) setLive(true);
  }, [startProjection, setError]);

  const stopProjection = useCallback(() => {
    const win = projectionWindowRef.current;
    postSync({ type: "fullscreen", action: "exit" });
    if (win && !win.closed) win.close();
    projectionWindowRef.current = null;
    setIsProjecting(false);
    setLive(false);
    setStatus("Projection stopped. Nothing was deleted.");
    window.setTimeout(() => setStatus(null), 3000);
  }, []);

  // Drop a selected media reference that no longer exists in the library
  // (e.g. after deleting it, or when it was removed in another tab).
  useEffect(() => {
    if (
      mediaId &&
      !media.loading &&
      !mediaItems.some((item) => item.id === mediaId)
    ) {
      setMediaId(null);
      setVideoPlaying(false);
    }
  }, [mediaId, media.loading, mediaItems]);

  const projectMedia = useCallback(
    (id?: string) => {
      const target = id ?? mediaId;
      if (!target) {
        setError("Select a media item to project first.");
        return;
      }
      if (id && id !== mediaId) selectMedia(id);
      projectLive();
    },
    [mediaId, selectMedia, projectLive, setError],
  );

  const handleDeleteMedia = useCallback(
    async (item: MediaItem) => {
      if (
        !window.confirm(
          `Delete “${item.name}” from the media library? This cannot be undone.`,
        )
      ) {
        return;
      }
      await media.remove(item.id);
      if (mediaId === item.id) selectMedia(null);
      setStatus(`Deleted “${item.name}” from the media library.`);
      window.setTimeout(() => setStatus(null), 3000);
    },
    [media, mediaId, selectMedia],
  );

  const playVideo = useCallback(() => setVideoPlaying(true), []);
  const pauseVideo = useCallback(() => setVideoPlaying(false), []);
  const restartVideo = useCallback(() => {
    setVideoPlaying(true);
    setVideoRestartToken((token) => token + 1);
  }, []);
  const toggleMute = useCallback(() => setVideoMuted((m) => !m), []);
  const changeVolume = useCallback(
    (value: number) => setVideoVolume(Math.min(1, Math.max(0, value))),
    [],
  );

  // Keyboard shortcuts (ignored while typing in a field).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      switch (event.key) {
        case " ":
          event.preventDefault();
          if (
            modeRef.current === "media" &&
            selectedMediaRef.current?.kind === "video"
          ) {
            setVideoPlaying((prev) => !prev);
          } else {
            navigate("next");
          }
          break;
        case "ArrowRight":
          event.preventDefault();
          navigate("next");
          break;
        case "ArrowLeft":
          event.preventDefault();
          navigate("prev");
          break;
        case "Home":
          event.preventDefault();
          navigate("first");
          break;
        case "End":
          event.preventDefault();
          navigate("last");
          break;
        case "f":
        case "F":
          event.preventDefault();
          postSync({ type: "fullscreen", action: "toggle" });
          break;
        case "Escape":
          postSync({ type: "fullscreen", action: "exit" });
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  const switchMode = useCallback(
    (next: ContentType) => {
      setMode(next);
      setError(null);
    },
    [setError],
  );

  const patchSettings = useCallback((patch: Partial<ProjectionSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  // Restore the original default background and default text styling without
  // touching saved songs, Bible content or uploaded media.
  const resetBackground = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      textColor: DEFAULT_SETTINGS.textColor,
      background: { ...DEFAULT_SETTINGS.background },
    }));
  }, []);

  const notify = useCallback((message: string) => {
    setStatus(message);
    window.setTimeout(() => setStatus(null), 3000);
  }, []);

  const loadSong = useCallback((song: Song) => {
    setEditorName(song.name);
    setEditorText(song.lyrics);
    setEditingId(song.id);
    setCurrentIndex(0);
    setError(null);
  }, [setError]);

  const clearEditor = useCallback(() => {
    setEditorName("");
    setEditorText("");
    setEditingId(null);
    setCurrentIndex(0);
  }, []);

  const handleSave = useCallback(async () => {
    if (!editorText.trim()) {
      setError("Add some lyrics before saving.");
      return;
    }
    try {
      const song = await save(editorName, editorText, editingId ?? undefined);
      setEditingId(song.id);
      setEditorName(song.name);
      setStatus(`Saved “${song.name}”.`);
      window.setTimeout(() => setStatus(null), 3000);
    } catch {
      setError("Could not save lyrics.");
    }
  }, [editorName, editorText, editingId, save, setError]);

  const handleSaveAsNew = useCallback(async () => {
    if (!editorText.trim()) {
      setError("Add some lyrics before saving.");
      return;
    }
    try {
      const song = await save(editorName, editorText);
      setEditingId(song.id);
      setEditorName(song.name);
      setStatus(`Saved “${song.name}” as a new song.`);
      window.setTimeout(() => setStatus(null), 3000);
    } catch {
      setError("Could not save lyrics.");
    }
  }, [editorName, editorText, save, setError]);

  const handleDelete = useCallback(
    async (song: Song) => {
      if (!window.confirm(`Delete “${song.name}”? This cannot be undone.`)) {
        return;
      }
      await remove(song.id);
      if (editingId === song.id) {
        setEditingId(null);
      }
      setStatus(`Deleted “${song.name}”.`);
      window.setTimeout(() => setStatus(null), 3000);
    },
    [editingId, remove],
  );

  const commitRename = useCallback(
    async (song: Song) => {
      const nextName = renameValue.trim();
      if (nextName && nextName !== song.name) {
        await save(nextName, song.lyrics, song.id);
      }
      setRenameId(null);
      setRenameValue("");
    },
    [renameValue, save],
  );

  const filteredSongs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return songs;
    return songs.filter(
      (song) =>
        song.name.toLowerCase().includes(query) ||
        song.lyrics.toLowerCase().includes(query),
    );
  }, [songs, search]);

  const message = error ?? status;
  const slideTotal = activeSlides.length;

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/80 px-4 py-3">
        <div className="flex items-center gap-3">
          <img
            src="./logo.png"
            alt="Media Presenter logo"
            className="h-10 w-10 rounded-lg"
          />
          <div>
            <h1 className="text-lg font-semibold text-white">
              Media Presenter
            </h1>
            <p className="text-xs text-slate-400">
              Lyrics, Bible &amp; media — only the current item reaches the
              projector.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Projection mode"
            className="flex rounded-md border border-slate-700 p-0.5"
          >
            <button
              type="button"
              onClick={() => switchMode("lyrics")}
              aria-pressed={mode === "lyrics"}
              className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                mode === "lyrics"
                  ? "bg-sky-600 text-white"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Lyrics
            </button>
            <button
              type="button"
              onClick={() => switchMode("bible")}
              aria-pressed={mode === "bible"}
              className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                mode === "bible"
                  ? "bg-sky-600 text-white"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Bible
            </button>
            <button
              type="button"
              onClick={() => switchMode("media")}
              aria-pressed={mode === "media"}
              className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                mode === "media"
                  ? "bg-sky-600 text-white"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Media
            </button>
          </div>
          {live && (
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400">
              Projecting
            </span>
          )}
          <button
            type="button"
            onClick={() => setBlank((v) => !v)}
            className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-sky-500"
          >
            {blank ? "Show content" : "Blank screen"}
          </button>
          <button
            type="button"
            onClick={projectLive}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Project
          </button>
          <button
            type="button"
            onClick={startProjection}
            className="rounded-md border border-sky-500/60 px-4 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/10"
          >
            Start Projection
          </button>
          <button
            type="button"
            onClick={stopProjection}
            className="rounded-md border border-rose-500/60 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10"
          >
            Stop Projection
          </button>
        </div>
      </header>

      {message && (
        <div
          className={`border-b px-4 py-2 text-sm ${
            error
              ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {message}
        </div>
      )}

      <main className="grid flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(260px,320px)]">
        {/* Left: lyrics editor + library, or the Bible search panel */}
        {mode === "lyrics" ? (
          <div className="flex min-h-0 flex-col gap-4">
            <section className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                  Lyrics editor
                </h2>
                {editingId && (
                  <span className="text-xs text-sky-400">
                    Editing saved song
                  </span>
                )}
              </div>
              <input
                value={editorName}
                onChange={(e) => setEditorName(e.target.value)}
                placeholder="Song name (for your library only)"
                className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
              />
              <textarea
                value={editorText}
                onChange={(e) => setEditorText(e.target.value)}
                placeholder={
                  "Type or paste lyrics here.\n\nLeave a blank line between sections to create a new slide."
                }
                spellCheck={false}
                className="h-56 w-full resize-y rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 font-mono text-sm leading-relaxed text-slate-100 outline-none focus:border-sky-500"
              />
              <p className="text-xs text-slate-500">
                A blank line separates slides. {lyricsSlides.length} slide
                {lyricsSlides.length === 1 ? "" : "s"} detected.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
                >
                  {editingId ? "Save changes" : "Save lyrics"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={handleSaveAsNew}
                    className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-sky-500"
                  >
                    Save as new
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearEditor}
                  className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-sky-500"
                >
                  Clear
                </button>
              </div>
            </section>

            <section className="flex min-h-0 flex-1 flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Saved lyrics
              </h2>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search saved lyrics…"
                className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
              />
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {loading && <p className="text-sm text-slate-500">Loading…</p>}
                {!loading && filteredSongs.length === 0 && (
                  <p className="text-sm text-slate-500">
                    {songs.length === 0
                      ? "No saved lyrics yet."
                      : "No matches found."}
                  </p>
                )}
                {filteredSongs.map((song) => (
                  <div
                    key={song.id}
                    className="rounded-lg border border-slate-800 bg-slate-950/50 p-2"
                  >
                    {renameId === song.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void commitRename(song);
                            if (e.key === "Escape") setRenameId(null);
                          }}
                          className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 outline-none focus:border-sky-500"
                        />
                        <button
                          type="button"
                          onClick={() => void commitRename(song)}
                          className="rounded px-2 py-1 text-xs text-sky-400 hover:text-sky-300"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-100">
                            {song.name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {dateFormatter.format(song.updatedAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => loadSong(song)}
                            className="rounded px-2 py-1 text-xs text-sky-400 hover:text-sky-300"
                          >
                            Load
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRenameId(song.id);
                              setRenameValue(song.name);
                            }}
                            className="rounded px-2 py-1 text-xs text-slate-300 hover:text-white"
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(song)}
                            className="rounded px-2 py-1 text-xs text-rose-400 hover:text-rose-300"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : mode === "bible" ? (
          <BiblePanel bible={bible} />
        ) : (
          <MediaPanel
            media={media}
            selectedId={mediaId}
            isProjectingSelected={isProjecting && mode === "media"}
            onSelect={selectMedia}
            onProject={(id) => projectMedia(id)}
            onDelete={handleDeleteMedia}
          />
        )}

        {/* Center: preview + slides */}
        <div className="flex min-h-0 flex-col gap-4">
          <section className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Live preview
              </h2>
              <span className="text-xs text-slate-500">
                {mode === "bible"
                  ? "Bible mode"
                  : mode === "media"
                    ? "Media mode"
                    : "Lyrics mode"}
              </span>
            </div>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-slate-700">
              {mode === "media" ? (
                <MediaPreview
                  item={selectedMedia}
                  fit={mediaFit}
                  blank={blank}
                />
              ) : (
                <>
                  <BackgroundLayer settings={settings} />
                  <div className="absolute inset-0">
                    <SlideStage
                      text={blank ? "" : activeText}
                      settings={settings}
                      inset="6% 7%"
                      transparentBackground
                    />
                  </div>
                </>
              )}
            </div>
            {mode !== "media" && (
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => navigate("prev")}
                  className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-sky-500 disabled:opacity-40"
                  disabled={activeIndex <= 0 || slideTotal === 0}
                >
                  ◀ Prev
                </button>
                <span className="text-sm text-slate-400">
                  {slideTotal === 0
                    ? "No slides"
                    : `Slide ${activeIndex + 1} of ${slideTotal}`}
                </span>
                <button
                  type="button"
                  onClick={() => navigate("next")}
                  className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-sky-500 disabled:opacity-40"
                  disabled={slideTotal === 0 || activeIndex >= slideTotal - 1}
                >
                  Next ▶
                </button>
              </div>
            )}
          </section>

          {mode === "media" ? (
            <MediaToolbar
              hasSelection={!!selectedMedia}
              selectedKind={selectedMedia?.kind ?? null}
              fit={mediaFit}
              onFit={setMediaFit}
              canPrev={mediaPosition > 0}
              canNext={
                mediaPosition >= 0 && mediaPosition < mediaCount - 1
              }
              onPrev={() => navigate("prev")}
              onNext={() => navigate("next")}
              onProject={() => projectMedia()}
              onUpload={() =>
                document.getElementById("media-library-dropzone")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              onOpenLibrary={() =>
                document.getElementById("media-library-dropzone")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              onDelete={() => {
                if (selectedMedia) void handleDeleteMedia(selectedMedia);
              }}
              video={{
                playing: videoPlaying,
                muted: videoMuted,
                volume: videoVolume,
              }}
              onPlay={playVideo}
              onPause={pauseVideo}
              onRestart={restartVideo}
              onToggleMute={toggleMute}
              onVolume={changeVolume}
            />
          ) : (
            <section className="flex min-h-0 flex-1 flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Slides
              </h2>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {slideTotal === 0 && (
                  <p className="text-sm text-slate-500">
                    {mode === "bible"
                      ? "Search for a Bible passage to create slides."
                      : "Enter lyrics to create slides."}
                  </p>
                )}
                {activeSlides.map((slide, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`flex w-full items-start gap-3 rounded-lg border p-2 text-left transition ${
                      index === activeIndex
                        ? "border-sky-500 bg-sky-500/10"
                        : "border-slate-800 bg-slate-950/50 hover:border-slate-600"
                    }`}
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs text-slate-300">
                      {index + 1}
                    </span>
                    <span className="min-w-0 whitespace-pre-wrap break-words text-sm text-slate-200">
                      {slide}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right: background + settings */}
        <div className="flex min-h-0 flex-col gap-3">
          {mode === "media" ? (
            <section className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Media presentation
              </h2>
              <div className="flex flex-col gap-3 text-sm text-slate-300">
                <p className="text-xs text-slate-500">
                  The projector shows only the selected image or video — nothing
                  else. Unused space stays black.
                </p>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Selected
                  </span>
                  <span className="truncate text-slate-200">
                    {selectedMedia ? selectedMedia.name : "None"}
                  </span>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-400">
                  <p className="mb-1 font-semibold text-slate-300">
                    Stored on this device
                  </p>
                  <p>
                    Uploaded media lives in this browser (IndexedDB) on this
                    computer. It is not uploaded anywhere and will not appear on
                    another computer or browser profile.
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <>
              <BackgroundPanel
                settings={settings}
                onChange={patchSettings}
                onReset={resetBackground}
                onNotify={notify}
                media={media}
              />
              <section className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                  Projection appearance
                </h2>
                <SettingsPanel
                  settings={settings}
                  onChange={patchSettings}
                  showVerseNumbersOption={mode === "bible"}
                />
              </section>
            </>
          )}
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-400">
            <p className="mb-1 font-semibold text-slate-300">
              Keyboard shortcuts
            </p>
            {mode === "media" ? (
              <>
                <p>→ next media · ← previous</p>
                <p>Space play/pause video (or next)</p>
              </>
            ) : (
              <>
                <p>Space / → next · ← previous</p>
                <p>Home first · End last</p>
              </>
            )}
            <p>F full screen · Esc exit full screen</p>
          </div>
        </div>
      </main>
    </div>
  );
}
