import { focusSurvey, focalSurface, response } from "./model.js";
import { control, curve, grid, number } from "../common/lesson-view.js";
export const spec = {
  title: "曲面像面与对焦包围怎样配合看",
  alt: "互动示意：两方向焦面、传感器曲率和四角对焦包围",
  intro:
    "先看镜头声明的两条焦面，再放入平面或曲面传感器。同一套合成数据还可比较共同焦点、各点最佳焦点和重复装夹。",
  staticCaption:
    "边角平均焦面+60 μm，两方向±15 μm，无额外倾斜和观测噪声，平面传感器。",
  note: "局部椭圆Gaussian替代模型：σ₀=1.8 μm，离焦每1 μm增加0.08 μm的正交模糊分量。焦面曲率、像散、倾斜和重复装夹扰动均为显式合成输入，不是具体镜头处方。观测以5 μm间距扫描，可加入固定种子的MTF测量噪声；残差与峰值误差都不是置信区间。",
  controls: [
    control("curvature", "角点平均焦面", -80, 100, 5, 60, " μm"),
    control("astigmatism", "两方向分离的半值", 0, 40, 5, 15, " μm"),
    control("sensor", "传感器角点弯曲量", -80, 100, 5, 0, " μm"),
    control("focus", "传感器整体对焦位置", -150, 150, 1, 0, " μm"),
    control("tilt", "x向倾斜项", -30, 30, 2, 0, " μm"),
    control("trial", "重复装夹序号", 1, 3, 1, 1),
    control("noise", "MTF观测噪声标准差", 0, 0.02, 0.001, 0, "", 3),
  ],
  presets: [
    {
      label: "平面传感器",
      values: {
        curvature: 60,
        astigmatism: 15,
        sensor: 0,
        focus: 0,
        tilt: 0,
        trial: 1,
        noise: 0,
      },
    },
    {
      label: "匹配平均曲率",
      values: {
        curvature: 60,
        astigmatism: 15,
        sensor: 60,
        focus: 0,
        tilt: 0,
        trial: 1,
        noise: 0,
      },
    },
    {
      label: "加入倾斜",
      values: {
        curvature: 60,
        astigmatism: 15,
        sensor: 60,
        focus: 0,
        tilt: 10,
        trial: 1,
        noise: 0,
      },
    },
    {
      label: "重新装夹",
      values: {
        curvature: 60,
        astigmatism: 15,
        sensor: 60,
        focus: 0,
        tilt: 10,
        trial: 3,
        noise: 0,
      },
    },
    {
      label: "加入观测噪声",
      values: {
        curvature: 60,
        astigmatism: 15,
        sensor: 60,
        focus: 0,
        tilt: 10,
        trial: 3,
        noise: 0.005,
      },
    },
  ],
  replay: {
    key: "focus",
    start: -150,
    end: 150,
    label: "扫描对焦位置",
    startOnFirstPlay: true,
    durationMs: 12000,
  },
  evaluate(s) {
    const m = focusSurvey(s),
      corner = m.locations[4],
      curves = [
        curve("角点方向S观测", corner.scans[0]),
        curve("角点方向T观测", corner.scans[1], 1),
        curve(
          "S生成真值",
          grid(-300, 300, (z) => response(z - corner.trueFoci[0])),
          2,
          true,
        ),
      ];
    return {
      panels: [
        {
          title: "沿右下对角线的表面坐标",
          xMax: 1,
          xLabel: "归一化像高（角点=1）",
          yLabel: "轴向位置 / μm",
          yMin: Math.min(-160, s.focus, s.focus + s.sensor),
          yMax: Math.max(180, s.focus, s.focus + s.sensor),
          curves: [
            curve(
              "S焦面",
              grid(0, 1, (r) => focalSurface(r, r, s)[0]),
            ),
            curve(
              "T焦面",
              grid(0, 1, (r) => focalSurface(r, r, s)[1]),
              1,
            ),
            curve(
              "传感器表面",
              grid(0, 1, (r) => s.focus + s.sensor * r * r),
              2,
            ),
          ],
        },
        {
          title: "右下角对焦包围：40 lp/mm",
          xMin: -300,
          xMax: 300,
          xLabel: "整体对焦位置 / μm",
          yLabel: "MTF",
          yMin: -0.1,
          yMax: 1.1,
          curves,
          markers: [{ value: s.focus, label: "", color: "#777" }],
        },
      ],
      stats: [
        [
          "右下角共同焦点",
          corner.current.map((x) => number(x, 3)).join(" / "),
          "方向S / T，40 lp/mm",
        ],
        [
          "观测最佳位置",
          corner.estimated.map((x) => number(x[0], 0)).join(" / ") + " μm",
          `真值 ${corner.trueFoci.map((x) => number(x, 0)).join(" / ")}`,
        ],
        [
          "四角平均焦面跨度",
          number(m.spread, 0) + " μm",
          "倾斜与本次装夹项共同决定",
        ],
      ],
      table: `<div class="table-scroll"><table><thead><tr><th>位置</th><th>S真值 / 观测最佳 (μm)</th><th>T真值 / 观测最佳 (μm)</th></tr></thead><tbody>${m.locations.map((l, i) => `<tr><td>${["中心", "左上", "右上", "左下", "右下"][i]}</td>${l.trueFoci.map((z, j) => `<td>${number(z, 0)} / ${number(l.estimated[j][0], 0)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`,
      reading: `曲率匹配可减少共同离焦，但不会消除两方向焦面分离。各点各自最佳时，Gaussian模型的MTF上限为 ${number(m.base, 4)}；固定传感器位置的读数必须另报。对焦包围只在观测扫描数组中找最大值，不读取生成焦点。单次四角差异不能自动归因于镜头偏心。`,
    };
  },
};
