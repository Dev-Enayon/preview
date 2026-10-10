import type { MediaItem } from "../types";

const DB_NAME = "media-presenter-media";
const DB_VERSION = 1;
const META_STORE = "meta";
const BLOB_STORE = "blobs";

export interface StoredMedia {
  item: MediaItem;
  blob: Blob;
}

/** Raised when a file cannot be persisted (most often a storage quota error). */
export class MediaStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaStorageError";
  }
}

interface StoredRecord {
  item: MediaItem;
  blob: Blob;
}

// When IndexedDB is unavailable (or fails) we fall back to an in-memory map so
// the app keeps working for the current session. We deliberately avoid
// localStorage here: media files must never be stored as Base64 strings.
const memory = new Map<string, StoredRecord>();
let dbPromise: Promise<IDBDatabase> | null = null;
let useMemory = typeof indexedDB === "undefined";

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(BLOB_STORE)) {
          db.createObjectStore(BLOB_STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error("Failed to open media database"));
    });
  }
  return dbPromise;
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function isQuotaError(error: unknown): boolean {
  return (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

function sortByAddedDesc(items: MediaItem[]): MediaItem[] {
  return [...items].sort((a, b) => b.addedAt - a.addedAt);
}

/**
 * Persistent media library. The file bytes live in IndexedDB as real Blobs
 * (never Base64). Metadata is kept in a separate store so the operator gallery
 * can list items without pulling every full-resolution video into memory.
 */
export const mediaStore = {
  async list(): Promise<MediaItem[]> {
    if (!useMemory) {
      try {
        const db = await openDb();
        const items = await request<MediaItem[]>(
          db.transaction(META_STORE, "readonly").objectStore(META_STORE).getAll(),
        );
        return sortByAddedDesc(items);
      } catch {
        useMemory = true;
      }
    }
    return sortByAddedDesc([...memory.values()].map((record) => record.item));
  },

  async get(id: string): Promise<StoredMedia | null> {
    if (!useMemory) {
      try {
        const db = await openDb();
        const transaction = db.transaction(
          [META_STORE, BLOB_STORE],
          "readonly",
        );
        const item = await request<MediaItem | undefined>(
          transaction.objectStore(META_STORE).get(id),
        );
        const record = await request<{ id: string; blob: Blob } | undefined>(
          transaction.objectStore(BLOB_STORE).get(id),
        );
        if (!item || !record) return null;
        return { item, blob: record.blob };
      } catch {
        useMemory = true;
      }
    }
    return memory.get(id) ?? null;
  },

  async getBlob(id: string): Promise<Blob | null> {
    const stored = await this.get(id);
    return stored?.blob ?? null;
  },

  async put(item: MediaItem, blob: Blob): Promise<void> {
    if (!useMemory) {
      try {
        const db = await openDb();
        const transaction = db.transaction(
          [META_STORE, BLOB_STORE],
          "readwrite",
        );
        transaction.objectStore(META_STORE).put(item);
        transaction.objectStore(BLOB_STORE).put({ id: item.id, blob });
        await txDone(transaction);
        return;
      } catch (error) {
        if (isQuotaError(error)) {
          throw new MediaStorageError(
            "Not enough browser storage to save this file. Remove some media or try a smaller file.",
          );
        }
        useMemory = true;
      }
    }
    memory.set(item.id, { item, blob });
  },

  async remove(id: string): Promise<void> {
    if (!useMemory) {
      try {
        const db = await openDb();
        const transaction = db.transaction(
          [META_STORE, BLOB_STORE],
          "readwrite",
        );
        transaction.objectStore(META_STORE).delete(id);
        transaction.objectStore(BLOB_STORE).delete(id);
        await txDone(transaction);
        return;
      } catch {
        useMemory = true;
      }
    }
    memory.delete(id);
  },
};

/** Test-only helper: reset the in-memory fallback between cases. */
export function __resetMediaMemory(): void {
  memory.clear();
}
