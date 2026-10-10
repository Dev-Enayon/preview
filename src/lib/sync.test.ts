import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SyncMessage } from "./sync";

class FakeBroadcastChannel {
  static instances: FakeBroadcastChannel[] = [];
  onmessage: ((event: { data: SyncMessage }) => void) | null = null;
  constructor(public name: string) {
    FakeBroadcastChannel.instances.push(this);
  }
  postMessage(data: SyncMessage): void {
    for (const channel of FakeBroadcastChannel.instances) {
      if (channel !== this && channel.onmessage) channel.onmessage({ data });
    }
  }
  close(): void {}
}

async function twoWindows() {
  vi.resetModules();
  const windowA = await import("./sync");
  vi.resetModules();
  const windowB = await import("./sync");
  return { windowA, windowB };
}

const nav: SyncMessage = { type: "nav", action: "next" };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("sync over BroadcastChannel", () => {
  beforeEach(() => {
    FakeBroadcastChannel.instances = [];
    vi.stubGlobal(
      "BroadcastChannel",
      FakeBroadcastChannel as unknown as typeof BroadcastChannel,
    );
  });

  it("delivers a message from one window to the other", async () => {
    const { windowA, windowB } = await twoWindows();
    const received: SyncMessage[] = [];
    windowA.initSync(() => {});
    windowB.initSync((message) => received.push(message));

    windowA.postSync(nav);
    expect(received).toEqual([nav]);
  });

  it("delivers in both directions", async () => {
    const { windowA, windowB } = await twoWindows();
    const toA: SyncMessage[] = [];
    const toB: SyncMessage[] = [];
    windowA.initSync((message) => toA.push(message));
    windowB.initSync((message) => toB.push(message));
    windowA.postSync(nav);
    windowB.postSync({ type: "nav", action: "prev" });
    expect(toA).toEqual([{ type: "nav", action: "prev" }]);
    expect(toB).toEqual([nav]);
  });

  it("does not echo a message back to the sender", async () => {
    const { windowA } = await twoWindows();
    const received: SyncMessage[] = [];
    windowA.initSync((message) => received.push(message));
    windowA.postSync(nav);
    expect(received).toEqual([]);
  });
});

describe("sync fallback when BroadcastChannel is unavailable", () => {
  beforeEach(() => {
    vi.stubGlobal("BroadcastChannel", undefined);
  });

  it("receives messages through storage events", async () => {
    vi.resetModules();
    const mod = await import("./sync");
    const received: SyncMessage[] = [];
    mod.initSync((message) => received.push(message));

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "lyrics-projection:event",
        newValue: JSON.stringify({ message: nav, sender: "other", t: 1 }),
      }),
    );
    expect(received).toEqual([nav]);
  });
});