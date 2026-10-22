import { writeFileSync } from "node:fs";
import { fallback } from "../common/lesson-view.js";
import { spec } from "./lesson.js";
writeFileSync(new URL("fallback.svg", import.meta.url), fallback(spec));
