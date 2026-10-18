import { asphere } from "./model.js";
import { control, curve, grid, number } from "../common/lesson-view.js";
export const spec = {
  title: "非球面的矢高差与斜率",
  alt: "互动示意：非球面矢高差、单位与边缘斜率的数值对照",
  intro:
    "基准球面与非球面使用相同顶点曲率。直接画微米级差值，不靠夸大镜片厚度表示面形作用。",
  staticCaption: "R=50 mm，k=−1，A₄=−1×10⁻⁶ mm⁻³，有效半口径12 mm。",
  note: "旋转对称圆锥面加A₄r⁴，长度统一用mm；图中差值转换成μm。只计算面形和dz/dr，不进行整镜像差优化。实值面形与有限导数的条件在采样口径内检查；斜率差不等于自动校正的球差量。",
  controls: [
    control("radius", "顶点曲率半径", 35, 80, 1, 50, " mm"),
    control("conic", "圆锥常数 k", -2, 0, 0.1, -1, "", 1),
    control("a4", "A₄", -3, 3, 0.1, -1, "×10⁻⁶ mm⁻³", 1),
    control("aperture", "有效半口径", 4, 16, 0.5, 12, " mm", 1),
  ],
  presets: [
    {
      label: "基准球面",
      values: { radius: 50, conic: 0, a4: 0, aperture: 12 },
    },
    { label: "抛物面", values: { radius: 50, conic: -1, a4: 0, aperture: 12 } },
    {
      label: "加入四阶项",
      values: { radius: 50, conic: -1, a4: -1, aperture: 12 },
    },
  ],
  evaluate(s) {
    const m = asphere(s),
      depart = grid(0, s.aperture, (r) => m.at(r).departure),
      slopes = grid(0, s.aperture, (r) => m.at(r).slopeDifference * 1000),
      range = (pts) => Math.max(1, ...pts.map((p) => Math.abs(p[1]))) * 1.15;
    return {
      panels: [
        {
          title: "相对同顶点曲率球面的矢高差",
          xMax: s.aperture,
          xLabel: "半径 / mm",
          yLabel: "Δz / μm",
          yMin: -range(depart),
          yMax: range(depart),
          curves: [curve("非球面−球面", depart)],
        },
        {
          title: "局部斜率差（小角时近似mrad）",
          xMax: s.aperture,
          xLabel: "半径 / mm",
          yLabel: "1000·Δ(dz/dr)",
          yMin: -range(slopes),
          yMax: range(slopes),
          curves: [curve("斜率差", slopes, 1)],
        },
      ],
      stats: [
        ["边缘矢高差", number(m.edge.departure, 3) + " μm", "单位来自mm→μm"],
        ["非球面边缘斜率", number(m.edge.asphere.slope, 6), "dz/dr，无量纲"],
        ["有限差分斜率", number(m.numericalSlope, 6), "独立数值导数"],
      ],
      reading: `解析导数与有限差分差 ${Math.abs(m.edge.asphere.slope - m.numericalSlope).toExponential(2)}。A₄的单位为mm⁻³；把相同数字改用米制坐标会改变面形。面形差需要结合折射率、光线高度和其他表面，才能判断整镜像差。`,
    };
  },
};
