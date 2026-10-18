import { writeFile } from "node:fs/promises";
import { eiBudget } from "./model.js";
import {
  allocationFigure,
  monitorFigure,
  patchesFigure,
  markerData,
} from "./figures.js";
const m = eiBudget({ eiStops: 1, policy: "metered" }),
  embed = (s, x, y, w, h) =>
    s.replace("<svg ", `<svg x="${x}" y="${y}" width="${w}" height="${h}" `);
await writeFile(
  new URL("./fallback.svg", import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1110" viewBox="0 0 800 1110" role="img" aria-label="互动示意：EI、实际曝光、固定记录与监看链的真值对照" style="color:#303030;font:14px sans-serif"><style>text{fill:currentColor;font-family:sans-serif}</style><rect width="800" height="1110" fill="#fafafa"/><text x="30" y="40" font-size="24">EI改变了哪一级信号？</text><text x="30" y="76">EI 1600按表少曝一档，固定记录链；中灰500 e⁻，监看在线性域补2倍。</text>${embed(allocationFigure(m), 30, 110, 740, 220)}<text x="30" y="365">中灰上方6 stop、下方${m.shadow.toFixed(3)} stop；传感器总工程比不变。</text><text x="30" y="400">输入端SNR=${m.gray.snr.toFixed(3)}；无量化中灰监看线性值0.18。</text><text x="30" y="428">${markerData(
    m,
  )
    .map((d) => d.label + " " + d.value.toFixed(3) + " stop")
    .join(
      "；",
    )}</text>${embed(monitorFigure(m), 30, 435, 740, 335)}${embed(patchesFigure(m), 30, 790, 740, 197)}<text x="30" y="1030">实线：有限ADC/Log位深；虚线：保留同样截顶的无量化对照。</text><text x="30" y="1065">教学Log和Gamma硬白点；非LogC4或厂商LUT。监看白不等于RAW白。</text><text x="30" y="1095">固定满阱32000 e⁻与4 e⁻读噪；已剪切输入不能由后续编码恢复。</text></svg>`,
);
