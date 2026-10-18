import { control, number } from "../common/lesson-view.js";
import { imagePanels, raster } from "../common/image-view.js";
import { memoOne } from "../common/field-view.js";
import {
  starburst,
  display,
  directions,
  polarDensity,
  WHITE,
} from "./model.js";
import {
  continuousPsf,
  boundaryDensity,
  IMAGE_SIZE,
  IMAGE_STEP,
} from "./continuous.js";
const keys = ["blades", "roundness", "rotation", "fNumber"];
const optics = memoOne(continuousPsf, keys);
const verify = memoOne((s) => {
  const g = starburst(s),
    r = polarDensity(s, 0.75, 0.5, 192, 2048);
  return { fft: g.density[2 * g.size + 3], polar: r.density };
}, keys);
function aperture(m) {
  const point = ([x, y]) => `${120 + 106 * x},${120 - 106 * y}`;
  const shape =
    m.p.roundness === 1
      ? '<circle cx="120" cy="120" r="106" fill="white"/>'
      : `<path d="M${m.shape.vertices.map(point).join("L")}Z" fill="white"/>`;
  const edge =
    m.p.roundness === 0
      ? `<path d="M${point(m.shape.vertices.at(-1))}L${point(m.shape.vertices[0])}" stroke="#4cadd1" stroke-width="2"/>`
      : "";
  return `<rect width="240" height="240" fill="#10171c"/>${shape}${edge}`;
}
function image(m, decades) {
  const center = (IMAGE_SIZE - 1) / 2,
    a = (m.p.rotation * Math.PI) / 180;
  const ends = [-1, 1]
    .map(
      (sign) =>
        `M${center + sign * 18 * Math.cos(a)},${center - sign * 18 * Math.sin(a)}L${center + sign * 120 * Math.cos(a)},${center - sign * 120 * Math.sin(a)}`,
    )
    .join("");
  return (
    raster(display(m.crop, decades), IMAGE_SIZE, IMAGE_SIZE, {
      size: IMAGE_SIZE,
      gamma: 1,
    }) +
    (m.p.roundness === 0
      ? `<path d="${ends}" stroke="#4cadd1" stroke-width="1.1" stroke-dasharray="4 4" opacity=".7"/>`
      : "")
  );
}
export const spec = {
  title: "光阑直边怎样形成星芒",
  alt: "互动示意：规则叶片孔径、圆弧过渡和同尺度衍射星芒",
  intro:
    "先切换七边形和八边形，比较光芒方向；再旋转孔径，观察光芒是否跟着转动。将边缘变圆，可看直边形成的方向性怎样减弱。",
  staticCaption:
    "550 nm，七边直边孔径、圆孔参考f/8；连续孔径轮廓，逐边积分计算点像；固定177.1 μm窗口和共同对数显示。",
  note: "标量单色、合焦、无像差。外接圆半径固定，径向边界由正多边形连续过渡到圆。直边的Fourier面积积分逐边解析求和，曲线用每边32段逼近，圆孔用Bessel积分；257×257显示采样，固定177.1 μm窗口。PSF按单位总通量归一，白点仍为550 nm、f/8圆孔峰值；对数映射只用于看弱光芒。旧笛卡尔FFT与独立极坐标积分保留为数值对照。",
  controls: [
    control("blades", "规则叶片数", 3, 12, 1, 7),
    control("roundness", "边缘向圆形过渡", 0, 1, 0.05, 0, "", 2),
    control("rotation", "孔径旋转角", 0, 180, 1, 0, "°"),
    control("fNumber", "圆孔参考 f 数", 4, 16, 1, 8),
    control("decades", "弱光显示数量级", 3, 6, 1, 5),
  ],
  presets: [
    { label: "七边形直边", values: { blades: 7, roundness: 0, rotation: 0 } },
    { label: "八边形直边", values: { blades: 8, roundness: 0, rotation: 0 } },
    { label: "边缘逐渐变圆", values: { roundness: 0.7 } },
    { label: "完全圆孔", values: { roundness: 1 } },
    {
      label: "孔径转15°",
      values: (s) => ({ rotation: (s.rotation + 15) % 180 }),
    },
    { label: "比较 f/4", values: { fNumber: 4 } },
    { label: "比较 f/16", values: { fNumber: 16 } },
  ],
  evaluate(s) {
    const m = optics(s),
      v = verify(s),
      density = boundaryDensity(m.shape, 0.75, 0.5),
      count = directions(s.blades).length;
    const images = imagePanels(
      [
        {
          label: "1 连续孔径轮廓",
          vector: aperture(m),
          width: 240,
          height: 240,
          scale:
            s.roundness === 0
              ? "蓝边与右图蓝虚线对应；外接圆半径1"
              : "形状由同一连续边界计算",
        },
        {
          label: "2 合焦点光源的衍射图",
          vector: image(m, s.decades),
          width: IMAGE_SIZE,
          height: IMAGE_SIZE,
          scale:
            s.roundness === 0
              ? "固定177.1 μm窗口；蓝虚线为方向标记"
              : "固定177.1 μm窗口和共同显示增益",
        },
      ],
      { title: "连续孔径与衍射星芒", tileHeight: 330 },
    );
    return {
      ...images,
      figureHeight: 330,
      stats: [
        [
          s.roundness === 0 ? "直边的法线方向" : "直边孔径的参考方向",
          s.roundness === 1 ? "圆孔" : `${count}个`,
          s.roundness === 0
            ? "一条蓝边对应两个相反方向"
            : "直边计数作参照，曲线孔径直接积分",
        ],
        [
          "孔径面积 / π",
          number(m.area / Math.PI, 5),
          `闭式${number(m.exactArea / Math.PI, 5)}`,
        ],
        [
          "当前图窗内的能量",
          number(100 * m.retained, 2) + "%",
          "单位通量；未将窗口重新归一",
        ],
      ],
      reading: `当前f/${s.fNumber}，图窗保持177.1 μm不变。${s.roundness === 0 ? `蓝虚线标出蓝色直边的两侧法线；${s.blades}边孔径对应${count}个法线方向。` : "边缘变圆后，按实际轮廓重算衍射图；完全圆孔恢复同心环。"}光圈和孔径旋转改变点像，弱光显示只改变可见亮度。`,
      staticRows: [
        `探针(qx,qy)=(0.75,0.50)：边界积分 ${density.toExponential(5)}；极坐标积分 ${v.polar.toExponential(5)} μm⁻²。`,
        `原128格瞳FFT ${v.fft.toExponential(5)} μm⁻²；其边界采样误差单独保留。`,
      ],
      table: `<details><summary>数值对照</summary><p>探针以λN为单位；不同算法在同一坐标比较。</p><table><tr><th>方法</th><th>PSF / μm⁻²</th></tr><tr><td>连续边界积分</td><td>${density.toExponential(6)}</td></tr><tr><td>独立极坐标面积积分</td><td>${v.polar.toExponential(6)}</td></tr><tr><td>原128格瞳FFT</td><td>${v.fft.toExponential(6)}</td></tr></table><p>弯曲边界面积与闭式相差${Math.abs(m.area - m.exactArea).toExponential(2)}；显示采用共同白点${number(WHITE, 6)} μm⁻²。</p></details>`,
    };
  },
};
