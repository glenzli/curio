import { experiment, plot, points, legend } from "../common/ui.js";
import { encode, quantize, stopSpan, displayByte } from "./model.js";

const curves = [
  { key: "linear", name: "线性", color: "#8b8e91" },
  { key: "gamma", name: "Gamma 2.2", color: "#b98447" },
  { key: "log", name: "教学 Log", color: "#3f8b98" },
];
const format = (x) => x.toLocaleString("zh-CN", { maximumFractionDigits: 2 });

function ramp(curve, bits) {
  let strips = "";
  for (let i = 0; i < 320; i++) {
    const x = (i + 0.5) / (320 * 64);
    const value = displayByte(quantize(x, curve, bits).estimate);
    strips += `<rect x="${i}" width="1.02" height="40" fill="rgb(${value} ${value} ${value})"/>`;
  }
  return `<svg role="img" aria-label="${curve} 编码量化后反解并统一显示的暗部渐变" viewBox="0 0 320 40" preserveAspectRatio="none">${strips}</svg>`;
}

export function mount({ element, signal }) {
  return experiment({
    element, signal, kicker: "编码 · 位深与码值分配", title: "线性、Gamma 与 Log 的量化",
    intro: "三种编码接收同一个线性信号。调整位深和观察范围，比较每档的码值跨度；下方渐变先反解码，再按相同方式显示。",
    controls: [
      { key: "bits", label: "编码位深", min: 8, max: 12, step: 1, value: 10, format: (x) => `${x} bit` },
      { key: "stops", label: "曲线观察范围", min: 8, max: 16, step: 1, value: 12, format: (x) => `白点以下 ${x} 档` },
      { key: "probeEV", label: "探针输入（相对白点）", min: -16, max: 2, step: 0.25, value: -9, format: (x) => `${x > 0 ? "+" : ""}${x} 档` },
    ],
    presets: [
      { label: "8 bit 暗部", values: { bits: 8, probeEV: -9 } },
      { label: "12 bit 暗部", values: { bits: 12, probeEV: -9 } },
      { label: "输入超出白点", values: { probeEV: 1 } },
    ],
    content: `<div class="chart" data-chart></div><div class="legend" data-legend></div><div class="stats" data-stats></div><p class="reading">暗部渐变：线性输入 0 → 1/64，三条均反解为线性值，统一提升 6 档并用 Gamma 2.2 显示。</p><div class="stripes" data-ramps style="grid-template-columns:1fr"></div><p class="reading" data-probe aria-live="polite"></p><p class="reading" data-clipping></p>`,
    note: "模型只隔离编码量化，不模拟噪声、色彩、上游 ADC 或真实显示器。满量程前的线性输入先裁到 [0,1]；量化取最近整数码，码域为 0…2ᵇ−1。教学 Log 采用式 (9.3) 的连续一阶导数拼接：xₜ = s = 2⁻¹²，并归一化为 f(0)=0、f(1)=1；它不是任何厂商的 Log 曲线。码值跨度可以是小数，不等于该区间内不同整数码的数量。渐变仅用于观察编码误差，屏幕自身的量化也会影响外观。",
    update(root, state) {
      const maximum = 2 ** state.bits - 1;
      const lines = curves.map((curve) => ({ ...curve,
        points: points(state.stops, (u) => maximum * encode(2 ** (u - state.stops), curve.key)) }));
      root.querySelector("[data-chart]").innerHTML = plot({ curves: lines, xMax: state.stops, yMax: maximum,
        xLabel: `从 −${state.stops} 档起的档数（最右为白点）`, yLabel: "编码码值", title: "相同线性输入的三种编码曲线" });
      root.querySelector("[data-legend]").innerHTML = legend(lines);
      const lower = -state.stops;
      root.querySelector("[data-stats]").innerHTML = curves.map((curve) => `<div><small>${curve.name} · 最暗一档</small><strong>${format(stopSpan(lower, curve.key, state.bits))}</strong><em>码值跨度，${lower} → ${lower + 1} 档</em></div>`).join("");
      root.querySelector("[data-ramps]").innerHTML = curves.map((curve) => `<div><small>${curve.name}</small>${ramp(curve.key, state.bits)}</div>`).join("");
      const input = 2 ** state.probeEV;
      root.querySelector("[data-probe]").textContent = `探针输入 ${input.toPrecision(4)}：` + curves.map((curve) => {
        const result = quantize(input, curve.key, state.bits);
        return `${curve.name} ${result.code} 码，反解为 ${result.estimate.toPrecision(4)}`;
      }).join("；") + "。";
      root.querySelector("[data-clipping]").textContent = input > 1 ? "输入在编码之前已被裁到白点。增加位深或换用 Log，都不能恢复这部分高光。" : "改变曲线观察范围只改变横轴；渐变输入范围、相机曝光和编码曲线参数均不变。";
    },
  });
}
