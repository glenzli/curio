import { control, number } from "../common/lesson-view.js";
import { thinGroup } from "../common/optics-drawing.js";
import { focusingFrame, zoomingFrame } from "./model.js";
const ALT = "互动示意：浮动对焦与变焦补偿的三维镜组运动、固定像面和近轴真值";
const C = { blue: "#2b82ac", amber: "#c1894d", gray: "#84909d" };
function section(m) {
  const x = (z) => 35 + 3.1 * z,
    y = (r) => 100 - 3 * r;
  let body = '<path d="M25 100H680" stroke="currentColor" opacity=".18"/>';
  for (const points of m.paths.filter((_, i) => i % 6 === 0)) {
    body +=
      '<polyline points="' +
      points.map((p) => x(p[0]) + "," + y(p[1])).join(" ") +
      '" fill="none" stroke="' +
      C.blue +
      '" stroke-width="2"/>';
  }
  m.groups.forEach((z, i) => {
    body += thinGroup(x(z), 100, 40, m.powers[i], i === 1 ? C.amber : C.blue);
    body +=
      '<text x="' +
      x(z) +
      '" y="' +
      (i === 1 ? 40 : 22) +
      '" text-anchor="middle" font-size="13">G' +
      (i + 1) +
      " · " +
      number(z, 2) +
      " mm</text>";
  });
  body +=
    '<path d="M' +
    x(200) +
    ' 45v110" stroke="' +
    C.amber +
    '" stroke-width="3"/><text x="' +
    x(200) +
    '" y="185" text-anchor="end" font-size="13">固定像面 200 mm</text><text x="35" y="185" font-size="13">z / mm · 径向尺寸×16</text>';
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="与三维场景相同坐标的子午截面" viewBox="0 0 700 205">' +
    body +
    "</svg>"
  );
}
const base = {
  alt: ALT,
  scaleNote: "轴向坐标为mm，径向尺寸放大16倍；镜组以等效平面和正负号表示。",
  note: "复用第16章+10/−20/+20 D三薄组和固定z=200 mm像面。径向放大16倍仅用于观看；轨迹、交点与下方截面共用同一组坐标。套筒和滑块为运动示意，未加入孔径截光、像差、衍射或马达伺服。",
  legend: [
    ["正组与同一单色光束", C.blue],
    ["负组与补偿位置", C.amber],
    ["固定导轨", C.gray],
  ],
  camera: [230, 85, 190],
  target: [100, 0, 0],
  distance: [130, 650],
};
export const focusingSpec = {
  ...base,
  title: "固定像面下的浮动对焦",
  intro:
    "传感器固定，前组固定。比较只移动后组与两组协同：都可以让近处物点合焦，但固定远景方向的像高尺度会不同。",
  staticCaption:
    "物距1 m；双组协同时G2约57.997 mm、G3约147.197 mm，固定远景尺度100 mm/rad。径向尺寸×16。",
  playLabel: "从远景逐渐对近",
  replay: { key: "vergence", start: 0, end: 2, seconds: 12 },
  controls: [
    {
      ...control("vergence", "物距倒数 1/s", 0, 2.5, 0.01, 1, " D", 2),
      format: (v) =>
        number(v, 2) + " D · " + (v === 0 ? "无穷远" : number(1 / v, 3) + " m"),
    },
    {
      ...control("coordinated", "对焦方式", 0, 1, 1, 1),
      format: (v) => (v ? "两组协同" : "只动后组"),
    },
  ],
  presets: [
    { label: "只动后组 · 1 m", values: { vergence: 1, coordinated: 0 } },
    { label: "两组协同 · 1 m", values: { vergence: 1, coordinated: 1 } },
    { label: "无穷远参考", values: { vergence: 0, coordinated: 1 } },
    {
      label: "0.4 m · 超出双约束行程",
      values: { vergence: 2.5, coordinated: 1 },
    },
  ],
  evaluate(s) {
    const m = focusingFrame(s);
    return {
      model: m,
      figure: section(m),
      figureHeight: 205,
      halt: m.halt,
      stats: [
        ["G2位置", number(m.groups[1], 4) + " mm", "前组与传感器固定"],
        ["G3位置", number(m.groups[2], 4) + " mm", "随物距求解"],
        [
          "实际几何弥散直径",
          number(m.spread * 1000, 6) + " μm",
          "未乘显示放大率",
        ],
        ["固定远景角尺度", number(m.scale, 4) + " mm/rad", "比较点像中心"],
        [
          "相对无穷远呼吸",
          number(m.breathingPercent, 3) + "%",
          "同一固定远景方向",
        ],
        [
          "独立计算差",
          m.referenceError.toExponential(2) +
            (m.referenceKind === "positions" ? " mm" : " / 单位入瞳高度"),
          m.referenceKind === "positions"
            ? "逐线求解与解析消元"
            : "逐线残差与矩阵残差",
        ],
      ],
      status: m.solved
        ? "已在行程内求得合焦位置。可绕场景查看两滑块沿同一轴分别移动。"
        : "行程内没有双约束解；显示50/150 mm参考位置及其实际离焦，停止回放。",
      reading: m.coordinated
        ? "两个移动组同时保持合焦与固定远景角尺度；后一个条件用来观察呼吸。近摄像差的变化需另用波前或完整处方计算。"
        : "后组可以单独把近物点对清，但角尺度随之改变。切到两组协同，比较同一物距下的镜组位置和呼吸读数。",
    };
  },
};
export const zoomingSpec = {
  ...base,
  title: "变焦组运动，补偿组跟随",
  intro:
    "拖动负变焦组，先锁住后方补偿组，再启用补偿。观察焦点是否仍落在固定的传感器上，同时比较有效焦距。",
  staticCaption:
    "G2位于35 mm；自动补偿使G3约140.825 mm，有效焦距约61.164 mm，像面固定200 mm。",
  playLabel: "播放变焦与补偿",
  replay: { key: "variator", start: 10, end: 60, seconds: 12 },
  controls: [
    control("variator", "负变焦组 G2", 10, 70, 0.1, 35, " mm", 1),
    {
      ...control("compensate", "补偿方式", 0, 1, 1, 1),
      format: (v) => (v ? "自动保持像面" : "锁定后组"),
    },
    control("compensator", "锁定时的 G3位置", 90, 190, 0.1, 150, " mm", 1),
  ],
  presets: [
    { label: "锁住补偿组", values: { compensate: 0, compensator: 150 } },
    { label: "恢复补偿", values: { compensate: 1 } },
    { label: "参考焦距100 mm", values: { variator: 50, compensate: 1 } },
    { label: "70 mm · 行程无解", values: { variator: 70, compensate: 1 } },
  ],
  evaluate(s) {
    const m = zoomingFrame(s);
    return {
      model: m,
      figure: section(m),
      figureHeight: 205,
      halt: m.halt,
      stats: [
        ["变焦组 G2", number(m.groups[1], 3) + " mm", "前组后方的轴向位置"],
        [
          "实际补偿组 G3",
          number(m.groups[2], 3) + " mm",
          "读取当前光路，未用旧解替代",
        ],
        ["有效焦距", number(m.focalLength, 4) + " mm", "三组矩阵"],
        [
          "实际近轴像面",
          m.imageZ === null ? "无有限像面" : number(m.imageZ, 4) + " mm",
          "传感器始终固定在200 mm",
        ],
        [
          "传感器弥散直径",
          number(m.spread * 1000, 4) + " μm",
          "未乘径向显示放大率",
        ],
        [
          "补偿解 / 解析差",
          m.referenceError === null
            ? "无行程内解"
            : m.referenceError.toExponential(2) + " mm",
          "独立消元根与逐线求根",
        ],
      ],
      status: m.halt
        ? "给定行程内没有补偿解；保留锁定组位置，显示实际离焦并停止回放。"
        : m.compensated
          ? "补偿组随变焦组移动，近轴像面保持在传感器上。"
          : "补偿组锁定；观察光束在传感器上的截面是否张开。",
      reading:
        "回放逐一求出每个焦距所需的补偿位置，播放速度只便于观察。机械凸轮与马达控制还需给定实际速度、加速度和负载。",
    };
  },
};
export const specs = [focusingSpec, zoomingSpec];
