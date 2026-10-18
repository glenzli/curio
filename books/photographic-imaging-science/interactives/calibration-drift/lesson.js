import { calibration, snrThreshold } from "./model.js";
import { control, curve, grid, number } from "../common/lesson-view.js";
export const spec = {
  title: "旧暗场的校准残差",
  alt: "互动示意：有限暗场复用、偏置漂移与SNR下端判据",
  intro:
    "目标帧增加时，独立噪声继续下降；同一张主暗场的误差和校准后的漂移会留下。下方同时计算指定SNR的最低信号。",
  staticCaption:
    "16张暗场，平均8张目标帧，读噪3 e⁻，暗电荷均值4 e⁻，偏置漂移3 e⁻。",
  note: "单像素、零光信号下的校准残差，无裁切Gaussian近似；不含场景散粒噪声。暗电荷的均值与方差均取给定电子数。漂移是确定偏置，不规定温度倍增率。8192组试验各自重拍主暗场；固定一张主暗场时，它的误差表现为条件偏置。",
  controls: [
    control("masters", "主暗场张数", 1, 128, 1, 16),
    control("frames", "目标帧平均张数", 1, 64, 1, 8),
    control("drift", "校准后偏置漂移", -10, 10, 0.5, 3, " e⁻", 1),
    control("read", "单帧读噪", 0, 8, 0.5, 3, " e⁻ rms", 1),
    control("dark", "目标帧暗电荷均值", 0, 20, 1, 4, " e⁻"),
    control("target", "最低SNR", 1, 10, 0.5, 1, ":1", 1),
  ],
  presets: [
    {
      label: "同条件校准",
      values: { masters: 16, frames: 8, drift: 0, read: 3, dark: 4, target: 1 },
    },
    {
      label: "漂移后继续平均",
      values: {
        masters: 16,
        frames: 64,
        drift: 5,
        read: 3,
        dark: 4,
        target: 5,
      },
    },
  ],
  evaluate(s) {
    const m = calibration(s),
      threshold = snrThreshold({
        read: s.read,
        dark: s.dark,
        target: s.target,
      });
    return {
      panels: [
        {
          title: "重复拍摄整套流程时的误差预算",
          xMin: 1,
          xMax: 64,
          xLabel: "目标帧数 N",
          yLabel: "均方根误差 / e⁻",
          yMax: Math.max(1, Math.sqrt(m.mse(1)) * 1.1),
          curves: [
            curve(
              "总RMSE",
              grid(1, 64, (n) => Math.sqrt(m.mse(n))),
            ),
            curve(
              "仅随机标准差",
              grid(1, 64, (n) => Math.sqrt(m.variance(n))),
              1,
            ),
            curve(
              "N→∞误差下限",
              [
                [1, m.floor],
                [64, m.floor],
              ],
              2,
              true,
            ),
          ],
        },
      ],
      stats: [
        ["剩余偏差", number(m.bias) + " e⁻", "含暗均值不匹配"],
        [
          "当前RMSE",
          number(m.rmse) + " e⁻",
          `独立试验 ${number(Math.sqrt(m.sampleMse))} e⁻`,
        ],
        [
          "SNR下端信号",
          number(threshold.minimum) + " e⁻",
          `到32000 e⁻：${number(threshold.stops)}档`,
        ],
      ],
      reading: `误差方差 = (${s.read}²+${s.dark})/N + (${s.read}²+4)/M；均方误差另加偏差平方。8192组试验均值 ${number(m.sampleMean)} e⁻，声明偏差 ${number(m.bias)} e⁻。SNR下端由正根 ${number(threshold.minimum, 5)} e⁻ 与独立二分 ${number(threshold.numerical, 5)} e⁻ 对照。`,
    };
  },
};
