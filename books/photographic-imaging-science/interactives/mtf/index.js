import { transfer } from "./model.js";
import { experiment, plot, points, legend, stripe } from "../common/ui.js";
export function mount({ element, signal }) {
  return experiment({
    element,
    signal,
    kicker: "第十二章 · 衍射与像素孔径",
    title: "光圈、像素节距与 MTF",
    intro: "调整光圈、像素节距和条纹频率，观察 MTF 曲线和输出条纹的变化。",
    controls: [
      {
        key: "fNumber",
        label: "光圈 f 数",
        min: 2,
        max: 22,
        step: 0.1,
        value: 8,
        format: (v) => `f/${v.toFixed(1)}`,
      },
      {
        key: "pixelUm",
        label: "像素节距",
        min: 2,
        max: 8,
        step: 0.1,
        value: 6,
        format: (v) => `${v.toFixed(1)} µm`,
      },
      {
        key: "frequency",
        label: "条纹空间频率",
        min: 5,
        max: 250,
        step: 0.1,
        value: 40,
        format: (v) => `${v.toFixed(1)} lp/mm`,
      },
    ],
    presets: [
      { label: "f/4", values: { fNumber: 4 } },
      { label: "f/8", values: { fNumber: 8 } },
      { label: "f/16", values: { fNumber: 16 } },
      {
        label: "设为 Nyquist 频率",
        values: (s) => ({ frequency: Number((500 / s.pixelUm).toFixed(1)) }),
      },
    ],
    content:
      '<div class="chart-wrap"><div class="chart"></div><div class="legend"></div></div><div class="stripes"><div class="input-strip"></div><div class="output-strip"></div></div><div class="stats"></div><p class="criterion"></p><p class="reading"></p>',
    note: "固定 λ=550 nm、无像差均匀圆瞳、非相干照明与满填充矩形像素；依据式 (12.8)–(12.11)。这是预采样传递，不含 CFA、混叠回折、锐化与噪声。条纹以 sRGB 编码显示，数值调制度在线性光强域计算；不模拟真实镜头收光圈时像差下降的收益。",
    update(root, s) {
      const m = transfer(s),
        curves = [
          {
            name: "衍射 MTF",
            color: "#426d58",
            points: points(
              250,
              (f) => transfer({ ...s, frequency: f }).optical,
            ),
          },
          {
            name: "像素孔径 MTF",
            color: "#ad844d",
            dashed: true,
            points: points(250, (f) => transfer({ ...s, frequency: f }).pixel),
          },
          {
            name: "预采样系统 MTF",
            color: "#496c8c",
            points: points(250, (f) => transfer({ ...s, frequency: f }).system),
          },
        ];
      root.querySelector(".chart").innerHTML = plot({
        curves,
        xMax: 250,
        xLabel: "像面空间频率 · lp/mm",
        markers: [
          { value: m.nyquist, label: "Nyquist" },
          { value: s.frequency, label: "选定频率", color: "#496c8c" },
        ],
        title: "衍射、像素孔径与系统的 MTF 随空间频率变化",
      });
      root.querySelector(".legend").innerHTML = legend(curves);
      root.querySelector(".input-strip").innerHTML =
        `<small>输入条纹 · 调制度 0.800 · 像面宽度 0.24 mm</small>${stripe(s.frequency)}`;
      root.querySelector(".output-strip").innerHTML =
        `<small>预采样输出 · 调制度 ${(0.8 * m.system).toFixed(3)}</small>${stripe(s.frequency, m.systemOtf)}`;
      root.querySelector(".stats").innerHTML =
        `<div><small>选定频率的系统 MTF</small><strong>${m.system.toFixed(3)}</strong><em>${m.optical.toFixed(3)} × ${m.pixel.toFixed(3)}</em></div><div><small>传感器 Nyquist</small><strong>${m.nyquist.toFixed(1)}</strong><em>lp/mm</em></div><div><small>衍射截止频率</small><strong>${m.cutoff.toFixed(1)}</strong><em>lp/mm · Airy 直径 ${m.airyDiameterUm.toFixed(2)} µm</em></div>`;
      root.querySelector(".criterion").textContent =
        s.frequency >= m.nyquist
          ? "当前频率已达到或超过 Nyquist 频率。图中显示的是采样前的连续像，传感器采样时可能产生混叠。"
          : "当前条纹频率低于 Nyquist 频率。场景中其他高于 Nyquist 的成分仍可能产生混叠。";
      root.querySelector(".reading").textContent =
        `在 ${s.frequency.toFixed(1)} lp/mm 处，条纹调制度由 80% 降至 ${(80 * m.system).toFixed(1)}%。${m.systemOtf < 0 ? "像素孔径的 OTF 在此频率为负，条纹相位反转半个周期；MTF 显示的是 OTF 的模。" : ""}`;
      root.querySelector(".lab").dataset.mtf = String(m.system);
    },
  });
}
