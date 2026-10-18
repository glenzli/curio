import { writeFile } from "node:fs/promises";
import { fallback } from "../common/lesson-view.js";
import { spec } from "./lesson.js";
await writeFile(new URL("./fallback.svg", import.meta.url), fallback(spec));
