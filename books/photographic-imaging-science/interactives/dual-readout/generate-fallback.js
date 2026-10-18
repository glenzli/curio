import { writeFile } from "node:fs/promises";
import {
  dualMetrics,
  dualTruth,
  dualObservations,
  dualMoments,
} from "./model.js";
import { readoutSequence, scatterFigure } from "./figures.js";
const p = { mean: 1024, highNoise: 1, lowNoise: 1, mode: "shared" },
  m = dualMetrics(p),
  t = dualTruth(p),
  o = dualObservations(p),
  observed = dualMoments(o.samples);
const embed = (figure, x, y, width, height) =>
  figure.replace(
    "<svg ",
    `<svg x="${x}" y="${y}" width="${width}" height="${height}" `,
  );
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="860" viewBox="0 0 800 860" role="img" aria-label="互动示意：同一次曝光的高低增益读数共享散粒噪声，观测协方差与解析真值" style="color:#263c33;font-family:sans-serif;font-size:13px"><style>text{fill:currentColor;font-family:sans-serif}</style><rect width="800" height="860" fill="#fafbf9"/><text x="30" y="42" font-size="24">同一份电荷，两个增益读数</text><text x="30" y="76" font-size="15">均值1024 e⁻，共同读噪1.5 e⁻，两路径独立读噪各1 e⁻</text>${embed(readoutSequence(p, o.example, o.samples[0]), 30, 105, 740, 200)}${embed(scatterFigure(p, o), 30, 323, 740, 380)}<text x="30" y="739" font-size="14">蓝点：前256组观测；虚线：真值协方差的1σ椭圆</text><text x="30" y="773" font-size="14">4096组观测协方差 ${observed.covariance.toFixed(3)}；真值 ${t.covariance} (e⁻)²</text><text x="30" y="807" font-size="14">融合RMS真值 ${Math.sqrt(t.variance).toFixed(4)} e⁻；遗漏协方差会错报 ${Math.sqrt(m.omitCovariance).toFixed(4)} e⁻</text></svg>`;
await writeFile(new URL("./fallback.svg", import.meta.url), svg);
