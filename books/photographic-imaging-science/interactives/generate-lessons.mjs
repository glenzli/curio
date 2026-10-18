import { writeFile } from "node:fs/promises";
import { fallback } from "./common/lesson-view.js";
import { createDng } from "./dng-inspector/model.js";
const ids = [
  "signal-chain",
  "absorption",
  "calibration-drift",
  "demosaic-noise",
  "local-motion",
  "tone-map",
  "dng-inspector",
  "thick-lens",
  "focus-survey",
  "chromatic-focus",
  "distortion",
  "thermal-focus",
  "asphere",
  "unit-calculator",
  "psf-image",
  "capture-scene",
  "repeatability",
  "subpixel",
  "ghost",
  "defocus",
];
for (const id of ids) {
  const folder = new URL(`./${id}/`, import.meta.url);
  const { spec } = await import(new URL("lesson.js", folder));
  await writeFile(new URL("fallback.svg", folder), fallback(spec));
}
await writeFile(
  new URL("./dng-inspector/sample.dng", import.meta.url),
  createDng(),
);
console.log(
  `Generated ${ids.length} static lesson figures and one teaching DNG.`,
);
