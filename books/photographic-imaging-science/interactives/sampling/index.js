import { samplingModel } from "./model.js";
import { experiment, plot, points, legend } from "../common/ui.js";
export function mount({ element, signal }) {
  return experiment({
    element,
    signal,
    kicker: "采样实验 7 · 连续条纹与离散样点",
    title: "这些样点，能分清高频与低频吗？",
    intro:
      "每隔一个像素节距取样。改变频率和相位，看高频如何产生同一组低频样点；再加入像素面积积分。",
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
        label: "Nyquist 相位",
        values: { frequency: 0.5, phase: 0.25, width: 0 },
      },
      { label: "满宽像素积分", values: { width: 1 } },
    ],
    content:
      '<div class="chart-wrap"><div class="chart"></div><div class="legend"></div></div><div class="stats"></div><p class="criterion"></p><p class="reading"></p>',
    note: "一维单色正弦，均值 0.5、输入调制度 0.8，位置单位为像素节距；不模拟 Bayer CFA。宽度为 0 是数学上的点采样极限，正宽度使用归一化盒积分。虚线只是一条通过相同样点的基带正弦，不是对任意场景的唯一重建；无噪声、无锐化。",
    update(root, s) {
      const m = samplingModel(s),
        curves = [
          {
            name: "原连续光强",
            color: "#81928b",
            points: points(12, m.raw, 720),
          },
          {
            name: "积分后的连续光强",
            color: "#426d58",
            points: points(12, m.integrated, 720),
          },
          {
            name: "同样点的基带正弦",
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
        title: "连续正弦、像素积分及经过同样离散样点的基带正弦",
      });
      root.querySelector(".legend").innerHTML = legend([
        ...curves,
        { name: "实际样点", color: "#9b703c" },
      ]);
      root.querySelector(".stats").innerHTML =
        `<div><small>输入频率</small><strong>${s.frequency.toFixed(2)}</strong><em>cycles/pixel</em></div><div><small>基带等效频率</small><strong>${m.aliasFrequency.toFixed(2)}</strong><em>cycles/pixel</em></div><div><small>积分后调制度</small><strong>${(0.8 * Math.abs(m.gain)).toFixed(3)}</strong><em>原调制度 0.800</em></div>`;
      root.querySelector(".criterion").textContent =
        Math.abs(s.frequency - 0.5) < 1e-8
          ? "恰在 Nyquist：正弦相位可使全部样点落在均值上。"
          : s.frequency > 0.5
            ? "超过 Nyquist，样点可以被另一条基带正弦解释。"
            : "此正弦在 Nyquist 以下；带限条件仍是重建整幅信号的前提。";
      root.querySelector(".reading").textContent =
        `橙点每隔 1 个节距取样；0.5 cycles/pixel 是这一采样网格的 Nyquist。像素积分改变对比度，采样间隔决定频谱副本的间距，两者不能互相替代。`;
      root.querySelector(".lab").dataset.aliasFrequency = String(
        m.aliasFrequency,
      );
    },
  });
}
