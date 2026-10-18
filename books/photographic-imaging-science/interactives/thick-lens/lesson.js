import { thickLens } from "./model.js";
import { control, curve, number, colors } from "../common/lesson-view.js";
export const spec = {
  title: "一片厚玻璃的焦距从哪里量",
  alt: "互动示意：球面厚透镜内部传播、主平面与后焦距",
  intro:
    "光线在第一面折射、玻璃内传播，再在第二面折射。焦距与后焦距各有自己的起点，删去厚度会同时改变这两项。",
  staticCaption: "空气→n=1.5玻璃→空气，R₁=+50 mm，R₂=−50 mm，厚5 mm。",
  note: "空气中的球面厚透镜，约化角(y,nθ)、近轴折射、无像差。折射发生在顶点参考面；图中直立标线定位两表面，不画成实际球面边缘或用它预测大口径球差。",
  controls: [
    control("index", "玻璃折射率", 1.3, 1.8, 0.01, 1.5, "", 2),
    control("thickness", "中心厚度", 0, 20, 0.5, 5, " mm", 1),
    control("radius", "第一面半径", 30, 80, 1, 50, " mm"),
    control("bend", "第二面半径绝对值 / R₁", 0.5, 1.5, 0.05, 1, "", 2),
  ],
  presets: [
    {
      label: "书中厚双凸例",
      values: { index: 1.5, thickness: 5, radius: 50, bend: 1 },
    },
    {
      label: "删除厚度",
      values: { index: 1.5, thickness: 0, radius: 50, bend: 1 },
    },
    {
      label: "加厚玻璃",
      values: { index: 1.5, thickness: 20, radius: 50, bend: 1 },
    },
  ],
  evaluate(s) {
    const m = thickLens(s),
      focal = s.thickness + m.bfd;
    const rays = [-1, -0.5, 0.5, 1].map((y, i) =>
      curve(
        `${i === 0 ? "光线高度 ±1 mm" : i === 1 ? "±0.5 mm" : ""}`,
        [[-8, y], ...m.trace(y).points],
        i % 2,
      ),
    );
    return {
      panels: [
        {
          title: "逐面近轴光线（两表面间为玻璃）",
          xMin: -8,
          xMax: Math.max(60, focal + 8),
          xLabel: "从第一顶点量起 / mm",
          yLabel: "光线高度 / mm",
          yMin: -1.3,
          yMax: 1.3,
          curves: rays,
          markers: [
            { value: 0, label: "", color: colors[3] },
            { value: s.thickness, label: "", color: colors[3] },
            { value: m.h1, label: "", color: colors[2] },
            { value: m.h2, label: "", color: colors[2] },
          ],
        },
      ],
      stats: [
        [
          "有效焦距",
          number(m.f, 3) + " mm",
          `主平面 H′：x=${number(m.h2, 3)} mm`,
        ],
        [
          "后焦距",
          number(m.bfd, 3) + " mm",
          `从后顶点 x=${s.thickness} mm 量起`,
        ],
        ["忽略厚度", number(m.thinF, 3) + " mm", "只加两表面光焦度"],
      ],
      reading: `厚制镜者公式 ${number(m.referenceF, 6)} mm；矩阵焦距 ${number(m.f, 6)} mm。高度1 mm的独立逐面光线交点 x=${number(m.trace(1).focus, 6)} mm，后顶点加BFD为 ${number(focal, 6)} mm。det(M)=${number(m.det, 9)}；紫标线为主平面，灰标线为表面顶点。`,
    };
  },
};
