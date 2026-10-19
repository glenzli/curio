import { demosaic } from "./model.js";
import { control, curve, number } from "../common/lesson-view.js";
export const spec = {
  title: "插值产生的像素相关性",
  alt: "互动示意：同色样本线性插值后的空间协方差与区域平均",
  intro:
    "偶数位置保留原始同色样本，奇数位置取相邻两样本的平均。比较单点方差与一个输出窗口的平均误差。",
  staticCaption: "独立输入标准差3 DN，平均前4个输出位置；8192次重复观测。",
  note: "一维同色行、固定线性插值、独立同方差Gaussian输入。用它计算同色插值产生的空间协方差。二维、自适应插值需要相应的邻域与权重；白平衡、裁切和纹理在此省略。",
  controls: [
    control("sigma", "原始同色样本标准差", 0, 10, 0.5, 3, " DN", 1),
    control("window", "平均窗口输出数", 1, 16, 1, 4),
  ],
  presets: [
    { label: "四点平均", values: { sigma: 3, window: 4 } },
    { label: "扩大到十六点", values: { sigma: 3, window: 16 } },
  ],
  evaluate(s) {
    const m = demosaic(s),
      lags = Array.from({ length: 9 }, (_, j) => j);
    return {
      panels: [
        {
          title: "输出位置0与1各自的协方差剖面",
          xMax: 8,
          xLabel: "另一输出位置 j",
          yLabel: "协方差 / DN²",
          yMax: Math.max(1, s.sigma * s.sigma),
          curves: [
            curve(
              "Cov(Y₀,Yⱼ)",
              lags.map((j) => [j, m.covariance(0, j)]),
            ),
            curve(
              "Cov(Y₁,Yⱼ)",
              lags.map((j) => [j, m.covariance(1, j)]),
              1,
            ),
          ],
        },
      ],
      stats: [
        [
          "窗口真实标准差",
          number(Math.sqrt(m.variance), 3) + " DN",
          "把原始样本的有效权重平方后求和",
        ],
        [
          "误当独立",
          number(Math.sqrt(m.naive), 3) + " DN",
          "漏掉输出之间的协方差",
        ],
        [
          "重复观测标准差",
          number(Math.sqrt(m.sampleVariance), 3) + " DN",
          "8192次，N−1样本方差",
        ],
      ],
      reading: `全协方差求和 ${number(m.expanded, 5)} DN²；独立原始源权重计算 ${number(m.variance, 5)} DN²。二者差 ${Math.abs(m.expanded - m.variance).toExponential(1)}。奇数位置方差为原始的一半，但相邻输出共享输入，不能按窗口像素数再假定独立降噪。`,
    };
  },
};
