import { experiment, plot, legend } from "../common/ui.js";
import { alternatingStack, stackMatrix, stackRecursion, quarterWaveTruth } from "./model.js";
const blue = "#448b98", gold = "#b47b43";
const pct = (x) => `${(100 * x).toFixed(4)}%`;
const complex = (a) => `${a[0].toFixed(6)} ${a[1] < 0 ? "−" : "+"} ${Math.abs(a[1]).toFixed(6)}i`;
export function mount({ element, signal, session }) {
  let cachedKey = "", spectrum = [];
  return experiment({
    element, signal, session, kicker: "多层膜 · 特征矩阵与界面递推", title: "膜层次序、厚度与反射谱",
    intro: "以两层四分之一波膜为起点，比较倒转层序、增加层数和改变末层厚度后的反射谱。相同层数的膜系可有不同的光谱响应。",
    controls: [
      { key: "pairs", label: "膜层对数", min: 1, max: 3, step: 1, value: 1, options: [
        { value: 1, label: "1对 · 2层" },
        { value: 2, label: "2对 · 4层" },
        { value: 3, label: "3对 · 6层" },
      ], format: (x) => `${x} 对 · ${x * 2} 层` },
      { key: "high", label: "H 层折射率", min: 1.5, max: 2.4, step: "any", value: 1.7, format: (x) => x.toFixed(4) },
      { key: "scale", label: "全部膜厚倍率", min: 0, max: 2, step: 0.01, value: 1, format: (x) => `${x.toFixed(2)} ×` },
      { key: "lastError", label: "末层厚度偏差", min: -30, max: 30, step: 1, value: 0, format: (x) => `${x > 0 ? "+" : ""}${x}%` },
      { key: "wavelength", label: "观察波长", min: 400, max: 700, step: 1, value: 550, format: (x) => `${x} nm` },
    ],
    presets: [
      { label: "双层 L → H", values: { pairs: 1, high: 1.7, scale: 1, lastError: 0, wavelength: 550, reverse: false } },
      { label: "倒转为 H → L", values: (s) => ({ reverse: !s.reverse }) },
      { label: "重复成六层", values: { pairs: 3, high: 1.7, scale: 1, lastError: 0, wavelength: 550, reverse: false } },
      { label: "末层加厚 25%", values: { pairs: 1, high: 1.7, scale: 1, lastError: 25, wavelength: 550, reverse: false } },
      { label: "理想双层匹配", values: { pairs: 1, high: 1.38 * Math.sqrt(1.52), scale: 1, lastError: 0, wavelength: 550, reverse: false } },
      { label: "零膜厚对照", values: { scale: 0, lastError: 0 } },
    ],
    content: `<style>.actions button{font-size:11px;padding:4px 8px}.multi-layout{display:grid;grid-template-columns:1.1fr 1fr;gap:20px;align-items:start}.multi-layout>section{min-width:0}.multi-layout h4{font-size:12px;font-weight:500;margin:10px 0}.multi-layout svg{width:100%;height:auto;display:block}.multi-layout text{fill:currentColor;font:11px ui-sans-serif,sans-serif}.layer-list{font-size:11px;line-height:1.7;border-block:1px solid #9caea244}.layer-row{display:grid;grid-template-columns:40px 1fr 1fr;gap:6px;padding:8px 3px;border-bottom:1px solid #9caea222;font-variant-numeric:tabular-nums}.layer-row:last-child{border:0}.layer-row small{opacity:.65}.layer-row b{font-weight:500;border-inline-start:3px solid;padding-inline-start:7px}.truth{font-size:11px;line-height:1.9;padding:12px 14px;border:1px solid #9caea255;border-radius:6px;margin:14px 0}.truth div{overflow-wrap:anywhere}.stats strong{font-size:20px}@media(max-width:650px){.multi-layout{grid-template-columns:1fr;gap:10px}.stats{gap:6px}.stats strong{font-size:17px}.stats small,.stats em{font-size:9px}}</style><div class="stats" data-stats></div><div class="multi-layout"><section><h4>可见光反射谱</h4><div data-spectrum></div><div class="legend" data-key></div></section><section><h4>入射侧 → 半无限基底</h4><p class="note">空气 n₀ = 1；L = 1.38；基底 nₛ = 1.52。各层物理厚度如下，δ 为单程相位厚度。</p><div class="layer-list" data-layers></div></section></div><p class="reading" data-reading aria-live="polite"></p><div class="truth" data-truth></div>`,
    note: "设计波长 λ₀ = 550 nm；初始各层 nⱼdⱼ = λ₀/4，厚度倍率及末层偏差在此基础上修改。正入射、平面相干层系、实常数折射率、无吸收；透射率独立由 T = (nₛ/n₀)|t|² 计算，未设成 1−R。未计算材料色散、斜入射偏振、基底背面或膜面散射。这组交替层用于比较机制，不是宽带镀膜的优化处方。",
    update(root, state) {
      const layers = alternatingStack(state), result = stackMatrix({ layers, wavelength: state.wavelength });
      const reference = stackRecursion({ layers, wavelength: state.wavelength });
      const key = JSON.stringify(layers);
      if (key !== cachedKey) {
        spectrum = Array.from({ length: 151 }, (_, i) => {
          const wavelength = 400 + i * 2;
          return { wavelength, R: stackMatrix({ layers, wavelength }).R, reference: stackRecursion({ layers, wavelength }).R };
        });
        cachedKey = key;
      }
      const bare = ((1 - 1.52) / (1 + 1.52)) ** 2;
      const curves = [
        { name: "特征矩阵", color: blue, points: spectrum.map((s) => [s.wavelength, 100 * s.R]) },
        { name: "未镀膜", color: "currentColor", dashed: true, points: [[400, bare * 100], [700, bare * 100]] },
      ];
      root.querySelector("[data-stats]").innerHTML = [
        ["当前反射率 R", pct(result.R), `${state.wavelength} nm · ${layers.length} 层`],
        ["透射率 T", pct(result.T), `R + T = ${(result.R + result.T).toFixed(9)}`],
        ["未镀膜反射率", pct(bare), "同一基底界面"],
      ].map(([a,b,c]) => `<div><small>${a}</small><strong>${b}</strong><em>${c}</em></div>`).join("");
      const maxR = Math.max(bare, ...spectrum.map((s) => s.R));
      root.querySelector("[data-spectrum]").innerHTML = plot({ curves, samples: spectrum.filter((_, i) => i % 15 === 0).map((s) => [s.wavelength, 100 * s.reference]), markers: [{ value: state.wavelength, label: `${state.wavelength} nm`, color: "#8b78aa" }], xMin: 400, xMax: 700, yMax: Math.max(5, Math.ceil(maxR * 100 / 5) * 5), xLabel: "真空波长 / nm", yLabel: "反射率 / %", title: "多层膜反射谱与独立界面递推采样点", width: 432, leftPadding: 44, rightPadding: 24 });
      root.querySelector("[data-key]").innerHTML = legend(curves) + `<span><i style="border-color:#9b703c;border-top-style:dotted"></i>界面递推点</span>`;
      root.querySelector("[data-layers]").innerHTML = layers.map((l, i) => `<div class="layer-row"><b style="border-color:${l.n === 1.38 ? blue : gold}">${i + 1} ${l.n === 1.38 ? "L" : "H"}</b><span>n = ${l.n.toFixed(4)}<br><small>${l.d.toFixed(3)} nm</small></span><span>δ / π<br><small>${(2 * l.n * l.d / state.wavelength).toFixed(4)}</small></span></div>`).join("");
      const nominal = quarterWaveTruth({ indices: layers.map((l) => l.n) });
      const matched = Math.abs(state.scale - 1) < 1e-10 && state.lastError === 0 && state.wavelength === 550;
      const difference = Math.hypot(result.r[0] - reference.r[0], result.r[1] - reference.r[1]);
      root.querySelector("[data-truth]").innerHTML = `<strong>独立对照</strong><div>特征矩阵 r = ${complex(result.r)}<br>界面递推 r = ${complex(reference.r)}<br>|Δr| = ${difference.toExponential(2)}；递推 R + T = ${(reference.R + reference.T).toFixed(9)}。</div><div>理想四分之一波层系的解析导纳 Y = ${nominal.admittance.toFixed(6)}，R = ${pct(nominal.R)}。${matched ? "当前层厚和波长满足此解析条件。" : "这是同折射率、同次序在 550 nm 且层厚无误差时的真值，当前参数不满足该条件。"}</div>`;
      root.querySelector("[data-reading]").textContent = state.scale === 0
        ? "所有膜层厚度为零时，内部界面合并，结果回到空气与基底的直接反射。"
        : `${state.reverse ? "H 层先接触空气" : "L 层先接触空气"}，末层为 ${layers.at(-1).n === 1.38 ? "L" : "H"}。${result.R > bare ? "当前波长的反射率高于未镀膜界面；这组层系在这里增加了反射。" : "当前波长的反射率低于未镀膜界面；宽谱表现仍需沿整条曲线比较。"} 改变厚度后，干涉条件随波长移动；增加一对膜层也会改变阻抗匹配。`;
      const reverseButton = [...root.querySelectorAll(".actions button")][1];
      reverseButton.textContent = state.reverse ? "还原为 L → H" : "倒转为 H → L";
    },
  });
}
