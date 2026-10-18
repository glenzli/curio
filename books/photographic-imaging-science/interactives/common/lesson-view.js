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
// CJK glyphs occupy roughly twice the width of Latin letters in these figures.
export function textLines(value, maxUnits = 90) {
  const lines = [];
  for (const paragraph of String(value).split("\n")) {
    let line = "",
      units = 0;
    for (const char of paragraph) {
      const width = /[\u2e80-\uffef]/u.test(char) ? 2 : 1;
      if (units + width > maxUnits) {
        lines.push(line);
        line = "";
        units = 0;
      }
      line += char;
      units += width;
    }
    if (line) lines.push(line);
  }
  return lines;
}
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
  const drawing = result.liveFigure ?? result.figure ?? "";
  const figure = result.figureMinWidth
    ? `<div class="drawing-scroll" role="region" aria-label="示意图，可横向滚动" tabindex="0"><div style="min-width:${result.figureMinWidth}px">${drawing}</div></div><small class="drawing-hint">左右滑动查看全图</small>`
    : drawing;
  return `${figure}${(result.panels ?? []).map((p) => `<div class="chart"><h4>${escape(p.title)}</h4>${chart(p)}<div class="legend">${legend(p.curves.filter((c) => c.name))}</div></div>`).join("")}<div class="stats">${result.stats.map(([label, value, detail = ""]) => `<div><small>${escape(label)}</small><strong>${escape(value)}</strong><em>${escape(detail)}</em></div>`).join("")}</div><p class="reading" data-truth>${escape(result.reading)}</p>${result.table ?? ""}`;
}
// Shared presentation only: each lesson owns its data, model and reference calculation.
export function fallback(spec) {
  const state = Object.fromEntries(spec.controls.map((c) => [c.key, c.value]));
  const r = spec.evaluate(state),
    panels = r.panels ?? [];
  const captions = textLines(spec.staticCaption, 88);
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
  for (let i = 0; i < r.stats.length; i += 3) {
    const cards = r.stats
      .slice(i, i + 3)
      .map(([label, value, detail = ""]) => ({
        label: textLines(label, 30),
        value: textLines(value, 22),
        detail: textLines(detail, 34),
      }));
    const height = Math.max(
      ...cards.map(
        (c) =>
          28 + c.label.length * 19 + c.value.length * 26 + c.detail.length * 18,
      ),
    );
    cards.forEach((c, col) => {
      const x = 30 + col * 252;
      body += `<rect x="${x}" y="${y}" width="238" height="${height}" rx="7" fill="#fff" stroke="#dedfe2"/>`;
      let row = y + 23;
      for (const line of c.label) {
        body += `<text x="${x + 12}" y="${row}" font-size="13" fill="#676d74">${escape(line)}</text>`;
        row += 19;
      }
      row += 4;
      for (const line of c.value) {
        body += `<text x="${x + 12}" y="${row}" font-size="19" font-weight="600">${escape(line)}</text>`;
        row += 26;
      }
      for (const line of c.detail) {
        body += `<text x="${x + 12}" y="${row}" font-size="12" fill="#676d74">${escape(line)}</text>`;
        row += 18;
      }
    });
    y += height + 18;
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
    for (const line of textLines(cells.join(" | "), 92)) {
      body += `<text x="30" y="${y}" font-size="15">${escape(line)}</text>`;
      y += 24;
    }
  }
  const words = textLines(r.reading, 96);
  const height = y + words.length * 23 + 54;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="${height}" viewBox="0 0 800 ${height}" role="img" aria-label="${escape(spec.alt)}" style="color:#303030;fill:currentColor;font:16px sans-serif"><style>text{font-family:sans-serif}</style><rect width="800" height="100%" fill="#fafafa"/><text x="30" y="42" font-size="26">${escape(spec.title)}</text>${captions.map((w, i) => `<text x="30" y="${82 + i * 23}">${escape(w)}</text>`).join("")}${body}${words.map((w, i) => `<text x="30" y="${y + 28 + i * 23}" font-size="15">${escape(w)}</text>`).join("")}</svg>`;
}
