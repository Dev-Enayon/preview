import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Operator } from "./components/Operator";
import { Projection } from "./components/Projection";
import { PROJECTION_HASH } from "./lib/sync";

const isProjection =
  window.location.hash.replace(/\/$/, "") === PROJECTION_HASH;

createRoot(document.getElementById("root")!).render(
  <StrictMode>{isProjection ? <Projection /> : <Operator />}</StrictMode>,
);
