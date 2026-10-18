import { absorption } from "./model.js";
import { control, curve, grid, number } from "../common/lesson-view.js";
export const spec = {
  title: "吸收发生在哪里，电荷又能收集多少",
  alt: "互动示意：吸收深度、入口失效层与收集概率的分离",
  intro:
    "改变穿透长度和收集条件，比较光子被吸收的比例与最终电子产额。深度探针只累计到所选截面。",
  staticCaption: "厚度6 μm，穿透长度3 μm，入口失效层0.5 μm，反射10%。",
  note: "单色、均匀吸收、一次光子至多产生一个被收集电子。穿透长度由读者指定，不对应虚构的硅波长表；收集概率是指数教学函数，不包含DTI或横向输运。",
  controls: [
    control("depth", "硅厚度", 1, 20, 0.5, 6, " μm", 1),
    control("length", "吸收穿透长度", 0.1, 20, 0.1, 3, " μm", 1),
    control("dead", "入口失效层", 0, 3, 0.1, 0.5, " μm", 1),
    control("collection", "收集衰减长度", 1, 50, 1, 10, " μm"),
    control("reflection", "界面反射比例", 0, 0.6, 0.01, 0.1, "", 2),
    control("probe", "深度探针", 0, 100, 1, 100, "%", 0),
  ],
  presets: [
    {
      label: "理想收集近似",
      values: {
        depth: 6,
        length: 3,
        dead: 0,
        collection: 50,
        reflection: 0,
        probe: 100,
      },
    },
    {
      label: "浅吸收遇到失效层",
      values: {
        depth: 6,
        length: 0.2,
        dead: 1,
        collection: 10,
        reflection: 0.1,
        probe: 100,
      },
    },
  ],
  replay: { key: "probe", label: "展开深度", startOnFirstPlay: true },
  evaluate(s) {
    const m = absorption(s),
      probe = (s.depth * s.probe) / 100,
      partial =
        probe > 0 ? absorption({ ...s, depth: probe }) : { qe: 0, absorbed: 0 };
    return {
      panels: [
        {
          title: "入射光子的存活与累计吸收",
          xMax: s.depth,
          xLabel: "距入射面深度 / μm",
          yLabel: "比例（以入射光子为分母）",
          yMax: 1,
          curves: [
            curve("未吸收光子比例", grid(0, s.depth, m.survival)),
            curve(
              "该深度前累计吸收",
              grid(
                0,
                s.depth,
                (z) => (1 - s.reflection) * (1 - Math.exp(-z / s.length)),
              ),
              1,
            ),
          ],
          markers: [{ value: probe, label: "", color: "#777" }],
        },
        {
          title: "每千入射光子的单位深度贡献",
          xMax: s.depth,
          xLabel: "距入射面深度 / μm",
          yLabel: "电子密度 / e⁻·μm⁻¹",
          yMax: Math.max(1, 1000 * m.density(Math.min(s.dead, s.depth))) * 1.1,
          curves: [
            curve(
              "收集贡献密度",
              grid(0, s.depth, (z) => 1000 * m.density(z)),
              1,
            ),
          ],
          markers: [{ value: probe, label: "", color: "#777" }],
        },
      ],
      stats: [
        ["全层吸收", number(100 * m.absorbed) + "%", "以入射光子为分母"],
        ["最终收集", number(100 * m.qe) + "%", "外部产额，仅含本模型损失"],
        [
          "探针前已收集",
          number(100 * partial.qe) + "%",
          "未到此深度的贡献不计入",
        ],
      ],
      reading: `分层存活差分积分：${number(m.integral, 7)}；闭式：${number(m.qe, 7)}；差 ${Math.abs(m.integral - m.qe).toExponential(1)}。被吸收但未收集的比例为 ${number(100 * (m.absorbed - m.qe))}%。`,
    };
  },
};
