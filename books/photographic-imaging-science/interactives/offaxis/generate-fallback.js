import { writeFile } from "node:fs/promises";
import { illumination } from "./model.js";
import { geometryFigure, curveData, illuminationFigure } from "./figures.js";
const m = illumination(),
  embed = (svg, x, y, w, h) =>
    svg.replace("<svg ", `<svg x="${x}" y="${y}" width="${w}" height="${h}" `);
await writeFile(
  new URL("./fallback.svg", import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="940" viewBox="0 0 800 940" role="img" aria-label="互动示意：cos⁴θ的三个几何因子与有限圆瞳积分" style="color:#263c33;font:14px sans-serif"><style>text{fill:currentColor;font-family:sans-serif}</style><rect width="800" height="940" fill="#fafbf9"/><text x="30" y="42" font-size="24">离轴照度：投影 × 距离 × 接收面</text><text x="30" y="77">θ=45°，a/z=0.05；固定平行出瞳与像面，无遮挡。</text>${embed(geometryFigure(m), 30, 100, 740, 440)}${embed(illuminationFigure(curveData(m.radiusRatio), m.angle), 30, 570, 740, 300)}<text x="30" y="900">cos⁴θ=${m.smallPupil.toFixed(5)}；有限圆瞳解析真值=${m.truth.toFixed(7)}。</text><text x="30" y="927">实线：面积积分；虚线：小瞳近似；点：独立圆周积分。未含机械截光。</text></svg>`,
);
