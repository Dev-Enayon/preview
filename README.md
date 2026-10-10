# Lyrics Projection

A distraction-free lyrics projection application for church services. The
projector shows **only the lyrics you type** — no song titles, banners,
watermarks, slide numbers, or UI chrome.

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

The app runs entirely in the browser. Once loaded, it works offline (saved
lyrics and settings are stored in IndexedDB + localStorage).

## How it works

Two windows talk to each other in real time through the
[BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel_API)
(with a `localStorage` fallback where BroadcastChannel is unavailable):

1. **Operator window** — the main page. Type/paste lyrics, manage your saved
   library, pick slides, tune appearance, and start/stop projection.
2. **Projection window** — opened by the operator via **Start Projection**.
   It shows only the current slide in a clean full-screen view.

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
5. Drive the show from the operator window: click slides, use **Prev/Next**, or
   the keyboard shortcuts below.

If no second monitor is available, the operator screen doubles as a live
preview.

## Operating controls

- **Space / Right arrow** — next slide
- **Left arrow** — previous slide
- **Home** — first slide, **End** — last slide
- **F** — toggle projection full screen
- **Escape** — exit full screen
- When the **projection window has focus**, wireless presentation remotes that
  send arrows / Space / Page Up / Page Down / Enter are also forwarded to the
  operator console.

Keyboard shortcuts never interfere with typing in the lyrics editor.

## Using the editor

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
  window simply stops the show and never deletes saved lyrics.
- For the most reliable second-screen placement and full screen, use the latest
  Chrome or Edge.

## Project

```bash
npm run lint   # ESLint
npm test       # Vitest unit + component tests
npm run build  # TypeScript check + production build (dist/)
```