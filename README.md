# Media Presenter

A distraction-free presentation app for church services. The projector shows
**only the content you are presenting** — lyrics you type, a KJV Bible passage,
an image, or a video. No titles, banners, watermarks, slide numbers, filenames
or UI chrome ever reach the screen.

## Getting started

```bash
npm install
npm run dev      # operator console at http://localhost:5173
```

Production build:

```bash
npm run build
npm run preview  # serve the built app
```

The app runs entirely in the browser. Once loaded, previously saved lyrics and
cached Bible passages work offline; media you have uploaded also works offline
because it is stored on your own computer (see **Media mode** below).

## How it works

Two windows talk to each other in real time through the
[BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel_API)
(with a `localStorage` fallback where BroadcastChannel is unavailable):

1. **Operator window** — the main page. Compose lyrics, look up Bible passages,
   build a media library, pick what to show, tune appearance, and start/stop
   projection.
2. **Projection window** — opened by the operator via **Start Projection**.
   It shows only the current content in a clean full-screen view.

## Projecting on a second monitor or projector

1. Connect your projector/TV as a second display (Windows/ChromeOS: consider
   extending rather than mirroring).
2. In the operator window click **Start Projection**.
3. If your browser supports the **Window Management API** (Chrome/Edge), a
   permission prompt appears — allow it. The projection window will open on the
   second display automatically. Otherwise it opens next to the operator
   window.
4. Drag the projection window onto the projector display if it did not open
   there, then press **F** (or click into the window and press **F**) to enter
   full screen.
5. Drive the show from the operator window.

If no second monitor is available, the operator screen doubles as a live
preview.

## Modes

Use the **Lyrics · Bible · Media** selector in the header.

- **Lyrics** — type or paste lyrics; a blank line separates slides. Save,
  rename, search and reload songs from your local library.
- **Bible** — search the King James Version via bible-api.com, tick the verses
  you want, and they are split into slides. Passages are cached so you can keep
  projecting offline.
- **Media** — upload images and video from your computer and project them.

Switching modes never mixes content: only the current mode reaches the
projector.

## Backgrounds (Lyrics & Bible)

In **Lyrics** and **Bible** modes the **Background** panel lets you choose what
the text is drawn on:

- **Default** — the app's original solid color.
- **Solid Color** — pick with the color picker, type a HEX value (`#0A2540`),
  or tap a preset (black, white, navy, dark blue, dark green, purple, dark
  gray). HEX values are validated before they apply.
- **Image** — choose a picture already in your Media Library (no re-upload
  needed), or upload one right from the panel. Pick **Cover** (fill the screen)
  or **Contain** (whole picture, solid color behind it). A **dimming** slider
  (0–80%) darkens the picture only; the text stays bright.

You can also set the **text color** (white, black or custom). Backgrounds and
text color update the projection **live**, without reopening the window and
without changing the current slide or passage.

Background settings persist on this device, and only a lightweight picture
*identifier* is synchronized — the image itself is read from local storage by
the projection window. If a chosen image is missing, the operator sees a
notice and the projection quietly falls back to the solid color. **Reset to
Default** restores the original background and text styling and never deletes
uploaded media.

## Media mode

**Uploading** — drag files onto the drop zone, or click **Browse files**. You
can select multiple files at once. Supported formats:

- Images: JPG/JPEG, PNG, WebP, GIF
- Video: MP4, WebM

Files are validated by both extension and MIME type, and size-limited
(25 MB for images, 512 MB for video).

**Projecting** — click an item and press **Project selected** (or the item's
**Project** button). For images you can choose **Contain** (whole image, black
bars) or **Cover** (fill the screen, crop if needed); the projection always
keeps the image's aspect ratio in a black frame.

**Video controls** live in the operator window only: **Play**, **Pause**,
**Restart**, **Mute/Unmute**, and a **Volume** slider. The browser's native
video controls are never shown on the projection screen, and a video never
autoplays with sound on its own.

**Where media is stored** — uploaded files are saved in your browser's
IndexedDB on **this computer**. Nothing is uploaded to a server. This means:

- Media persists after refreshing or reopening the app.
- Media does **not** appear on another computer or a different browser profile.
- Clearing the browser's site data removes it.
- Deleting an item frees the space; the app asks for confirmation first.

## Operating controls

- **Space / Right arrow** — next slide (in Media mode, Space plays/pauses a
  selected video)
- **Left arrow** — previous slide / previous media
- **Home** — first slide, **End** — last slide
- **F** — toggle projection full screen
- **Escape** — exit full screen
- When the **projection window has focus**, wireless presentation remotes that
  send arrows / Space / Page Up / Page Down / Enter are also forwarded to the
  operator console.

Keyboard shortcuts never interfere with typing in the lyrics editor or Bible
search fields.

## Using the lyrics editor

- Separate slides with **blank lines**. A line of only `---` is also treated as
  a slide break. Line breaks *inside* a slide are preserved.
- **Save lyrics** stores the current editor content in your library (IndexedDB
  with a localStorage mirror). Saved songs can be loaded, renamed, searched,
  and deleted.
- Live preview and the projector update immediately as you edit.

## Browser-based projection limitations

- Full-screen and Window Management access depend on the browser and require
  user permission on the client machine (this is a deliberate security
  safeguard). No action works remotely or headlessly.
- The operator window must stay open while projecting; closing the projection
  window simply stops the show and never deletes saved lyrics or media.
- Some browsers require a click on the projection window before a video **with
  sound** can play; muted playback and image/Bible/lyrics projection are
  unaffected.
- For the most reliable second-screen placement and full screen, use the latest
  Chrome or Edge.

## Project

```bash
npm run lint   # ESLint
npm test       # Vitest unit + component tests
npm run build  # TypeScript check + production build (dist/)
```
