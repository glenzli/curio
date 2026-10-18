import { writeFile } from "node:fs/promises";
import { fallback, escape } from "../common/lesson-view.js";
import { specs } from "./lesson.js";
let y = 0,
  body = "";
for (const spec of specs) {
  const part = fallback(spec),
    height = Number(part.match(/height="(\d+)"/)[1]);
  body += part.replace("<svg ", '<svg x="0" y="' + y + '" ');
  y += height + 16;
}
await writeFile(
  new URL("./fallback.svg", import.meta.url),
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="' +
    y +
    '" viewBox="0 0 800 ' +
    y +
    '" role="img" aria-label="' +
    escape(specs[0].alt) +
    '"><rect width="800" height="' +
    y +
    '" fill="#f8f8f8"/>' +
    body +
    "</svg>\n",
);
