import { useCallback, useEffect, useState } from "react";
import type { ProjectionState } from "../types";
import { DEFAULT_SETTINGS } from "../lib/settings";
import {
  initSync,
  postSync,
  readProjectionState,
  type SyncMessage,
} from "../lib/sync";
import { SlideStage } from "./SlideStage";

const EMPTY_STATE: ProjectionState = {
  contentType: "lyrics",
  text: "",
  settings: DEFAULT_SETTINGS,
  blank: false,
};

function requestFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen) {
    el.requestFullscreen().catch(() => {
      /* user gesture or platform may block - ignore */
    });
  }
}

function exitFullscreen() {
  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {
      /* ignore */
    });
  }
}

export function Projection() {
  const [state, setState] = useState<ProjectionState>(
    () => readProjectionState() ?? EMPTY_STATE,
  );
  const [cursorHidden, setCursorHidden] = useState(false);

  useEffect(() => {
    const onMessage = (message: SyncMessage) => {
      if (message.type === "projection-state") {
        setState(message.state);
      } else if (message.type === "fullscreen") {
        if (message.action === "enter") requestFullscreen();
        else if (message.action === "exit") exitFullscreen();
        else if (document.fullscreenElement) exitFullscreen();
        else requestFullscreen();
      }
    };
    const unsubscribe = initSync(onMessage);
    postSync({ type: "request-state" });
    return unsubscribe;
  }, []);

  useEffect(() => {
    document.title = "";
  }, []);

  useEffect(() => {
    let timer: number | undefined;
    const show = () => {
      setCursorHidden(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setCursorHidden(true), 2000);
    };
    show();
    window.addEventListener("mousemove", show);
    window.addEventListener("mousedown", show);
    return () => {
      window.removeEventListener("mousemove", show);
      window.removeEventListener("mousedown", show);
      window.clearTimeout(timer);
    };
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.target instanceof HTMLInputElement) return;
    if (
      event.key === "ArrowRight" ||
      event.key === " " ||
      event.key === "PageDown" ||
      event.key === "Enter"
    ) {
      event.preventDefault();
      postSync({ type: "nav", action: "next" });
    } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
      event.preventDefault();
      postSync({ type: "nav", action: "prev" });
    } else if (event.key === "Home") {
      event.preventDefault();
      postSync({ type: "nav", action: "first" });
    } else if (event.key === "End") {
      event.preventDefault();
      postSync({ type: "nav", action: "last" });
    } else if (event.key === "f" || event.key === "F") {
      event.preventDefault();
      if (document.fullscreenElement) exitFullscreen();
      else requestFullscreen();
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const backgroundColor = state.settings.backgroundColor;
  useEffect(() => {
    document.body.style.backgroundColor = backgroundColor;
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, [backgroundColor]);

  return (
    <>
      <style>{`
        html, body, #root { height: 100%; margin: 0; padding: 0; overflow: hidden; background: #000; }
        body { cursor: ${cursorHidden ? "none" : "default"}; }
      `}</style>
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: state.settings.backgroundColor,
        }}
      >
        {!state.blank && <SlideStage text={state.text} settings={state.settings} />}
      </div>
    </>
  );
}
