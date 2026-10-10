import { afterEach, describe, expect, it } from "vitest";
import type { Song } from "../types";
import { createId, songStore } from "./storage";

afterEach(() => {
  localStorage.clear();
});

const song: Song = {
  id: "song-1",
  name: "Amazing Grace",
  lyrics: "Amazing grace\n\nThat saved a wretch",
  createdAt: 1,
  updatedAt: 2,
};

describe("songStore (IndexedDB-less fallback)", () => {
  it("persists and lists a song", async () => {
    await songStore.put(song);
    const list = await songStore.list();
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual(song);
  });

  it("updates an existing song in place", async () => {
    await songStore.put(song);
    await songStore.put({ ...song, lyrics: "changed", updatedAt: 3 });
    const list = await songStore.list();
    expect(list).toHaveLength(1);
    expect(list[0].lyrics).toBe("changed");
  });

  it("removes a song", async () => {
    await songStore.put(song);
    await songStore.remove(song.id);
    expect(await songStore.list()).toEqual([]);
  });

  it("keeps other songs when removing one", async () => {
    const other = { ...song, id: "song-2", name: "Other" };
    await songStore.put(song);
    await songStore.put(other);
    await songStore.remove(song.id);
    const list = await songStore.list();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("song-2");
  });
});

describe("createId", () => {
  it("generates unique ids", () => {
    const ids = new Set([createId(), createId(), createId(), createId()]);
    expect(ids.size).toBe(4);
  });
});