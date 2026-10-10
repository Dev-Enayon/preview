import { useCallback, useEffect, useState } from "react";
import type { Song } from "../types";
import { createId, songStore } from "../lib/storage";

export interface SongsApi {
  songs: Song[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  save: (name: string, lyrics: string, existingId?: string) => Promise<Song>;
  remove: (id: string) => Promise<void>;
  setError: (message: string | null) => void;
}

function sortSongs(songs: Song[]): Song[] {
  return [...songs].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function useSongs(): SongsApi {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await songStore.list();
      setSongs(sortSongs(list));
    } catch {
      setError("Could not load saved lyrics from storage.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (name: string, lyrics: string, existingId?: string) => {
      const now = Date.now();
      const song: Song = {
        id: existingId ?? createId(),
        name: name.trim() || "Untitled song",
        lyrics,
        createdAt: existingId
          ? (songs.find((s) => s.id === existingId)?.createdAt ?? now)
          : now,
        updatedAt: now,
      };
      await songStore.put(song);
      await refresh();
      return song;
    },
    [refresh, songs],
  );

  const remove = useCallback(
    async (id: string) => {
      await songStore.remove(id);
      await refresh();
    },
    [refresh],
  );

  return { songs, loading, error, refresh, save, remove, setError };
}
