import { writeFile } from "node:fs/promises";
import { apertureBudget } from "./model.js";
import { rayFigure, maskFigure } from "./figures.js";
const m = apertureBudget(),
  embed = (svg, x, y, w, h) =>
    svg.replace("<svg ", `<svg x="${x}" y="${y}" width="${w}" height="${h}" `);
await writeFile(
  new URL("./fallback.svg", import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="970" viewBox="0 0 800 970" role="img" aria-label="互动示意：真实孔径逐面截光与入口平面的三圆交集" style="color:#263c33;font:14px sans-serif"><style>text{fill:currentColor;font-family:sans-serif}</style><rect width="800" height="970" fill="#fafbf9"/><text x="30" y="42" font-size="24">三个真实孔径，逐面判断是否通过</text><text x="30" y="77">视场2°；前、中、后通光半径4、1.5、1.2 mm；两组10、20 D。</text>${embed(rayFigure(m), 30, 100, 740, 398)}${embed(maskFigure(m), 30, 515, 420, 350)}<text x="470" y="590">轴上限制：${m.limiting.join("、")}</text><text x="470" y="635">光线格面积 ${m.sample.area.toFixed(5)} mm²</text><text x="470" y="680">圆交真值 ${m.truth.toFixed(5)} mm²</text><text x="470" y="725">相对轴上 ${(100 * m.relativeArea).toFixed(3)}%</text><text x="470" y="770">蓝色填充为共同通光区域。</text><text x="30" y="905">逐面追迹在首次遮挡处结束；圆交面积通过独立ABCD投影和圆弧积分求出。</text><text x="30" y="937">一阶薄镜组、真实圆孔；面积比不包含cos⁴θ或衍射，不作为完整照度预测。</text></svg>`,
);
