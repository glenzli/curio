import { writeFile } from "node:fs/promises";
import { rampState, thresholdTruth } from "./model.js";
import { rampFigure, clockFigure } from "./figures.js";
const p = {
    bits: 8,
    clockMHz: 10,
    fullScale: 1,
    inputFraction: 0.375,
    progress: 60,
  },
  m = rampState(p),
  t = thresholdTruth(0.375);
const embed = (figure, x, y, width, height) =>
  figure.replace(
    "<svg ",
    `<svg x="${x}" y="${y}" width="${width}" height="${height}" `,
  );
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="840" viewBox="0 0 800 840" role="img" aria-label="互动示意：单斜坡电压、比较器交叉时刻、公共时钟与锁存码" style="color:#263c33;font-family:sans-serif;font-size:13px"><style>text{fill:currentColor;font-family:sans-serif}</style><rect width="800" height="840" fill="#fafbf9"/><text x="30" y="42" font-size="24">单斜坡ADC：交叉时刻留下计数</text><text x="30" y="76" font-size="15">8 bit，1 V量程，10 MHz时钟；回放至扫描的60%</text>${embed(rampFigure(p), 30, 105, 740, 352)}${embed(clockFigure(p), 30, 478, 740, 208)}<text x="30" y="728" font-size="15">A输入0.375 V：9.6 µs锁存96 DN（01100000）</text><text x="30" y="759" font-size="14">B为0.750 V，仍在等待；C为1.050 V，本次扫描没有交叉。</text><text x="30" y="790" font-size="14">完整扫描 ${m.totalUs} µs / 256周期；逐电压区间核对A最终码为 ${t.code}。</text></svg>`;
await writeFile(new URL("./fallback.svg", import.meta.url), svg);
