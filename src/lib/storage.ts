import type { Song } from "../types";

const DB_NAME = "lyrics-projection";
const DB_VERSION = 1;
const STORE = "songs";
const LS_KEY = "lyrics-projection:songs";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open database"));
  });
  return dbPromise;
}

function tx(
  db: IDBDatabase,
  mode: IDBTransactionMode,
): IDBObjectStore {
  return db.transaction(STORE, mode).objectStore(STORE);
}

async function idbList(): Promise<Song[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = tx(db, "readonly").getAll();
    request.onsuccess = () => resolve(request.result as Song[]);
    request.onerror = () => reject(request.error);
  });
}

async function idbPut(song: Song): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = tx(db, "readwrite").put(song);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function idbRemove(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = tx(db, "readwrite").delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function lsRead(): Song[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Song[]) : [];
  } catch {
    return [];
  }
}

function lsWrite(songs: Song[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(songs));
  } catch {
    /* ignore */
  }
}

/**
 * Persistent song storage backed by IndexedDB with a localStorage mirror so
 * saved lyrics survive even if IndexedDB is blocked (private mode, etc.).
 */
export const songStore = {
  async list(): Promise<Song[]> {
    try {
      const songs = await idbList();
      lsWrite(songs);
      return songs;
    } catch {
      return lsRead();
    }
  },

  async put(song: Song): Promise<void> {
    const songs = lsRead().filter((s) => s.id !== song.id);
    songs.push(song);
    lsWrite(songs);
    try {
      await idbPut(song);
    } catch {
      /* localStorage mirror is the fallback */
    }
  },

  async remove(id: string): Promise<void> {
    lsWrite(lsRead().filter((s) => s.id !== id));
    try {
      await idbRemove(id);
    } catch {
      /* ignore */
    }
  },
};

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
