import { describe, expect, it } from "vitest";
import type { ProjectionSettings } from "../types";
import { DEFAULT_SETTINGS } from "./settings";
import {
  backgroundBaseColor,
  clampDim,
  describeBackground,
  isValidHexColor,
  normalizeHexColor,
} from "./background";

function settings(overrides: Partial<ProjectionSettings> = {}): ProjectionSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

describe("isValidHexColor", () => {
  it("accepts #rgb and #rrggbb in any case", () => {
    expect(isValidHexColor("#000000")).toBe(true);
    expect(isValidHexColor("#FFF")).toBe(true);
    expect(isValidHexColor("#0a2540")).toBe(true);
    expect(isValidHexColor("  #0052FF  ")).toBe(true);
  });

  it("rejects malformed values", () => {
    expect(isValidHexColor("0052ff")).toBe(false);
    expect(isValidHexColor("#12")).toBe(false);
    expect(isValidHexColor("#gggggg")).toBe(false);
    expect(isValidHexColor("navy")).toBe(false);
  });
});

describe("normalizeHexColor", () => {
  it("expands shorthand and lower-cases", () => {
    expect(normalizeHexColor("#ABC")).toBe("#aabbcc");
    expect(normalizeHexColor("#0A2540")).toBe("#0a2540");
  });

  it("returns null for invalid input", () => {
    expect(normalizeHexColor("blue")).toBeNull();
  });
});

describe("clampDim", () => {
  it("clamps into 0..0.8 and guards NaN", () => {
    expect(clampDim(-1)).toBe(0);
    expect(clampDim(0.5)).toBe(0.5);
    expect(clampDim(2)).toBe(0.8);
    expect(clampDim(Number.NaN)).toBe(0);
  });
});

describe("backgroundBaseColor", () => {
  it("uses settings.backgroundColor for the default type", () => {
    expect(backgroundBaseColor(settings())).toBe("#000000");
  });

  it("uses the background color for color and image types", () => {
    expect(
      backgroundBaseColor(
        settings({ background: { ...DEFAULT_SETTINGS.background, type: "color", color: "#0052ff" } }),
      ),
    ).toBe("#0052ff");
    expect(
      backgroundBaseColor(
        settings({
          background: { ...DEFAULT_SETTINGS.background, type: "image", color: "#0a2540" },
        }),
      ),
    ).toBe("#0a2540");
  });
});

describe("describeBackground", () => {
  it("labels each background type", () => {
    expect(describeBackground(DEFAULT_SETTINGS.background)).toBe("Default");
    expect(
      describeBackground({ ...DEFAULT_SETTINGS.background, type: "color", color: "#0052ff" }),
    ).toBe("Solid #0052FF");
    expect(
      describeBackground(
        { ...DEFAULT_SETTINGS.background, type: "image" },
        "blessing.png",
      ),
    ).toBe("Image · blessing.png");
    expect(
      describeBackground({ ...DEFAULT_SETTINGS.background, type: "image" }),
    ).toBe("Image (none selected)");
  });
});
