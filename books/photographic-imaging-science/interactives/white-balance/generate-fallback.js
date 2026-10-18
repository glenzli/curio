import { writeFile } from "node:fs/promises";
import { experimentData, correlation } from "./model.js";
import { scatterFigure, NAMES } from "./figures.js";
const m = experimentData(),
  embed = (s, x, y, w, h) =>
    s.replace("<svg ", `<svg x="${x}" y="${y}" width="${w}" height="${h}" `);
await writeFile(
  new URL("./fallback.svg", import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="860" viewBox="0 0 800 860" role="img" aria-label="互动示意：白平衡与矩阵混合前后的噪声协方差传播" style="color:#303030;font:14px sans-serif"><style>text{fill:currentColor;font-family:sans-serif}</style><rect width="800" height="860" fill="#fafafa"/><text x="30" y="40" font-size="24">白平衡、标准差与通道相关性</text><text x="30" y="76">输入均值(800,1600,640) e⁻；白平衡(2,1,2.5)，共同读噪8 e⁻ RMS。</text>${[0, 1, 2].map((k) => embed(scatterFigure(m, k), 15 + 260 * k, 110, 250, 222)).join("")}${m.stages.map((s, k) => `<text x="30" y="${390 + k * 100}">${NAMES[k]}：均值 ${s.mean.map((v) => v.toFixed(1)).join(" / ")} e_ref</text><text x="30" y="${421 + k * 100}">σ真值 ${s.covariance.map((r, j) => Math.sqrt(r[j]).toFixed(3)).join(" / ")} e_ref；ρ₁₃=${correlation(s.covariance).toFixed(5)}</text>`).join("")}<text x="30" y="725">蓝色点：同一批输入的128个观测；橙线：解析1σ椭圆，非95%区域。</text><text x="30" y="760">Σout = M W Σin Wᵀ Mᵀ，另由独立潜在噪声源展开核对。</text><text x="30" y="795">输入电子参考单位；浮点、不裁切，输出Y不是XYZ或显示RGB。</text><text x="30" y="830">Gaussian高计数近似；4096样本协方差使用N−1。模型不模拟去马赛克。</text></svg>`,
);
