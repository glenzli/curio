import { plot, legend } from "./ui.js";

export const colors = ["#40879a", "#bb7946", "#8b78aa", "#777"];
export const number = (x, digits = 2) =>
  x === null ? "无有效值" : Number.isFinite(x) ? x.toFixed(digits) : "超出范围";
export const control = (
  key,
  label,
  min,
  max,
  step,
  value,
  unit = "",
  digits = 0,
) => ({
  key,
  label,
  min,
  max,
  step,
  value,
  format: (x) => `${number(x, digits)}${unit}`,
});
export const escape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
export const grid = (lo, hi, fn, n = 120) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const x = lo + ((hi - lo) * i) / n;
    return [x, fn(x)];
  });
export const curve = (name, points, i = 0, dashed = false) => ({
  name,
  points,
  color: colors[i],
  dashed,
});
export function chart(panel) {
  return plot({
    height: 300,
    leftPadding: 76,
    rightPadding: 32,
    topPadding: 50,
    topLabelY: 24,
    bottomPadding: 58,
    bottomLabelPadding: 3,
    ...panel,
  });
}
export function lessonBody(result) {
  return `${result.liveFigure ?? result.figure ?? ""}${(result.panels ?? []).map((p) => `<div class="chart"><h4>${escape(p.title)}</h4>${chart(p)}<div class="legend">${legend(p.curves.filter((c) => c.name))}</div></div>`).join("")}<div class="stats">${result.stats.map(([label, value, detail = ""]) => `<div><small>${escape(label)}</small><strong>${escape(value)}</strong><em>${escape(detail)}</em></div>`).join("")}</div><p class="reading" data-truth>${escape(result.reading)}</p>${result.table ?? ""}`;
}
// Shared presentation only: each lesson owns its data, model and reference calculation.
export function fallback(spec) {
  const state = Object.fromEntries(spec.controls.map((c) => [c.key, c.value]));
  const r = spec.evaluate(state),
    panels = r.panels ?? [];
  const captions = spec.staticCaption.match(/.{1,44}/gu) ?? [];
  let y = 104 + captions.length * 23,
    body = "";
  if (r.figure) {
    const figureHeight = r.figureHeight ?? 310;
    body += r.figure.replace(
      "<svg ",
      `<svg x="30" y="${y}" width="740" height="${figureHeight}" `,
    );
    y += figureHeight + 20;
  }
  for (const p of panels) {
    body += `<text x="30" y="${y}" font-size="20">${escape(p.title)}</text>`;
    y += 16;
    body += chart(p).replace(
      "<svg ",
      `<svg x="30" y="${y}" width="740" height="300" `,
    );
    y += 316;
    const entries = p.curves.filter((c) => c.name);
    entries.forEach((c, i) => {
      const x = 30 + (i % 2) * 370,
        row = y + Math.floor(i / 2) * 28;
      body += `<path d="M${x},${row - 5}h24" fill="none" stroke="${c.color}" stroke-width="2.5" ${c.dashed ? 'stroke-dasharray="6 4"' : ""}/><text x="${x + 34}" y="${row}" font-size="15">${escape(c.name)}</text>`;
    });
    y += Math.ceil(entries.length / 2) * 28 + 24;
  }
  for (const [label, value, detail = ""] of r.stats) {
    body += `<text x="30" y="${y}" font-size="17">${escape(`${label}：${value}  ${detail}`)}</text>`;
    y += 28;
  }
  // These tables are generated locally by lesson specs, without nested markup.
  // Keep their calibration values available in a static-only reader too.
  for (const line of r.staticRows ?? []) {
    body += `<text x="30" y="${y}" font-size="15">${escape(line)}</text>`;
    y += 24;
  }
  for (const row of (r.staticRows ? "" : (r.table ?? "")).matchAll(
    /<tr>([\s\S]*?)<\/tr>/g,
  )) {
    const cells = [...row[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map(
      (m) => m[1],
    );
    for (const line of cells.join(" | ").match(/.{1,44}/gu) ?? []) {
      body += `<text x="30" y="${y}" font-size="15">${escape(line)}</text>`;
      y += 24;
    }
  }
  const words = r.reading.match(/.{1,44}/gu) ?? [];
  const height = y + words.length * 23 + 54;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="${height}" viewBox="0 0 800 ${height}" role="img" aria-label="${escape(spec.alt)}" style="color:#303030;font:16px sans-serif"><style>text{fill:currentColor;font-family:sans-serif}</style><rect width="800" height="100%" fill="#fafafa"/><text x="30" y="42" font-size="26">${escape(spec.title)}</text>${captions.map((w, i) => `<text x="30" y="${82 + i * 23}">${escape(w)}</text>`).join("")}${body}${words.map((w, i) => `<text x="30" y="${y + 28 + i * 23}" font-size="15">${escape(w)}</text>`).join("")}</svg>`;
}
