import { writeFile } from "node:fs/promises";
import { coatingBudget } from "./model.js";
import { incidenceFigure, sweepData, reflectanceFigure } from "./figures.js";
const m = coatingBudget(),
  embed = (svg, x, y, w, h) =>
    svg.replace("<svg ", `<svg x="${x}" y="${y}" width="${w}" height="${h}" `);
await writeFile(
  new URL("./fallback.svg", import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1140" viewBox="0 0 800 1140" role="img" aria-label="互动示意：斜入射s/p镀膜的Snell角度、反射谱与能流对照" style="color:#263c33;font:14px sans-serif"><style>text{fill:currentColor;font-family:sans-serif}</style><rect width="800" height="1140" fill="#fafbf9"/><text x="30" y="42" font-size="24">斜入射：分别求 s、p，再按能流合成</text><text x="30" y="77">空气 / n=1.38单层 / n=1.52基底；d=99.638 nm，θ₀=45°。</text>${embed(incidenceFigure(m), 30, 100, 740, 364)}${embed(reflectanceFigure(sweepData(m, "angle"), m, "angle"), 30, 475, 740, 280)}${embed(reflectanceFigure(sweepData(m, "wavelength"), m, "wavelength"), 30, 780, 740, 280)}<text x="30" y="1090">Rs=${(100 * m.s.R).toFixed(5)}%，Rp=${(100 * m.p.R).toFixed(5)}%；两偏振各自R+T=1。</text><text x="30" y="1120">实线为s/p，虚线为等能流平均；点为独立Fresnel递推。无吸收、无色散。</text></svg>`,
);
