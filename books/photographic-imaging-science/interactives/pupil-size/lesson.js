import { pupilBudget } from "./model.js";
import { control, number } from "../common/lesson-view.js";
import { rayArrow } from "../common/optics-drawing.js";
function diagram(m, s) {
  const yc = 165,
    front = 110,
    pupil = s.frontDistance === 0 ? front : 540,
    range = m.frontClearance * 0.62,
    py = (y) => yc - (95 * y) / range;
  let body = `<path d="M45 ${yc}H690" stroke="currentColor" opacity=".2"/><text x="110" y="34" text-anchor="middle">前部开口</text><text x="${pupil}" y="62" text-anchor="middle">入瞳参考平面</text>`;
  for (const r of m.rays) {
    const a = [front, py(r.yFront)],
      b = [pupil, py(r.yPupil)],
      color = r.angle === 0 ? "#388da7" : r.angle < 0 ? "#af824f" : "#8e78ad";
    body += `<path d="M${a}L${b}" fill="none" stroke="${color}" stroke-width="2" opacity=".8"/>${rayArrow(a, b, color)}`;
  }
  body += `<path d="M${front} 70V${py(m.frontClearance / 2)}m0 ${(2 * 95 * m.frontClearance) / 2 / range}V260" stroke="currentColor" stroke-width="5"/><path d="M${pupil} ${py(m.entrance / 2)}V${py(-m.entrance / 2)}" stroke="#388da7" stroke-width="3"/><text x="${pupil + 18}" y="${yc - 8}">D入瞳</text><text x="${(front + pupil) / 2}" y="287" text-anchor="middle">空前部空间 ℓ=${number(s.frontDistance)} mm · 无折射面</text><text x="370" y="324" text-anchor="middle">实际光孔直径 = 入瞳直径 / 前组瞳放大率</text><text x="370" y="355" text-anchor="middle" font-size="16">各颜色为不同入射方向，仍是同一波长；纵向尺寸按数值读取</text>`;
  return `<svg class="drawing" role="img" aria-label="前部无遮挡空间中的光束包络与入瞳" viewBox="0 0 740 380"><style>text{font-family:inherit;fill:currentColor}</style>${body}</svg>`;
}
export const spec = {
  title: "焦距、入瞳与通光余量",
  alt: "互动示意：焦距光圈、实际光孔、前部通光包络与毛坯质量",
  intro:
    "先把视场半角设为零，核对 f/N；再留出一段空前部空间，观察离轴光束需要多少额外开口。毛坯质量用来比较尺寸缩放，不代表整支镜头重量。",
  staticCaption:
    "400 mm、f/4；入瞳放大率1.5；空前部空间40 mm、半视场8°；厚10 mm、密度2.5 g/cm³。",
  note: "入瞳D=f/N，实际光孔D/M入瞳。前部开口模型限定入口与入瞳参考面之间为空气、没有折射面，视场独立给定；真实镜头按完整瞳与机械孔追迹。质量仅为该开口直径的实心圆柱毛坯ρπD²t/4，含mm³到cm³换算；不含曲面减材、镜筒和其他镜片。",
  controls: [
    control("focal", "焦距", 25, 800, 5, 400, " mm"),
    control("fNumber", "标称f数", 1.4, 16, 0.2, 4, "", 1),
    control("pupilMagnification", "前组瞳放大率", 0.5, 2, 0.1, 1.5, "", 1),
    control("frontDistance", "空前部空间长度", 0, 80, 5, 40, " mm"),
    control("halfAngle", "视场半角", 0, 30, 1, 8, "°"),
    control("thickness", "圆柱毛坯厚度", 3, 20, 1, 10, " mm"),
    control("density", "毛坯密度", 2, 5, 0.1, 2.5, " g/cm³", 1),
  ],
  presets: [
    {
      label: "轴上 · 400 mm f/4",
      values: { focal: 400, fNumber: 4, halfAngle: 0, frontDistance: 40 },
    },
    {
      label: "加上8°视场",
      values: { focal: 400, fNumber: 4, halfAngle: 8, frontDistance: 40 },
    },
    {
      label: "同焦距 f/2.8",
      values: { focal: 400, fNumber: 2.8, halfAngle: 0 },
    },
    {
      label: "同f数 · 焦距加倍",
      values: { focal: 800, fNumber: 4, halfAngle: 0 },
    },
  ],
  evaluate(s) {
    const m = pupilBudget(s);
    return {
      figure: diagram(m, s),
      figureHeight: 380,
      figureMinWidth: 620,
      stats: [
        ["入瞳直径", number(m.entrance) + " mm", "由焦距与f数决定"],
        ["实际光孔直径", number(m.stop) + " mm", "另受瞳放大率影响"],
        [
          "前部所需开口",
          number(m.frontClearance) + " mm",
          "仅对所声明的空前部模型",
        ],
        ["圆柱毛坯质量", number(m.mass, 1) + " g", "几何与密度的示意预算"],
        [
          "包络/边缘光线差",
          Math.abs(m.frontClearance - m.tracedClearance).toExponential(2) +
            " mm",
          "解析包络与逐线坐标独立对照",
        ],
      ],
      reading: `入瞳截面积${number(m.apertureArea, 1)} mm²。只改变瞳放大率会改变实际光孔，不改变这一级轴上收光要求；视场与前部空间另增加通光余量。固定厚度时圆柱质量随直径平方变化，厚度也同比放大时才按立方缩放。`,
    };
  },
};
