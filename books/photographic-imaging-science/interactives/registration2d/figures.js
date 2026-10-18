import { WIDTH, HEIGHT, LIMIT, STEP } from "./model.js";
export function scoreColor(score) {
  if (score === null) return "#b7b6b2";
  const v = Math.max(0, Math.min(1, (score + 1) / 2));
  return `rgb(${Math.round(235 - 185 * v)} ${Math.round(225 - 104 * v)} ${Math.round(207 - 74 * v)})`;
}
export function correlationFigure(result, truth) {
  const n = (2 * LIMIT) / STEP + 1,
    size = 294,
    cell = size / n,
    X = (x) => 58 + ((x + LIMIT) / STEP) * cell + cell / 2,
    Y = (y) => 42 + ((y + LIMIT) / STEP) * cell + cell / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 390" role="img" aria-label="二维归一化相关面，横轴向右、纵轴向下"><text x="58" y="20">相关系数 ρ(sx, sy)</text>${result.surface.map((p) => `<rect x="${X(p.dx) - cell / 2}" y="${Y(p.dy) - cell / 2}" width="${cell + 0.05}" height="${cell + 0.05}" fill="${scoreColor(p.score)}"/>`).join("")}<rect x="58" y="42" width="${size}" height="${size}" fill="none" stroke="currentColor" opacity=".4"/>${[-6, -3, 0, 3, 6].map((v) => `<text x="${X(v)}" y="355" text-anchor="middle">${v}</text><text x="45" y="${Y(v) + 4}" text-anchor="end">${v}</text>`).join("")}<text x="352" y="380" text-anchor="end">sx / px →</text><text x="10" y="32">sy / px ↓</text>${Math.abs(truth.dx) <= LIMIT && Math.abs(truth.dy) <= LIMIT ? `<path d="M${X(truth.dx) - 7},${Y(truth.dy)}h14M${X(truth.dx)},${Y(truth.dy) - 7}v14" stroke="#f5e0ac" stroke-width="2"/><circle cx="${X(truth.dx)}" cy="${Y(truth.dy)}" r="8" stroke="#263c33" fill="none"/>` : ""}${result.best ? `<circle cx="${X(result.best.dx)}" cy="${Y(result.best.dy)}" r="4" fill="none" stroke="${result.offset ? "#e9f4ff" : "#f5a76a"}" stroke-width="2"/>` : ""}</svg>`;
}
// A static downsampled drawing uses the same linear [0,1] display range as the
// live canvas. Model estimates and errors still use every declared ROI sample.
export function imageFigure(values, reference = null) {
  let pixels = "";
  for (let y = 0; y < HEIGHT; y += 2)
    for (let x = 0; x < WIDTH; x += 2) {
      const v = values[y * WIDTH + x],
        r = reference?.[y * WIDTH + x],
        c = Number.isFinite(v)
          ? reference
            ? `rgb(${Math.round(255 * Math.max(0, Math.min(1, r)))} ${Math.round(255 * Math.max(0, Math.min(1, v)))} ${Math.round(255 * Math.max(0, Math.min(1, v)))})`
            : `rgb(${Array(3)
                .fill(Math.round(255 * Math.max(0, Math.min(1, v))))
                .join(" ")})`
          : "#8b7095";
      pixels += `<rect x="${x}" y="${y}" width="2.01" height="2.01" fill="${c}"/>`;
    }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="同一线性显示范围的合成观测对照">${pixels}</svg>`;
}
