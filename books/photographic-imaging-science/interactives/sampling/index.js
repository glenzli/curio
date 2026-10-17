import { samplingModel } from "./model.js";
import { experiment, plot, points, legend } from "../common/ui.js";
export function mount({ element, signal }) {
  return experiment({
    element,
    signal,
    kicker: "第七章 · 连续条纹与离散采样",
    title: "像素采样与混叠",
    intro:
      "调整条纹频率和相位，比较连续光强与采样点。增加积分宽度，可观察像素面积积分对条纹对比度的影响。",
    controls: [
      {
        key: "frequency",
        label: "输入频率",
        min: 0.05,
        max: 1.45,
        step: 0.01,
        value: 0.8,
        format: (v) => `${v.toFixed(2)} cycles/pixel`,
      },
      {
        key: "phase",
        label: "输入相位",
        min: 0,
        max: 1,
        step: 0.01,
        value: 0,
        format: (v) => `${v.toFixed(2)} 周期`,
      },
      {
        key: "width",
        label: "积分宽度 / 像素节距",
        min: 0,
        max: 1,
        step: 0.05,
        value: 0,
        format: (v) => (v === 0 ? "0 · 点采样极限" : v.toFixed(2)),
      },
    ],
    presets: [
      { label: "低频 0.20", values: { frequency: 0.2, phase: 0, width: 0 } },
      { label: "高频 0.80", values: { frequency: 0.8, phase: 0, width: 0 } },
      {
        label: "Nyquist：四分之一周期相位",
        values: { frequency: 0.5, phase: 0.25, width: 0 },
      },
      { label: "满像素宽度积分", values: { width: 1 } },
    ],
    content:
      '<div class="chart-wrap"><div class="chart"></div><div class="legend"></div></div><div class="stats"></div><p class="criterion"></p><p class="reading"></p>',
    note: "一维单色正弦，均值 0.5、输入调制度 0.8，位置单位为像素节距；不模拟 Bayer CFA。宽度为 0 是数学上的点采样极限，正宽度使用归一化盒积分。虚线只是一条通过相同样点的基带正弦，不是对任意场景的唯一重建；无噪声、无锐化。",
    update(root, s) {
      const m = samplingModel(s),
        curves = [
          {
            name: "输入的连续光强",
            color: "#81928b",
            points: points(12, m.raw, 720),
          },
          {
            name: "积分后的连续光强",
            color: "#426d58",
            points: points(12, m.integrated, 720),
          },
          {
            name: "经过相同采样点的基带正弦",
            color: "#496c8c",
            dashed: true,
            points: points(12, m.alias, 720),
          },
        ];
      root.querySelector(".chart").innerHTML = plot({
        curves,
        xMax: 12,
        xLabel: "位置 · 像素节距",
        yLabel: "线性光强",
        samples: Array.from({ length: 13 }, (_, i) => [i, m.integrated(i)]),
        title: "连续正弦、像素积分与离散采样点",
      });
      root.querySelector(".legend").innerHTML = legend([
        ...curves,
        { name: "实际样点", color: "#9b703c" },
      ]);
      root.querySelector(".stats").innerHTML =
        `<div><small>输入频率</small><strong>${s.frequency.toFixed(2)}</strong><em>cycles/pixel</em></div><div><small>基带等效频率</small><strong>${m.aliasFrequency.toFixed(2)}</strong><em>cycles/pixel</em></div><div><small>积分后调制度</small><strong>${(0.8 * Math.abs(m.gain)).toFixed(3)}</strong><em>原调制度 0.800</em></div>`;
      root.querySelector(".criterion").textContent =
        Math.abs(s.frequency - 0.5) < 1e-8
          ? "频率等于 Nyquist 频率。相位为四分之一周期时，所有采样点都落在平均光强处。"
          : s.frequency > 0.5
            ? "频率超过 Nyquist 频率。采样值也符合图中的低频正弦，仅凭这些数值无法确定原条纹频率。"
            : "频率低于 Nyquist 频率。要从样本重建整个信号，仍需满足带限条件。";
      root.querySelector(".reading").textContent =
        `橙色圆点表示每隔一个像素节距取得的样本，Nyquist 频率为 0.5 cycles/pixel。像素积分影响条纹对比度，采样间隔决定频谱副本之间的距离；积分不改变 Nyquist 频率。`;
      root.querySelector(".lab").dataset.aliasFrequency = String(
        m.aliasFrequency,
      );
    },
  });
}
