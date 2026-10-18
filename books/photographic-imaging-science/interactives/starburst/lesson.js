import { control, number } from "../common/lesson-view.js";
import { imagePanels } from "../common/image-view.js";
import { memoOne } from "../common/field-view.js";
import {
  starburst,
  display,
  radialLimit,
  directDensity,
  directions,
  WHITE,
  CROP,
  DISPLAY_STEP,
} from "./model.js";
const optics = memoOne(starburst, [
  "blades",
  "roundness",
  "rotation",
  "fNumber",
]);
export const spec = {
  title: "光阑直边怎样形成星芒",
  alt: "互动示意：规则叶片孔径、圆弧过渡和同尺度衍射星芒",
  intro:
    "观察同一个合焦点光源，改变孔径叶片数、边缘弯曲程度和旋转角度。左图给出实际参与计算的孔径，右图显示它的Fourier强度。",
  staticCaption:
    "550 nm，7边直边孔径、参考f/8；像面窗口177.1 μm，固定f/8圆孔参考白点及五个数量级的对数显示。",
  note: "标量单色、合焦、无像差；正多边形的径向边界线性过渡到圆，外接圆半径固定。它是声明的孔径形状族。PSF按单位总通量归一，几何面积另列。128格孔径、4倍补零；FFT密度在固定1.1 μm显示网格上线性插值。白点固定为550 nm、f/8圆孔峰值，对数映射仅帮助看弱光芒。",
  controls: [
    control("blades", "规则叶片数", 3, 12, 1, 7),
    control("roundness", "向圆形过渡", 0, 1, 0.05, 0, "", 2),
    control("rotation", "孔径旋转角", 0, 180, 1, 0, "°"),
    control("fNumber", "圆孔参考 f 数", 4, 16, 1, 8),
    control("decades", "弱光显示数量级", 3, 6, 1, 5),
  ],
  presets: [
    { label: "七边形直边", values: { blades: 7, roundness: 0, rotation: 0 } },
    { label: "八边形直边", values: { blades: 8, roundness: 0, rotation: 0 } },
    { label: "圆弧过渡", values: { roundness: 0.7 } },
    { label: "完全圆孔", values: { roundness: 1 } },
    {
      label: "孔径转15°",
      values: (s) => ({ rotation: (s.rotation + 15) % 180 }),
    },
  ],
  evaluate(s) {
    const m = optics(s),
      mask = Float64Array.from({ length: 81 * 81 }, (_, i) => {
        const x = (((i % 81) - 40) * 2.2) / 80,
          y = ((Math.floor(i / 81) - 40) * 2.2) / 80;
        return Math.hypot(x, y) < radialLimit(m.p, Math.atan2(y, x)) ? 1 : 0;
      });
    const images = imagePanels(
      [
        {
          label: "1 归一化孔径",
          values: mask,
          width: 81,
          height: 81,
          gamma: 1,
          scale: "外接圆半径1；形状与旋转入模",
        },
        {
          label: "2 合焦点光源的衍射图",
          values: display(m.crop, s.decades),
          width: CROP,
          height: CROP,
          gamma: 1,
          scale: `固定${number(CROP * DISPLAY_STEP, 1)} μm窗口；对数显示`,
        },
      ],
      { title: "孔径与衍射星芒", tileHeight: 330 },
    );
    return {
      ...images,
      figureHeight: 330,
      stats: [
        [
          "直边孔径的法线方向数",
          String(directions(s.blades).length),
          s.roundness === 0 ? "相反法线重合时只计一次" : "作为原直边孔径的参照",
        ],
        [
          "几何孔径面积",
          number(m.area / Math.PI, 4) + " πr²",
          `连续积分${number(m.continuousArea / Math.PI, 4)}`,
        ],
        ["显示窗口内能量", number(100 * m.retained, 2) + "%", "全FFT场积分为1"],
      ],
      reading: `光阑直边的两侧法线给出光芒方向；偶数边有成对平行边，奇数边的相反方向另计。边缘逐渐变圆时，图中的方向性随实际孔径计算而变。全场积分${number(m.energy, 8)}；FFT与直接相量探针差${Math.abs(m.density[2 * m.size + 3] - directDensity(m, 0.75, 0.5)).toExponential(2)} μm⁻²。白点始终为${number(WHITE, 6)} μm⁻²，点像未逐图拉亮。`,
    };
  },
};
