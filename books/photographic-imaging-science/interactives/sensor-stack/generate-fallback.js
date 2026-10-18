import { writeFile } from "node:fs/promises";
import { CONFIGURATIONS, crossSection, inspectStructure } from "./model.js";
import { structureFigure } from "./figures.js";
const embed = (svg, x, y, w, h) =>
    svg.replace("<svg ", `<svg x="${x}" y="${y}" width="${w}" height="${h}" `),
  a = CONFIGURATIONS.map((c) => inspectStructure(crossSection(c)));
await writeFile(
  new URL("./fallback.svg", import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="740" viewBox="0 0 900 740" role="img" aria-label="互动示意：FSI、BSI与逻辑堆栈的功能层序和结构核对" style="color:#263c33;font:14px sans-serif"><style>text{fill:currentColor;font-family:sans-serif}</style><rect width="900" height="740" fill="#fafbf9"/><text x="30" y="42" font-size="24">入光侧与逻辑堆栈：两条独立的分类轴</text><text x="30" y="77">橙色到感光硅为止；蓝色为光电转换之后的电信号。</text>${CONFIGURATIONS.map((c, i) => `<text x="${30 + i * 290}" y="117" font-size="18">${c.title}</text>${embed(structureFigure({ ...c, separation: 80, progress: 100 }), 25 + i * 290, 133, 270, 436)}`).join("")}<text x="30" y="605">到感光硅前经过前侧金属层：${a.map((v) => (v.metalBeforeSilicon ? "是" : "否")).join(" / ")}</text><text x="30" y="637">独立逻辑晶圆：否 / 否 / 是；功能晶圆数：${a.map((v) => v.functionalWafers).join(" / ")}。</text><text x="30" y="675">层距为展示间距；微透镜、CFA、支撑与键合不计入功能晶圆数。</text><text x="30" y="708">独立参照核对层序与连接；不由结构名称推算QE、噪声、读速或快门同步性。</text></svg>`,
);
