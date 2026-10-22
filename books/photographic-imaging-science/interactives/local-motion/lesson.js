import { localMotion } from "./model.js";
import { control, curve, number } from "../common/lesson-view.js";
export const spec = {
  title: "全局配准与局部运动的差异",
  alt: "互动示意：两块局部运动、观测位移估计与HDR权重对照",
  intro:
    "背景和主体各占一个固定区域。用同一批长短曝光，比较一个全局位移、两个局部位移和已知生成位移。",
  staticCaption: "背景+2 px，主体−2 px，曝光比4，读噪4 e⁻，满码1000。",
  note: "两块互不跨界的一维场景，仅估计整数平移；固定共同支持、校准曝光比与读噪。噪声为真实Poisson加Gaussian读噪。观测权重用两帧初估电子率；它依赖观测，不继承固定权重的严格无偏保证。真值支路另用已知电子率。",
  controls: [
    {
      ...control("background", "背景位移", -5, 5, 1, 2, " px"),
      numeric: { step: 1, unit: "px" },
    },
    {
      ...control("foreground", "主体位移", -5, 5, 1, -2, " px"),
      numeric: { step: 1, unit: "px" },
    },
    control("ratio", "长短曝光比", 1, 8, 1, 4, ":1"),
    control("read", "读噪", 0, 12, 1, 4, " e⁻"),
    {
      ...control("noise", "观测噪声", 0, 1, 1, 1),
      options: [
        { value: 0, label: "关" },
        { value: 1, label: "开" },
      ],
    },
  ],
  presets: [
    {
      label: "两个区域一起移动",
      values: { background: 2, foreground: 2, ratio: 4, read: 4, noise: 1 },
    },
    {
      label: "主体反向移动",
      values: { background: 2, foreground: -2, ratio: 4, read: 4, noise: 1 },
    },
    {
      label: "无噪声复核",
      values: { background: 2, foreground: -2, ratio: 4, read: 4, noise: 0 },
    },
  ],
  evaluate(s) {
    const m = localMotion(s),
      valid = (key, region) =>
        m.profiles
          .filter((p) => p[key] !== null && Math.floor(p.x / 64) === region)
          .map((p) => [p.x, p[key]]),
      available = ["global", "local", "oracle"].map(
        (key) => m.profiles.filter((p) => p[key] !== null).length,
      );
    return {
      panels: [0, 1].map((region) => ({
        title: region ? "主体区域" : "背景区域",
        xMin: region * 64 + 10,
        xMax: region * 64 + 53,
        xLabel: "参考帧位置 / px",
        yLabel: "电子率 / e⁻每短曝光",
        yMax: 210,
        curves: [
          curve("生成场景真值", valid("truth", region), 3, true),
          curve("全局估计", valid("global", region), 1),
          curve("局部估计", valid("local", region)),
          curve("已知位移+已知方差", valid("oracle", region), 2),
        ],
      })),
      stats: [
        [
          "全局位移",
          number(m.global.shift, 0) + " px",
          `RMSE ${number(m.rmse.global)} e⁻/短曝光`,
        ],
        [
          "局部估计",
          m.local.map((x) => number(x.shift, 0)).join(" / ") + " px",
          `真值 ${m.truth.join(" / ")} px`,
        ],
        [
          "局部RMSE",
          number(m.rmse.local) + " e⁻/短曝光",
          `真值支路 ${number(m.rmse.oracle)}`,
        ],
        [
          "共同评估位置",
          `${m.compared}/${m.profiles.length}`,
          "三路均有效的位置；RMSE使用同一集合",
        ],
      ],
      reading: `局部搜索只读取观测数组，不读取生成位移。${m.local.map((x, i) => `${i ? "主体" : "背景"}：${x.reason}`).join("；")}。各支路有效位置：全局${available[0]}、局部${available[1]}、已知位移${available[2]}，总计${m.profiles.length}处。${m.compared ? "RMSE只比较共同有效位置，不代表全图误差。" : "没有三路共同有效的位置，三项RMSE均不报告；已知位移支路仍可能有有效数据。"}饱和样本在融合中剔除；本图不估计遮挡边界或真实物体分割。`,
    };
  },
};
