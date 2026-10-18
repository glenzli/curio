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
    return `${p.active ? `<rect x="2" y="2" width="${tileWidth - 4}" height="${tileHeight - 4}" fill="none" stroke="currentColor" stroke-width="2" rx="5"/>` : ""}<text x="12" y="20" style="font-size:15px">${escape(p.label)}</text>${(p.rgb ? rasterRgb : raster)(p.values, p.width, p.height, { x: left, y: top, size, white: p.white, gamma: p.gamma })}${p.probe ? `<rect x="${left + p.probe[0] * scale}" y="${top + p.probe[1] * scale}" width="${scale}" height="${scale}" fill="none" stroke="#47a9c3" stroke-width="1.5"/>` : ""}<text x="12" y="${tileHeight - 23}" style="font-size:12px">${escape(p.detail ?? "")}</text><text x="12" y="${tileHeight - 6}" style="font-size:12px">${escape(p.scale ?? "")}</text>`;
  });
  const figure = `<svg class="drawing" role="img" aria-label="${escape(title)}" viewBox="0 0 ${width} ${height}"><style>text{font-family:inherit;fill:currentColor}</style>${bodies.map((body, i) => `<g transform="translate(${(i % columns) * tileWidth} ${Math.floor(i / columns) * tileHeight})">${body}</g>`).join("")}</svg>`;
  const liveFigure = `<style>.image-panels{display:grid;grid-template-columns:repeat(${columns},minmax(0,1fr))}.image-panels text{font-family:inherit;fill:currentColor}@media(max-width:550px){.image-panels{grid-template-columns:1fr}}</style><div class="image-panels">${bodies.map((body, i) => `<svg class="drawing" role="img" aria-label="${escape(panels[i].label)}" viewBox="0 0 ${tileWidth} ${tileHeight}">${body}</svg>`).join("")}</div>`;
  return { figure, liveFigure };
}
