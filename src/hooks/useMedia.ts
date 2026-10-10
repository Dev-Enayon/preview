import { useCallback, useEffect, useState } from "react";
import type { MediaItem } from "../types";
import { createId } from "../lib/storage";
import { classifyMedia } from "../lib/media";
import { MediaStorageError, mediaStore } from "../lib/mediaStore";
import { probeMedia } from "../lib/mediaThumbnails";

export interface UploadResult {
  added: MediaItem[];
  rejected: string[];
}

export interface MediaApi {
  items: MediaItem[];
  loading: boolean;
  uploading: boolean;
  error: string | null;
  notice: string | null;
  refresh: () => Promise<void>;
  upload: (files: FileList | File[]) => Promise<UploadResult>;
  remove: (id: string) => Promise<void>;
  setError: (message: string | null) => void;
  setNotice: (message: string | null) => void;
}

export function useMedia(): MediaApi {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setItems(await mediaStore.list());
    } catch {
      setError("Could not read the local media library.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const upload = useCallback(
    async (files: FileList | File[]): Promise<UploadResult> => {
      const list = Array.from(files);
      const added: MediaItem[] = [];
      const rejected: string[] = [];

      setUploading(true);
      setError(null);
      setNotice(null);

      for (const file of list) {
        const classified = classifyMedia(file);
        if (!classified.ok) {
          rejected.push(classified.error);
          continue;
        }
        const probe = await probeMedia(file, classified.kind);
        const item: MediaItem = {
          id: createId(),
          name: file.name,
          kind: classified.kind,
          mimeType: classified.mimeType,
          size: file.size,
          addedAt: Date.now(),
          width: probe.width,
          height: probe.height,
          duration: probe.duration,
          thumbnail: probe.thumbnail,
        };
        try {
          await mediaStore.put(item, file);
          added.push(item);
        } catch (err) {
          rejected.push(
            err instanceof MediaStorageError
              ? err.message
              : `Could not store “${file.name}”.`,
          );
        }
      }

      setUploading(false);
      await refresh();

      if (rejected.length > 0) {
        setError(rejected.join(" "));
      } else if (added.length > 0) {
        setNotice(
          added.length === 1
            ? `Added “${added[0].name}” to the media library.`
            : `Added ${added.length} files to the media library.`,
        );
      }

      return { added, rejected };
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await mediaStore.remove(id);
      await refresh();
    },
    [refresh],
  );

  return {
    items,
    loading,
    uploading,
    error,
    notice,
    refresh,
    upload,
    remove,
    setError,
    setNotice,
  };
}
