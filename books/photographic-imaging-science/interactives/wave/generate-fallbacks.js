import { writeFile } from "node:fs/promises";
import {
  propagate,
  indexAt,
  otfAt,
  circularOtf,
  polarAmplitude,
} from "./model.js";

// Reproducible, unnumbered book figures. Run from any directory with Node.
for (const [folder, p, title] of [
  ["pupil", {}, "复瞳 → 复振幅 → PSF → OTF"],
  ["wavefront", { coma: 0.12 }, "彗差波前与衍射点像 · 0.12 λ RMS"],
]) {
  const g = propagate(p),
    peak = g.count / (g.size * g.size * g.imageStepUm ** 2);
  const continuous = polarAmplitude(p),
    norm = continuous[0] ** 2 + continuous[1] ** 2;
  const cards = [
    "P = A exp(2πiW/λ)",
    "U = Fourier(P)",
    "h ∝ |U|²，∫h = 1",
    "H = Fourier(h)",
  ];
  let content = cards
    .map(
      (label, i) =>
        `<rect x="${35 + 230 * i}" y="66" width="218" height="46" rx="6" fill="#edf1f3"/><text x="${144 + 230 * i}" y="95" text-anchor="middle" font-size="16">${label}</text>`,
    )
    .join("");
  let heat = "";
  for (let j = -24; j <= 24; j++)
    for (let i = -24; i <= 24; i++) {
      const value = g.psf[indexAt(g, i, j)] / peak;
      const gray = Math.round(
        (255 * Math.log1p(1000 * value)) / Math.log(1001),
      );
      heat += `<rect x="${48 + (i + 24) * 5}" y="${165 + (j + 24) * 5}" width="5" height="5" fill="rgb(${gray},${gray},${gray})"/>`;
    }
  content += `<rect x="48" y="165" width="245" height="245" fill="#10171c"/>${heat}<text x="48" y="145" font-size="17">PSF：暗环增强显示</text><text x="48" y="434" font-size="14">横纵范围 ±26.4 µm</text>`;
  const x = (v) => 360 + v * 580,
    y = (v) => 396 - v * 225;
  const series = [
    { color: "#648cac", fn: (k) => Math.hypot(...otfAt(g, k)) },
    { color: "#b78952", fn: (k) => otfAt(g, k)[0] },
    { color: "#9b627a", fn: (k) => otfAt(g, k)[1] },
    { color: "#6e8766", fn: (k) => circularOtf(k / 64) },
  ];
  content += `<path d="M360 165V440M360 396H940" stroke="#79868a" fill="none"/><text x="360" y="145" font-size="17">复 OTF 与 MTF</text>`;
  for (const seriesItem of series) {
    const d = Array.from(
      { length: 65 },
      (_, k) =>
        `${k ? "L" : "M"}${x(k / 64).toFixed(2)} ${y(seriesItem.fn(k)).toFixed(2)}`,
    ).join(" ");
    content += `<path d="${d}" stroke="${seriesItem.color}" stroke-width="2.5" fill="none"/>`;
  }
  content += `<text x="360" y="463" font-size="14">蓝：MTF　棕：Re H　紫：Im H　绿：理想圆瞳参考</text><text x="940" y="418" text-anchor="end" font-size="14">ν / νc = 1</text>`;
  content += `<text x="48" y="505" font-size="15">λ = 550 nm · f/8 · νc = 227.27 lp/mm · 轴上比：离散 ${g.onAxisRatio.toFixed(4)} / 连续积分 ${norm.toFixed(4)}</text><text x="48" y="535" font-size="15">Parseval 比 = ${g.parseval.toFixed(8)} · OTF 另用直接瞳相关检验；无像差时对照 Airy 与圆盘重叠。</text><text x="48" y="565" font-size="14">单色、标量、近轴、均匀圆瞳；不含像素积分。PSF 图的非线性亮度不能用于读取能量。</text>`;
  const label =
    folder === "pupil"
      ? "复瞳、复振幅、PSF 和 OTF 的计算关系及圆瞳真值对照"
      : "归一化波前模式经复瞳传播后的 PSF、复 OTF 与独立对照";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="600" viewBox="0 0 1000 600" role="img" aria-label="互动示意：${label}"><rect width="1000" height="600" rx="12" fill="#fff"/><g fill="#25333d" font-family="system-ui,-apple-system,'PingFang SC',sans-serif"><text x="35" y="40" font-size="23" font-weight="600">${title}</text>${content}</g></svg>\n`;
  await writeFile(new URL(`../${folder}/fallback.svg`, import.meta.url), svg);
}
