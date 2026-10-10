import type { ReactNode } from "react";
import type { ProjectionSettings } from "../types";
import { DEFAULT_TEXT_SETTINGS, FONT_FAMILIES } from "../lib/settings";

interface SettingsPanelProps {
  settings: ProjectionSettings;
  onChange: (patch: Partial<ProjectionSettings>) => void;
  /** Show the Bible verse-number toggle (only relevant in Bible mode). */
  showVerseNumbersOption?: boolean;
}

function Label({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
      {children}
    </span>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500";

export function SettingsPanel({ settings, onChange, showVerseNumbersOption = false }: SettingsPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label>Font family</Label>
        <select
          className={inputClass}
          value={settings.fontFamily}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font.label} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label>Font weight</Label>
          <select
            className={inputClass}
            value={settings.fontWeight}
            onChange={(e) => onChange({ fontWeight: Number(e.target.value) })}
          >
            {[300, 400, 500, 600, 700, 800].map((weight) => (
              <option key={weight} value={weight}>
                {weight}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Alignment</Label>
          <select
            className={inputClass}
            value={settings.textAlign}
            onChange={(e) =>
              onChange({ textAlign: e.target.value as "center" | "left" })
            }
          >
            <option value="center">Center</option>
            <option value="left">Left</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label>Vertical position</Label>
        <select
          className={inputClass}
          value={settings.verticalAlign}
          onChange={(e) =>
            onChange({
              verticalAlign: e.target.value as ProjectionSettings["verticalAlign"],
            })
          }
        >
          <option value="center">Middle</option>
          <option value="flex-start">Top</option>
          <option value="flex-end">Bottom</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <Label>Font size</Label>
          <span className="text-xs text-slate-400">
            {settings.fontSize.toFixed(1)}%
          </span>
        </div>
        <input
          type="range"
          min={3}
          max={20}
          step={0.5}
          value={settings.fontSize}
          onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
          className="accent-sky-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <Label>Line spacing</Label>
          <span className="text-xs text-slate-400">
            {settings.lineHeight.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min={0.9}
          max={2.2}
          step={0.05}
          value={settings.lineHeight}
          onChange={(e) => onChange({ lineHeight: Number(e.target.value) })}
          className="accent-sky-500"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={settings.autoFit}
          onChange={(e) => onChange({ autoFit: e.target.checked })}
          className="accent-sky-500"
        />
        Auto-fit text to screen
      </label>

      {showVerseNumbersOption && (
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={settings.showVerseNumbers}
            onChange={(e) => onChange({ showVerseNumbers: e.target.checked })}
            className="accent-sky-500"
          />
          Show verse numbers on projector (off by default)
        </label>
      )}

      <button
        type="button"
        onClick={() => onChange({ ...DEFAULT_TEXT_SETTINGS })}
        className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-sky-500 hover:text-white"
      >
        Reset text &amp; layout
      </button>
    </div>
  );
}
