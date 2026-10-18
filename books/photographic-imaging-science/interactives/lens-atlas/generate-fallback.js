import { writeFile } from "node:fs/promises";
import { fallback } from "../common/lesson-view.js";
import { spec, evaluate } from "./lesson.js";
import { overview } from "./drawing.js";
await writeFile(
  new URL("./fallback.svg", import.meta.url),
  fallback({ ...spec, evaluate }) + "\n",
);
if (process.argv.includes("--numbered"))
  await writeFile(
    new URL("../../figures/16_classical_layouts.svg", import.meta.url),
    overview() + "\n",
  );
