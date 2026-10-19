import { control, number } from "../common/lesson-view.js";
import { imagePanels } from "../common/image-view.js";
import { signedColors } from "../common/field-view.js";
import {
  rotatingShutter,
  bladeFraction,
  midpointReference,
  WIDTH,
  HEIGHT,
} from "./model.js";
function windows(m) {
  const X = (t) => 90 + (520 * t) / (m.p.scan + m.p.exposure);
  return `<svg class="drawing" viewBox="0 0 720 140" role="img" aria-label="顶行、中行和底行的曝光窗口"><style>text{fill:currentColor;font-family:inherit;font-size:14px}</style>${[0, 0.5, 1].map((r, i) => `<text x="12" y="${30 + 36 * i}">${["顶行", "中行", "底行"][i]}</text><path d="M90 ${25 + 36 * i}H650" stroke="currentColor" opacity=".15"/><path d="M${X(r * m.p.scan)} ${25 + 36 * i}H${X(r * m.p.scan + m.p.exposure)}" stroke="#40879a" stroke-width="9" opacity=".6"/>`).join("")}<path d="M${X(m.now)} 8V112" stroke="#bb7946" stroke-width="2"/><text x="90" y="133">0 ms</text><text x="590" y="133">${number(m.p.scan + m.p.exposure, 2)} ms</text></svg>`;
}
export const spec = {
  title: "旋转物体的逐行曝光",
  alt: "互动示意：旋转叶片在滚动与全局曝光下的时间积分",
  intro:
    "同一刚体被各行在不同时刻采样，形成弯曲轮廓。缩短曝光会减小拖影，整帧的扫描时间差保持不变。",
  staticCaption:
    "20转/s、两片叶片；顶行到底行起始差18 ms，每行曝光1 ms。参考全局窗口为0—1 ms。",
  note: "80×80像素中心样本，旋转平面叶片半角5°、半径31 px。每行起点为scan·y/(H−1)，矩形曝光内按周期角窗精确积分。全局图使用0…exposure共同窗口；瞬时图为回放时刻的刚体姿态。未完成曝光按完整曝光刻度累积，未加入像素面积、噪声或实际叶片材质。",
  controls: [
    control("speed", "转速", -50, 50, 1, 20, " 转/s"),
    control("scan", "顶行到底行起始差", 0, 30, 1, 18, " ms"),
    control("exposure", "单行曝光时间", 0.25, 10, 0.25, 1, " ms", 2),
    control("blades", "叶片数", 1, 4, 1, 2),
    control("phase", "初始角度", -90, 90, 1, 10, "°"),
    control("progress", "曝光进度", 0, 1, "any", 1, "", 3),
  ],
  presets: [
    { label: "缩短至0.25 ms", values: { exposure: 0.25 } },
    { label: "扫描差仍为18 ms", values: { scan: 18, speed: 20 } },
    { label: "全局同时曝光", values: { scan: 0 } },
    { label: "反向旋转", values: (s) => ({ speed: -s.speed }) },
    { label: "静止作对照", values: { speed: 0 } },
  ],
  replay: {
    key: "progress",
    start: 0,
    end: 1,
    durationMs: 8000,
    label: "逐行积累这一帧",
    startOnFirstPlay: true,
  },
  evaluate(s) {
    const m = rotatingShutter(s),
      difference = Float64Array.from(m.rolling, (v, i) => v - m.global[i]),
      images = imagePanels(
        [
          {
            label: "1 当前刚体姿态 · 瞬时",
            values: m.instant,
            width: WIDTH,
            height: HEIGHT,
            scale: `回放时刻${number(m.now, 2)} ms`,
          },
          {
            label: "2 滚动曝光的积累",
            values: m.rolling,
            width: WIDTH,
            height: HEIGHT,
            scale: "各行积分完整矩形时间窗",
          },
          {
            label: "3 同时开始的全局曝光",
            values: m.global,
            width: WIDTH,
            height: HEIGHT,
            scale: `参考窗口0…${number(s.exposure, 2)} ms`,
          },
          {
            label: "4 滚动减全局",
            values: signedColors(difference, 0.83),
            width: WIDTH,
            height: HEIGHT,
            rgb: true,
            gamma: 1,
            scale: "蓝负、橙正；固定±0.83",
          },
        ],
        { title: "同一旋转刚体的曝光与参考", tileHeight: 245 },
      ),
      top = windows(m);
    const row = 32,
      start = (s.scan * row) / (HEIGHT - 1),
      angle = Math.atan2(row - 39.5, 58 - 39.5),
      a = bladeFraction(
        angle,
        start,
        start + s.exposure,
        s.speed,
        s.phase,
        s.blades,
      ),
      b = midpointReference(angle, start, start + s.exposure, m.p, 4096);
    return {
      figure: `<svg class="drawing" viewBox="0 0 720 630">${top.replace("<svg ", '<svg y="0" width="720" height="140" ')}${images.figure.replace("<svg ", '<svg y="140" width="720" height="490" ')}</svg>`,
      liveFigure: top + images.liveFigure,
      figureHeight: 630,
      stats: [
        ["扫描期间转角差", number(m.scanAngle, 2) + "°", "由转速和scan决定"],
        ["单行曝光转角", number(m.blurAngle, 2) + "°", "缩短曝光会减小此项"],
        ["探针叶片覆盖率", number(a, 5), `4096点积分${number(b, 5)}`],
      ],
      reading: `顶行与底行的起始姿态相差${number(m.scanAngle, 2)}°；这与单行${number(m.blurAngle, 2)}°的曝光转角分别控制形变和模糊。探针的周期角窗积分与独立瞬时取样相差${Math.abs(a - b).toExponential(2)}。`,
    };
  },
};
