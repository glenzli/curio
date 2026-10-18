import { experiment, plot, legend } from "../common/ui.js";
import {
  gainMetrics,
  gainTruth,
  observations,
  measuredMoments,
} from "./model.js";
const p = (s) => ({
  signal: 2 ** s.signalEV,
  gain: 2 ** s.gainEV,
  mode: s.mode ?? "LCG",
  reduceExposure: s.reduceExposure ?? false,
  seed: s.seed ?? 20261018,
});
export function mount({ element, signal, session }) {
  return experiment({
    element,
    signal,
    session,
    kicker: "ISO · 曝光量、模拟增益与转换增益",
    title: "固定曝光和少收光，是两种不同的增益比较",
    intro:
      "先锁定曝光量改变增益，再改成缩短曝光后补到相同输出尺度。读数统一回到基准曝光的电子尺度，避免直接比较放大后的 DN。",
    controls: [
      {
        key: "signalEV",
        label: "基准平均电子数",
        min: 0,
        max: 16,
        step: 0.25,
        value: 4,
        format: (x) => `${(2 ** x).toFixed(2)} e⁻`,
      },
      {
        key: "gainEV",
        label: "ADC 前模拟增益",
        min: 0,
        max: 4,
        step: 0.25,
        value: 2,
        format: (x) => `${(2 ** x).toFixed(2)}×`,
      },
    ],
    presets: [
      { label: "固定曝光", values: { reduceExposure: false } },
      { label: "少收光再补亮", values: { reduceExposure: true } },
      { label: "低转换增益 LCG", values: { mode: "LCG" } },
      { label: "高转换增益 HCG", values: { mode: "HCG" } },
      {
        label: "暗部例子",
        values: { signalEV: 4, gainEV: 2, mode: "LCG", reduceExposure: false },
      },
      {
        label: "高光例子",
        values: { signalEV: 15, gainEV: 2, mode: "LCG", reduceExposure: false },
      },
      {
        label: "重新采样",
        values: (s) => ({ seed: (s.seed ?? 20261018) + 1 }),
      },
    ],
    content: `<style>.actions button{font-size:11px;padding:4px 8px}.actions button[aria-pressed="true"]{background:#448b981c;border-color:#448b98}.controls{grid-template-columns:1fr 1fr}.truth{font-size:11px;border:1px solid #9caea244;border-radius:6px;padding:12px;margin:14px 0}.stats strong{font-size:20px}.measurements{font-size:12px;line-height:1.9}.measurements strong{font-variant-numeric:tabular-nums}.equation{font-family:ui-monospace,monospace;font-size:11px;overflow-wrap:anywhere}@media(max-width:550px){.chart text{font-size:18px}.chart svg>text:nth-last-of-type(2){transform:translateY(6px)}.chart svg>text:last-of-type{transform:translateY(-6px)}.controls,.stats{grid-template-columns:1fr}.stats>div{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}}</style><p class="reading" data-mode></p><div class="stats" data-stats></div><div class="chart" data-chart></div><div class="legend" data-key></div><p class="measurements" data-observed></p><p class="reading" data-reading aria-live="polite"></p><div class="truth" data-truth></div>`,
    note: "教学电路：PPD满阱40,000 e⁻，LCG=20 µV/e⁻、HCG=80 µV/e⁻，可用电压摆幅0.8 V。上游噪声1.5 e⁻，模拟增益后的电压噪声80 µV，均独立于Poisson光电子。显示1024次有符号、减黑后的模拟读数，未加ADC量化，不预裁负值；电荷满阱和电压上限分别裁切。曲线仅在远离裁切时表示线性SNR；接近上限时以观测裁切比例判断。LCG/HCG不是任何相机的通用ISO档位，这里也不模拟DGO同次读出融合。",
    update(root, s) {
      const input = p(s),
        m = gainMetrics(input),
        t = gainTruth(input),
        base = gainMetrics({ signal: input.signal }),
        o = observations(input),
        a = measuredMoments(o.samples),
        b = observations({ signal: input.signal }),
        bm = measuredMoments(b.samples);
      for (const button of root.querySelectorAll(".actions button")) {
        const map = {
          固定曝光: !input.reduceExposure,
          少收光再补亮: input.reduceExposure,
          "低转换增益 LCG": input.mode === "LCG",
          "高转换增益 HCG": input.mode === "HCG",
        };
        if (Object.hasOwn(map, button.textContent))
          button.setAttribute("aria-pressed", String(map[button.textContent]));
      }
      root.querySelector("[data-mode]").textContent =
        `${input.mode}；${input.reduceExposure ? `曝光量缩为基准的1/${input.gain.toFixed(2)}` : "曝光量保持不变"}。实际平均光电子 ${m.mu.toFixed(3)} e⁻。`;
      root.querySelector("[data-stats]").innerHTML = [
        [
          "线性 SNR",
          m.snr.toFixed(4),
          `基准 ${base.snr.toFixed(4)}，裁切前预测`,
        ],
        [
          "实际电子域上限",
          `${m.limit.toFixed(1)} e⁻`,
          `当前输入读噪 ${m.readNoise.toFixed(4)} e⁻ rms`,
        ],
        [
          "基准曝光尺度上限",
          `${m.referenceLimit.toFixed(1)} e⁻`,
          "已除去当前曝光比例",
        ],
      ]
        .map(
          ([a, b, c]) =>
            `<div><small>${a}</small><strong>${b}</strong><em>${c}</em></div>`,
        )
        .join("");
      const maximum = Math.min(80000, Math.max(40, input.signal * 2.5)),
        curves = [
          { name: "基准 LCG · 1×", color: "#b47b43", points: [] },
          { name: "当前条件", color: "#448b98", points: [] },
        ];
      for (let i = 0; i <= 160; i++) {
        const signal = (maximum * i) / 160,
          baseline = gainMetrics({ signal }),
          current = gainMetrics({ ...input, signal });
        if (signal < baseline.referenceLimit * 0.8)
          curves[0].points.push([signal, baseline.snr]);
        if (signal < current.referenceLimit * 0.8)
          curves[1].points.push([signal, current.snr]);
      }
      const yMax =
        Math.max(1, ...curves.flatMap((c) => c.points.map((p) => p[1]))) * 1.1;
      root.querySelector("[data-chart]").innerHTML = plot({
        curves,
        xMax: maximum,
        leftPadding: 72,
        height: 285,
        topPadding: 44,
        bottomPadding: 60,
        yMax,
        xLabel: "基准曝光的平均光电子 / e⁻",
        yLabel: "线性 SNR",
        title: "固定显示尺度下不同曝光与增益的线性SNR",
        markers: [
          { value: input.signal, label: `${input.signal.toFixed(1)} e⁻` },
        ],
        samples:
          input.signal < m.referenceLimit * 0.8 ? [[input.signal, m.snr]] : [],
      });
      root.querySelector("[data-key]").innerHTML = legend(curves);
      root.querySelector("[data-observed]").textContent =
        `1024次观测（均已归一化）：基准均值 ${bm.mean.toFixed(3)}、rms ${Math.sqrt(bm.variance).toFixed(3)} e⁻；当前均值 ${a.mean.toFixed(3)}、rms ${Math.sqrt(a.variance).toFixed(3)} e⁻。当前 ${o.clipped}/1024 次达到电荷或电压上限。`;
      root.querySelector("[data-reading]").textContent = o.clipped
        ? "观测中已出现裁切，线性SNR公式不能概括此时的信息损失。减小输入或增益后再比较阴影。"
        : input.reduceExposure
          ? "输出虽已归一化，减少曝光损失的光子没有补回。增益对后级噪声的改善与散粒噪声需分别看。"
          : "固定曝光保持了光电子数。模拟增益压低后级噪声的输入等效贡献，同时降低后级电压范围对应的电子上限。";
      root.querySelector("[data-truth]").textContent =
        `独立解析对照：电子域方差 μ+1.5²+(σ后/a)²=${t.variance.toFixed(9)} e⁻²；逐电压传播再除去增益所得 ${m.noiseElectrons ** 2 === 0 ? "0" : (m.noiseElectrons ** 2).toFixed(9)} e⁻²。解析SNR=${t.snr.toFixed(9)}，容量=${t.limit.toFixed(3)} e⁻。观测统计只读归一化后的样本数组，未用输入真值修正均值与方差。`;
    },
  });
}
