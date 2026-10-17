import { experiment, legend } from "../common/ui.js";
import { coefficient, quadrature, efficiency, phaseProfile, orderSpectrum, sinc } from "./model.js";
const blue = "#448b98", gold = "#b47b43";
const percent = (x) => `${(x * 100).toFixed(3)}%`;
function phaseDiagram(profile) {
  const max = Math.max(1, Math.ceil(profile.alpha * 4) / 4);
  const x = (v) => 42 + v * 368, y = (v) => 220 - v / max * 182;
  let drawing = "";
  for (let i = 0; i <= 4; i++) {
    const u = i / 4, v = max * u;
    drawing += `<path d="M42 ${y(v)}H410" stroke="currentColor" opacity=".1"/><text x="34" y="${y(v) + 4}" text-anchor="end">${Number(v.toFixed(3))}</text><text x="${x(u)}" y="240" text-anchor="middle">${u}</text>`;
  }
  const path = (points) => points.map(([a,b],i) => `${i ? "L" : "M"}${x(a)},${y(b)}`).join(" ");
  drawing += `<path d="${path(profile.continuous)}" fill="none" stroke="${gold}" stroke-width="2" stroke-dasharray="6 4"/><path d="${path(profile.steps)}" fill="none" stroke="${blue}" stroke-width="2"/><text x="42" y="12">相位 / 2π</text><text x="226" y="260" text-anchor="middle">位置 x / Λ</text>`;
  return `<svg role="img" aria-label="一个周期内的连续相位与等宽量化台阶" viewBox="0 0 432 265">${drawing}</svg>`;
}
function spectrum(s) {
  const x = (m) => 47 + (m + 8) * 22, y = (eta) => 218 - 166 * eta;
  let drawing = "";
  for (let v = 0; v <= 1; v += 0.25)
    drawing += `<path d="M30 ${y(v)}H414" stroke="currentColor" opacity=".1"/><text x="25" y="${y(v) + 4}" text-anchor="end">${v * 100}</text>`;
  for (const { order, eta, continuous } of s.orders) {
    drawing += `<rect x="${x(order) - 7}" y="${y(eta)}" width="7" height="${166 * eta}" fill="${blue}"/><rect x="${x(order) + 1}" y="${y(continuous)}" width="7" height="${166 * continuous}" fill="none" stroke="${gold}"/>`;
    drawing += `<text x="${x(order)}" y="237" text-anchor="middle">${order}</text>`;
  }
  return `<svg role="img" aria-label="各衍射级次的效率，实心柱为量化相位，空心柱为同深度连续 blaze" viewBox="0 0 432 265"><text x="30" y="18">衍射效率 / %</text>${drawing}<text x="221" y="261" text-anchor="middle">衍射级次 m</text></svg>`;
}
export function mount({ element, signal }) {
  return experiment({
    element, signal, kicker: "PF · 局部周期相位模型", title: "相位量化与衍射级次",
    intro: "从两级增加到四级、八级，比较目标一级与其余衍射级次。再固定结构改变波长，观察设计波长的效率公式何时失效。",
    controls: [
      { key: "levels", label: "相位级数 N", min: 1, max: 32, step: 1, value: 4 },
      { key: "wavelength", label: "观察波长", min: 400, max: 700, step: 1, value: 550, format: (x) => `${x} nm` },
      { key: "depth", label: "浮雕深度倍率", min: 0, max: 2, step: 0.01, value: 1, format: (x) => `${x.toFixed(2)} ×` },
    ],
    presets: [
      { label: "两级", values: { levels: 2, wavelength: 550, depth: 1 } },
      { label: "四级", values: { levels: 4, wavelength: 550, depth: 1 } },
      { label: "八级", values: { levels: 8, wavelength: 550, depth: 1 } },
      { label: "同一结构看蓝光", values: { levels: 8, wavelength: 400, depth: 1 } },
      { label: "零相位对照", values: { depth: 0 } },
    ],
    content: `<style>.actions button{font-size:11px;padding:4px 8px}.pf-panels{display:grid;grid-template-columns:1fr 1fr;gap:16px}.pf-panels>section{min-width:0}.pf-panels h4{font-size:12px;font-weight:500;margin:8px 0}.pf-panels svg{width:100%;height:auto;display:block}.pf-panels text{fill:currentColor;font:11px ui-sans-serif,sans-serif}.truth{font-size:11px;line-height:1.9;border:1px solid #9caea255;border-radius:6px;padding:12px 14px;margin:14px 0}.truth strong{font-weight:600}.stats strong{font-size:20px}@media(max-width:650px){.pf-panels{grid-template-columns:1fr}.stats{gap:6px}.stats strong{font-size:17px}.stats small,.stats em{font-size:9px}}</style><div class="stats" data-stats></div><div class="pf-panels"><section><h4>一个周期内的相位</h4><div data-profile></div><div class="legend" data-phase-key></div></section><section><h4>同深度的两种结构</h4><div data-orders></div><div class="legend"><span><i style="border-color:${blue}"></i>等宽台阶</span><span><i style="border-color:${gold}"></i>连续 blaze</span></div></section></div><p class="reading" data-reading aria-live="polite"></p><div class="truth" data-truth></div>`,
    note: "设计波长 λ₀ = 550 nm。正入射、标量、无反射/吸收的局部周期相位屏，单位入射能量；假定材料相对周围介质的折射率差不随波长变化，因此相位按 λ₀/λ 缩放。图中省略整体常相位。级次柱不表示径向 PF 的实际光斑形状，也不计算杂散光、台阶侧壁或传播级次的矢量效应。",
    update(root, state) {
      const profile = phaseProfile(state), spec = orderSpectrum(state);
      const exact = efficiency(coefficient(state)), numeric = efficiency(quadrature(state));
      const curves = [
        { name: "量化台阶", color: blue, points: profile.steps },
        { name: "连续 blaze", color: gold, dashed: true, points: profile.continuous },
      ];
      root.querySelector("[data-stats]").innerHTML = [
        ["目标一级 · 精确积分", percent(exact), "每个台阶分别积分"],
        ["连续 blaze 一级", percent(sinc(profile.alpha - 1) ** 2), "相同深度、没有量化"],
        ["图外级次能量", percent(spec.omittedEnergy), "未把 −8…8 重新归一化"],
      ].map(([a,b,c]) => `<div><small>${a}</small><strong>${b}</strong><em>${c}</em></div>`).join("");
      root.querySelector("[data-profile]").innerHTML = phaseDiagram(profile);
      root.querySelector("[data-phase-key]").innerHTML = legend(curves);
      root.querySelector("[data-orders]").innerHTML = spectrum(spec);
      root.querySelector("[data-reading]").textContent = state.depth === 0 || state.levels === 1
        ? "相位不再随位置变化，全部能量留在零级。增加采样点不会让它变成一级衍射。"
        : `当前相位深度 α = ${profile.alpha.toFixed(4)}。${Math.abs(profile.alpha - 1) < 1e-10 ? "在设计相位深度下，台阶结构只在 m = 1 + qN 的级次上有能量；增加级数，一级逐渐接近连续 blaze。" : "相位深度已偏离 2π，连续结构本身也会分出其他级次；不能继续套用设计波长的一级效率。"}`;
      root.querySelector("[data-truth]").innerHTML = `<strong>独立对照</strong><br>中点积分：每级 128 点，共 ${state.levels * 128} 点，η₁ = ${percent(numeric)}；与逐段精确积分相差 ${(Math.abs(numeric - exact) * 100).toExponential(2)} 个百分点。<br>式 (15.3a) 的设计条件真值：sinc²(1/N) = ${percent(sinc(1 / state.levels) ** 2)}。${Math.abs(profile.alpha - 1) < 1e-10 ? "当前满足 α = 1，可直接比较。" : "当前 α ≠ 1，此数值仅作设计条件参考。"}<br>相位屏的全部整数级次之和为 1；图内合计 ${percent(spec.shownEnergy)}，余量单列在上方。`;
    },
  });
}
