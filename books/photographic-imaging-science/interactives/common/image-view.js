import { escape } from "./lesson-view.js";

// Presentation only. Callers supply linear values and declare every display scale.
export function raster(
  values,
  width,
  height,
  { x = 0, y = 0, size = 200, white = 1, gamma = 2.2 } = {},
) {
  const paths = new Map();
  for (let i = 0; i < values.length; i++) {
    const shade = Math.round(
      255 * Math.max(0, Math.min(1, values[i] / white)) ** (1 / gamma),
    );
    paths.set(
      shade,
      (paths.get(shade) ?? "") +
        `M${i % width} ${Math.floor(i / width)}h1v1h-1z`,
    );
  }
  const scale = size / Math.max(width, height);
  return `<g transform="translate(${x} ${y}) scale(${scale})" shape-rendering="crispEdges">${[...paths].map(([v, d]) => `<path fill="rgb(${v} ${v} ${v})" d="${d}"/>`).join("")}</g>`;
}

// Interleaved linear R,G,B values; callers own the color model and reference white.
export function rasterRgb(
  values,
  width,
  height,
  { x = 0, y = 0, size = 200, white = 1, gamma = 2.2 } = {},
) {
  const paths = new Map();
  for (let i = 0; i < width * height; i++) {
    const rgb = Array.from({ length: 3 }, (_, c) =>
      Math.round(
        255 *
          Math.max(0, Math.min(1, values[3 * i + c] / white)) ** (1 / gamma),
      ),
    ).join(" ");
    paths.set(
      rgb,
      (paths.get(rgb) ?? "") + `M${i % width} ${Math.floor(i / width)}h1v1h-1z`,
    );
  }
  const scale = size / Math.max(width, height);
  return `<g transform="translate(${x} ${y}) scale(${scale})" shape-rendering="crispEdges">${[...paths].map(([rgb, d]) => `<path fill="rgb(${rgb})" d="${d}"/>`).join("")}</g>`;
}

// A complete SVG for static reading, plus separate tiles for responsive live reading.
export function imagePanels(
  panels,
  { title, columns = 2, tileHeight = 245 } = {},
) {
  const tileWidth = 360,
    width = tileWidth * columns;
  const height = Math.ceil(panels.length / columns) * tileHeight;
  const bodies = panels.map((p) => {
    const scale = Math.min(
      (tileWidth - 24) / p.width,
      (tileHeight - 70) / p.height,
    );
    const size = Math.max(p.width, p.height) * scale;
    const left = (tileWidth - p.width * scale) / 2,
      top = 32;
    const drawing = p.vector
      ? `<g transform="translate(${left} ${top}) scale(${scale})">${p.vector}</g>`
      : (p.rgb ? rasterRgb : raster)(p.values, p.width, p.height, {
          x: left,
          y: top,
          size,
          white: p.white,
          gamma: p.gamma,
        });
    return `<rect x="3" y="2" width="${tileWidth - 6}" height="${tileHeight - 4}" fill="none" stroke="currentColor" stroke-opacity="${p.active ? 0.7 : 0.17}" stroke-width="1" rx="7"/><text x="12" y="22" style="font-size:14px;font-weight:600">${escape(p.label)}</text>${drawing}${p.probe ? `<rect x="${left + p.probe[0] * scale}" y="${top + p.probe[1] * scale}" width="${scale}" height="${scale}" fill="none" stroke="#47a9c3" stroke-width="1.5"/>` : ""}<text x="12" y="${tileHeight - 23}" style="font-size:11px">${escape(p.detail ?? "")}</text><text x="12" y="${tileHeight - 7}" style="font-size:10px" opacity=".7">${escape(p.scale ?? "")}</text>`;
  });
  const figure = `<svg class="drawing" role="img" aria-label="${escape(title)}" viewBox="0 0 ${width} ${height}"><style>text{font-family:inherit;fill:currentColor}</style>${bodies.map((body, i) => `<g transform="translate(${(i % columns) * tileWidth} ${Math.floor(i / columns) * tileHeight})">${body}</g>`).join("")}</svg>`;
  const liveFigure = `<style>.image-panels{display:grid;grid-template-columns:repeat(${columns},minmax(0,1fr));gap:14px;margin:18px 0}.image-panel{min-width:0;margin:0;border:1px solid var(--line,#aaa);border-radius:8px;overflow:hidden;background:color-mix(in srgb,currentColor 2%,transparent)}.image-panel.is-active{border-color:currentColor;box-shadow:inset 0 2px currentColor}.image-panel figcaption{font-size:12px;font-weight:600;padding:11px 12px}.image-panel svg{display:block;width:100%;height:auto}.image-panel-notes{padding:10px 12px 12px;font-size:11px;line-height:1.7;display:grid;gap:3px}.image-panel-notes small{font-size:10px;opacity:.65}@media(max-width:550px){.image-panels{grid-template-columns:1fr}}</style><div class="image-panels">${panels.map((p) => `<figure class="image-panel${p.active ? " is-active" : ""}"><figcaption>${escape(p.label)}</figcaption><svg role="img" aria-label="${escape(p.label)}" viewBox="0 0 ${p.width} ${p.height}">${p.vector ?? (p.rgb ? rasterRgb : raster)(p.values, p.width, p.height, { size: Math.max(p.width, p.height), white: p.white, gamma: p.gamma })}${p.probe ? `<rect x="${p.probe[0]}" y="${p.probe[1]}" width="1" height="1" fill="none" stroke="#47a9c3" stroke-width="1.4" vector-effect="non-scaling-stroke"/>` : ""}</svg><div class="image-panel-notes"><span>${escape(p.detail ?? "")}</span><small>${escape(p.scale ?? "")}</small></div></figure>`).join("")}</div>`;
  return { figure, liveFigure };
}
