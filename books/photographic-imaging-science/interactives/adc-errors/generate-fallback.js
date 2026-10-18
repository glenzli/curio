import { writeFile } from "node:fs/promises";
import { adcErrors } from "./model.js";
import { rampFigure, errorFigure, columnFigure } from "./figures.js";
const m = adcErrors(),
  embed = (s, x, y, w, h) =>
    s.replace("<svg ", `<svg x="${x}" y="${y}" width="${w}" height="${h}" `);
await writeFile(
  new URL("./fallback.svg", import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1310" viewBox="0 0 800 1310" role="img" aria-label="互动示意：列电压偏置、弯曲斜坡及码宽非线性的独立对照" style="color:#303030;font:14px sans-serif"><style>text{fill:currentColor;font-family:sans-serif}</style><rect width="800" height="1310" fill="#fafafa"/><text x="30" y="40" font-size="24">列偏置与斜坡非线性</text><text x="30" y="76">8 bit、1 V、10 MHz；曲率0.45，列偏置幅度2理想LSB。</text>${embed(rampFigure(m), 30, 105, 740, 300)}${embed(columnFigure(m), 30, 425, 740, 265)}${embed(errorFigure(m), 30, 710, 740, 260)}${embed(errorFigure(m, "inl"), 30, 980, 740, 260)}<text x="30" y="1255">蓝线：实际斜坡；灰虚线：理想斜坡；棕线：所选列输入。</text><text x="30" y="1290">阈值区间搜索对照连续交叉根；点为DNL/INL解析值。未含随机读噪。</text></svg>`,
);
