import { afterEach, describe, expect, it } from "vitest";
import type { MediaItem } from "../types";
import { __resetMediaMemory, mediaStore } from "./mediaStore";

afterEach(() => {
  __resetMediaMemory();
});

function item(id: string, addedAt: number): MediaItem {
  return {
    id,
    name: `${id}.png`,
    kind: "image",
    mimeType: "image/png",
    size: 3,
    addedAt,
  };
}

describe("mediaStore", () => {
  it("stores and lists media metadata (without loading blobs)", async () => {
    await mediaStore.put(item("a", 1), new Blob(["abc"]));
    const list = await mediaStore.list();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: "a", kind: "image" });
  });

  it("returns items newest first", async () => {
    await mediaStore.put(item("old", 1), new Blob(["x"]));
    await mediaStore.put(item("new", 5), new Blob(["y"]));
    const list = await mediaStore.list();
    expect(list.map((entry) => entry.id)).toEqual(["new", "old"]);
  });

  it("returns the stored blob for a media id", async () => {
    await mediaStore.put(item("a", 1), new Blob(["hello media"]));
    const blob = await mediaStore.getBlob("a");
    expect(blob).toBeInstanceOf(Blob);
    expect(blob!.size).toBe(new Blob(["hello media"]).size);
  });

  it("returns the metadata together with the blob", async () => {
    await mediaStore.put(item("a", 1), new Blob(["abc"]));
    const stored = await mediaStore.get("a");
    expect(stored?.item.id).toBe("a");
    expect(stored?.blob).toBeInstanceOf(Blob);
  });

  it("returns null for missing media", async () => {
    expect(await mediaStore.get("nope")).toBeNull();
    expect(await mediaStore.getBlob("nope")).toBeNull();
  });

  it("removes a single item and keeps the rest", async () => {
    await mediaStore.put(item("a", 1), new Blob(["x"]));
    await mediaStore.put(item("b", 2), new Blob(["y"]));
    await mediaStore.remove("a");
    const list = await mediaStore.list();
    expect(list.map((entry) => entry.id)).toEqual(["b"]);
  });

  it("overwrites an existing item in place", async () => {
    await mediaStore.put(item("a", 1), new Blob(["x"]));
    await mediaStore.put({ ...item("a", 3), name: "renamed.png" }, new Blob(["z"]));
    const list = await mediaStore.list();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("renamed.png");
  });
});
