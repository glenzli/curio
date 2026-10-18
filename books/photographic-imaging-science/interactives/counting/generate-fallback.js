import { writeFile } from "node:fs/promises";
import { observations, observedMoments, countingTruth } from "./model.js";
import { eventFigure, histogramFigure } from "./figures.js";
const p = { incident: 24, eta: 0.5 },
  samples = observations(p),
  m = observedMoments(samples),
  t = countingTruth(p);
const embed = (figure, x, y, width, height) =>
  figure.replace(
    "<svg ",
    `<svg x="${x}" y="${y}" width="${width}" height="${height}" `,
  );
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="860" viewBox="0 0 800 860" role="img" aria-label="互动示意：Poisson光子到达经QE筛选后，单次事件与多次曝光计数分布" style="color:#263c33;font-family:sans-serif;font-size:13px"><style>text{fill:currentColor;font-family:sans-serif}</style><rect width="800" height="860" fill="#fafbf9"/><text x="30" y="42" font-size="24">光子计数与QE筛选</text><text x="30" y="76" font-size="15">Poisson入射均值24，QE=50%；蓝色为入射，绿色为收集电子</text>${embed(eventFigure(p, 100), 30, 104, 740, 280)}${embed(histogramFigure(p, samples), 30, 405, 740, 344)}<text x="30" y="789" font-size="14">4096次完整曝光：观测电子均值 ${m.electronMean.toFixed(3)}，方差 ${m.electronVariance.toFixed(3)}</text><text x="30" y="819" font-size="14">真值均值 ${t.mean}、方差 ${t.variance}；若固定每次24个入射，方差改为6。</text></svg>`;
await writeFile(new URL("./fallback.svg", import.meta.url), svg);
