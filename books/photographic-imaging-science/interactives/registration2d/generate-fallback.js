import { writeFile } from "node:fs/promises";
import { capturePair, estimateTranslation2D, resample } from "./model.js";
import { correlationFigure, imageFigure } from "./figures.js";
const p = { dx: 2.5, dy: -1.75 },
  f = capturePair(p),
  r = estimateTranslation2D(f.reference, f.moving),
  embed = (svg, x, y, w, h) =>
    svg.replace("<svg ", `<svg x="${x}" y="${y}" width="${w}" height="${h}" `),
  imgs = [
    f.reference,
    f.moving,
    resample(f.moving, r.offset.dx, r.offset.dy),
    resample(f.moving, p.dx, p.dy),
  ],
  labels = [
    "参考观测",
    "移动观测",
    "按观测估计配准 · 红/青",
    "按生成真值配准 · 红/青",
  ];
await writeFile(
  new URL("./fallback.svg", import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1140" viewBox="0 0 800 1140" role="img" aria-label="互动示意：已知二维位移、相关面、观测估计与真值配准" style="color:#263c33;font:14px sans-serif"><style>text{fill:currentColor;font-family:sans-serif}</style><rect width="800" height="1140" fill="#fafbf9"/><text x="30" y="42" font-size="24">二维平移：同时寻找 sx 与 sy</text><text x="30" y="76">生成真值 (2.50, −1.75) px；向右、向下为正。</text>${imgs
    .map((v, i) => {
      const x = 30 + (i % 2) * 380,
        y = 115 + Math.floor(i / 2) * 280;
      return `<text x="${x}" y="${y - 10}">${labels[i]}</text>${embed(imageFigure(v, i > 1 ? f.reference : null), x, y, 350, 250)}`;
    })
    .join(
      "",
    )}${embed(correlationFigure(r, p), 30, 680, 420, 390)}<text x="460" y="750">估计 (${r.offset.dx}, ${r.offset.dy}) px</text><text x="460" y="786">${r.points.length}个共同点 · 0.25 px网格</text><text x="460" y="822">相关峰 ${r.best.score.toFixed(5)}</text><text x="460" y="858">灰度RMSE ${r.best.rmse.toFixed(5)}</text><text x="460" y="905">真值十字独立保留；</text><text x="460" y="935">相同双线性取样仍有插值误差。</text><text x="30" y="1094">静态图每2 px绘制一点；估计使用所声明的共同区域，未读取生成位移。</text><text x="30" y="1121">无纹理、单向条纹、重复格纹、遮挡或搜索边界可能使估计不可用。</text></svg>`,
);
