import type { ProjectionState } from "../types";

export const PROJECTION_HASH = "#projection";

export type NavAction = "next" | "prev" | "first" | "last";
export type FullscreenAction = "toggle" | "enter" | "exit";

export type SyncMessage =
  | { type: "projection-state"; state: ProjectionState }
  | { type: "request-state" }
  | { type: "nav"; action: NavAction }
  | { type: "fullscreen"; action: FullscreenAction };

interface SyncChannel {
  post(message: SyncMessage): void;
  close(): void;
}

const CHANNEL_NAME = "lyrics-projection";
const LS_EVENT_KEY = "lyrics-projection:event";
const LS_STATE_KEY = "lyrics-projection:state";

/** Persist the current projection state so a freshly opened window can start
 * with the correct content even before the first broadcast arrives. */
export function persistProjectionState(state: ProjectionState): void {
  try {
    localStorage.setItem(LS_STATE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function readProjectionState(): ProjectionState | null {
  try {
    const raw = localStorage.getItem(LS_STATE_KEY);
    return raw ? (JSON.parse(raw) as ProjectionState) : null;
  } catch {
    return null;
  }
}

function createBroadcastChannel(
  onMessage: (message: SyncMessage) => void,
): SyncChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  const bc = new BroadcastChannel(CHANNEL_NAME);
  bc.onmessage = (event: MessageEvent<SyncMessage>) => {
    onMessage(event.data);
  };
  return {
    post(message) {
      bc.postMessage(message);
    },
    close() {
      bc.close();
    },
  };
}

function createStorageChannel(
  onMessage: (message: SyncMessage) => void,
): SyncChannel {
  const handler = (event: StorageEvent) => {
    if (event.key !== LS_EVENT_KEY || !event.newValue) return;
    try {
      const payload = JSON.parse(event.newValue) as {
        message: SyncMessage;
        sender: string;
      };
      onMessage(payload.message);
    } catch {
      /* ignore malformed payloads */
    }
  };
  window.addEventListener("storage", handler);
  const sender = Math.random().toString(36).slice(2);
  return {
    post(message) {
      try {
        localStorage.setItem(
          LS_EVENT_KEY,
          JSON.stringify({ message, sender, t: Date.now() }),
        );
      } catch {
        /* ignore */
      }
    },
    close() {
      window.removeEventListener("storage", handler);
    },
  };
}

let channel: SyncChannel | null = null;
let activeHandler: ((message: SyncMessage) => void) | null = null;

function ensureChannel(): SyncChannel {
  if (!channel) {
    const deliver = (message: SyncMessage) => activeHandler?.(message);
    channel = createBroadcastChannel(deliver) ?? createStorageChannel(deliver);
  }
  return channel;
}

/** Register the message handler for this window. Returns an unsubscribe fn. */
export function initSync(handler: (message: SyncMessage) => void): () => void {
  activeHandler = handler;
  ensureChannel();
  return () => {
    if (activeHandler === handler) activeHandler = null;
  };
}

/** Broadcast a message to every other window using the same origin. */
export function postSync(message: SyncMessage): void {
  ensureChannel().post(message);
}
