import { control, number } from "../common/lesson-view.js";
import { imagePanels } from "../common/image-view.js";
import { memoOne } from "../common/field-view.js";
import { clippedPsf, directDensity, inside, CROP, SCALE } from "./model.js";
const centered = memoOne(
  (s) => clippedPsf({ ...s, shift: 0 }),
  ["front", "defocus"],
);
function mask(p) {
  return Float64Array.from({ length: 81 * 81 }, (_, i) =>
    inside(
      p,
      (((i % 81) - 40) * 2.8) / 80,
      ((Math.floor(i / 81) - 40) * 2.8) / 80,
    )
      ? 1
      : 0,
  );
}
function apparatus(p) {
  const X = (z) => 80 + 5 * z,
    Y = (y) => 150 - 38 * y;
  let out = '<path d="M20 150H650" stroke="currentColor" opacity=".2"/>';
  for (let j = 0; j < 13; j++) {
    const h = -0.9 + (1.8 * j) / 12,
      front = h - p.shift,
      pass = Math.abs(front) < p.front,
      color = pass ? "#40879a" : "#bb7946";
    out += `<path d="M${X(-8)} ${Y(front - (p.shift * 8) / 40)}L${X(0)} ${Y(front)}${pass ? `L${X(40)} ${Y(h)}L${X(80)} ${Y(p.shift)}` : ""}" stroke="${color}" stroke-width="1.4" fill="none" opacity=".8"/>`;
    if (!pass)
      out += `<path d="M${X(0) - 3} ${Y(front) - 3}l6 6m-6 0l6-6" stroke="${color}"/>`;
  }
  for (const [z, r, label] of [
    [0, p.front, "前部开口"],
    [40, 1, "孔径光阑 / 理想薄镜"],
  ])
    out += `<path d="M${X(z)} ${Y(3.5)}V${Y(r)}M${X(z)} ${Y(-r)}V${Y(-3.5)}" stroke="currentColor" stroke-width="4"/><text x="${X(z)}" y="15" text-anchor="middle" font-size="15">${label}</text>`;
  return `<svg class="drawing" role="img" aria-label="平行离轴光束在前孔和孔径光阑处的通过情况" viewBox="0 0 720 310"><style>text{fill:currentColor;font-family:inherit}</style>${out}<text x="480" y="25" font-size="14">名义焦点</text><text x="30" y="293" font-size="14">蓝：通过；橙：前孔遮挡。图示名义焦面，离焦另在下方点像计算。</text></svg>`;
}
export const spec = {
  title: "离轴瞳形状与猫眼点像",
  alt: "互动示意：前孔投影、有效瞳和同一照明下的离焦PSF",
  intro:
    "把平行光束从轴上移向边缘。前部开口截去一侧光线后，先看有效瞳的轮廓，再看同一照明下的离焦点像。",
  staticCaption:
    "光阑归一半径1，前孔半径1.2，投影偏移0.95；550 nm、参考f/4，瞳边缘离焦2波，共同显示增益8倍。",
  note: "两个平面圆孔的投影交集，理想薄镜接局部标量Fourier成像。瞳半径5 mm、薄镜焦距40 mm，前孔与光阑相隔40 mm；横纵比例不同，子午图高度对应瞳图的横坐标。离焦波前为cλρ²；固定λN坐标。除二次离焦外波前平坦，忽略瞳畸变与自然照度项。PSF全场积分保留通光面积/π；两图使用共同显示增益，超过白点的样点显示为白，计算保留原值。二维64格孔径、4倍补零；像面0.55 μm步长、44.55 μm窗口。",
  controls: [
    control("shift", "前孔投影偏移 d/r", 0, 2.4, "any", 0.95, "", 3),
    control("front", "前孔与光阑半径比", 0.7, 1.5, 0.05, 1.2, "", 2),
    control("defocus", "瞳边缘离焦", -3, 3, 0.1, 2, " 波", 1),
    control("displayGain", "共同点像显示增益", 1, 16, 1, 8, "×"),
  ],
  presets: [
    { label: "轴上", values: { shift: 0 } },
    { label: "移到边缘", values: { shift: 0.95, front: 1.2, defocus: 2 } },
    { label: "前孔足够大", values: { shift: 0.2, front: 1.5 } },
    { label: "完全被挡", values: { shift: 2.4, front: 1.2 } },
    { label: "回到名义焦面", values: { defocus: 0 } },
    { label: "焦点另一侧", values: { defocus: -2 } },
  ],
  replay: {
    key: "shift",
    start: 0,
    end: 2.4,
    durationMs: 10000,
    label: "从轴上移向边缘",
    startOnFirstPlay: true,
  },
  evaluate(s) {
    const m = clippedPsf(s),
      axis = centered(s),
      white = Math.PI / (4 * SCALE * SCALE * s.displayGain),
      images = imagePanels(
        [
          {
            label: "1 轴上有效瞳",
            values: mask(axis.p),
            width: 81,
            height: 81,
            gamma: 1,
            scale: "归一坐标−1.4…+1.4",
          },
          {
            label: "2 当前离轴有效瞳",
            values: mask(m.p),
            width: 81,
            height: 81,
            gamma: 1,
            scale: "交集直接决定通过的孔径",
          },
          {
            label: "3 同一前孔的轴上点像",
            values: axis.crop,
            width: CROP,
            height: CROP,
            white,
            scale: `0.55 μm步长；共同显示${s.displayGain}×`,
          },
          {
            label: "4 当前离轴点像",
            values: m.crop,
            width: CROP,
            height: CROP,
            white,
            detail: m.throughput ? "含通光量降低" : "无通过光线",
            scale: `与轴上相同白点${number(white, 4)} μm⁻²`,
          },
        ],
        { title: "有效瞳轮廓与离焦点像", tileHeight: 245 },
      ),
      top = apparatus(m.p);
    const figure = `<svg class="drawing" viewBox="0 0 720 800">${top.replace("<svg ", '<svg x="0" y="0" width="720" height="310" ')}${images.figure.replace("<svg ", '<svg x="0" y="310" width="720" height="490" ')}</svg>`;
    const reference = directDensity(m, 0.5, 0.25),
      sample = m.density[m.size + 2];
    return {
      figure,
      liveFigure: top + images.liveFigure,
      figureHeight: 800,
      stats: [
        [
          "通过比例 · 网格",
          number(100 * m.throughput, 2) + "%",
          `圆弧解析${number((100 * m.analyticArea) / Math.PI, 2)}%`,
        ],
        ["全像面PSF积分", number(m.energy, 6), "随通光量降低"],
        ["当前窗口能量", number(m.cropEnergy, 6), "窗口外能量未重新归一"],
      ],
      reading: `圆孔交集的解析面积为${number(m.analyticArea, 6)} r²，网格为${number(m.area, 6)} r²。相量直接求和与FFT探针相差${Math.abs(reference - sample).toExponential(2)} μm⁻²。离轴后形状与通光量同时改变；完全遮挡时两者都为零。`,
    };
  },
};
