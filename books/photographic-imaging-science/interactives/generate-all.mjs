import { readdir } from "node:fs/promises";
await import("./generate-lessons.mjs");
await import("./generate-optics.mjs");
for (const entry of (
  await readdir(new URL(".", import.meta.url), { withFileTypes: true })
)
  .filter((e) => e.isDirectory())
  .sort((a, b) => a.name.localeCompare(b.name))) {
  const files = await readdir(new URL(`./${entry.name}/`, import.meta.url));
  for (const name of ["generate-fallback.js", "generate-fallbacks.js"])
    if (files.includes(name))
      await import(new URL(`./${entry.name}/${name}`, import.meta.url));
}
console.log(
  "Interactive figures regenerated; raw/dof retain their fixed numeric examples.",
);
