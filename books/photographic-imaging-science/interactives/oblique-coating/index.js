import { experiment } from "../common/ui.js";
import { replay } from "../common/replay.js";
import { parameters, coatingBudget, bareTruth } from "./model.js";
import {
  names,
  incidenceFigure,
  sweepData,
  reflectanceFigure,
} from "./figures.js";
const pct = (v) => (100 * v).toFixed(5) + "%";
export function mount({ element, signal, session }) {
  let angleKey, spectrumKey, angularData, spectralData;
  return experiment({
    element,
    signal,
    session,
    kicker: "第十五章 · 斜入射与偏振",
    title: "斜入射下的 s、p 反射与透射",
    intro:
      "正入射时，s与p给出相同结果；倾斜后，各层折射角、相位厚度和两种偏振的导纳都要重新计算。分别比较反射、透射，再按入射能流比例合成。",
    controls: [
      {
        key: "angle",
        label: "回放终点的入射角 θ₀",
        min: 0,
        max: 75,
        step: "any",
        value: 45,
        format: (v) => v.toFixed(3) + "°",
      },
      {
        key: "wavelength",
        label: "观察波长",
        min: 400,
        max: 700,
        step: 1,
        value: 550,
        format: (v) => v.toFixed(0) + " nm",
      },
      {
        key: "index",
        label: "单层 / L层折射率",
        min: 1.1,
        max: 1.6,
        step: "any",
        value: 1.38,
        format: (v) => v.toFixed(5),
        enabled: (s) => s.mode !== "bare",
        hint: (s) => s.mode === "bare" ? "裸界面没有膜层；选择单层或多层后启用" : "",
      },
      {
        key: "thicknessScale",
        label: "相对550 nm四分之一波设计的膜厚",
        min: 0,
        max: 2,
        step: 0.01,
        value: 1,
        format: (v) => v.toFixed(2) + " ×",
        enabled: (s) => s.mode !== "bare",
        hint: (s) => s.mode === "bare" ? "裸界面没有膜厚；选择单层或多层后启用" : "",
      },
      {
        key: "pFraction",
        label: "入射能流中的p偏振比例",
        min: 0,
        max: 1,
        step: 0.05,
        value: 0.5,
        format: (v) => (100 * v).toFixed(0) + "%",
      },
      {
        key: "progress",
        label: "从正入射到终点角度的回放进度",
        min: 0,
        max: 100,
        step: 0.25,
        value: 100,
        format: (v) => v.toFixed(1) + "%",
      },
    ],
    presets: [
      {
        label: "单层 · 45°",
        values: {
          mode: "single",
          angle: 45,
          index: 1.38,
          thicknessScale: 1,
          wavelength: 550,
          pFraction: 0.5,
          progress: 100,
        },
      },
      {
        label: "正入射理想匹配",
        values: {
          mode: "single",
          angle: 0,
          index: Math.sqrt(1.52),
          thicknessScale: 1,
          wavelength: 550,
          progress: 100,
        },
      },
      {
        label: "裸界面 · Brewster角",
        values: { mode: "bare", angle: bareTruth().brewster, progress: 100 },
      },
      {
        label: "双层 L → H",
        values: { mode: "pair", index: 1.38, thicknessScale: 1, progress: 100 },
      },
      {
        label: "双层 H → L",
        values: {
          mode: "reverse",
          index: 1.38,
          thicknessScale: 1,
          progress: 100,
        },
      },
      {
        label: "六层 L → H",
        values: { mode: "six", index: 1.38, thicknessScale: 1, progress: 100 },
      },
      { label: "零膜厚对照", values: { thicknessScale: 0, progress: 100 } },
      { label: "从正入射开始", values: { progress: 0 } },
    ],
    content:
      '<style>.actions button{font-size:11px;padding:4px 8px}.pol-geometry{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:16px;align-items:center}.pol-geometry>div{min-width:0}.pol-basis{font-size:12px;line-height:1.9}.pol-basis span{display:block}.pol-caption{font-size:11px;margin:4px 0}.incidence svg{display:block;width:100%;height:auto}.incidence text{fill:currentColor;font:12px sans-serif}.pol-plots{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,430px),1fr));gap:16px}.pol-plots>section{min-width:0}.pol-plots h4{font-size:12px;font-weight:500;margin:12px 0}.chart text{font-size:12px}.stats strong{font-size:19px}.truth{font-size:11px;line-height:1.9;border:1px solid #9caea255;border-radius:6px;padding:12px}.pol-layers{font-size:11px;line-height:1.8;overflow-wrap:anywhere}@media(max-width:650px){.stats{grid-template-columns:1fr}.pol-geometry{grid-template-columns:1fr;gap:8px}.pol-basis{display:grid;grid-template-columns:1fr 1fr;font-size:11px;gap:5px 12px}.incidence text{font-size:18px}.chart text{font-size:22px}}</style><p class="reading" data-mode></p><div class="pol-geometry"><div class="incidence" data-incidence></div><div class="pol-basis" data-basis></div></div><p class="pol-caption">入射面为纸面；层厚示意，折射方向按Snell计算。</p><div class="stats"></div><div class="pol-plots"><section><h4>固定当前波长，改变入射角</h4><div class="chart" data-angle></div></section><section><h4>固定当前入射角，改变波长</h4><div class="chart" data-spectrum></div></section></div><div class="legend"><span><i style="border-color:#40879a"></i>s</span><span><i style="border-color:#bb7946"></i>p</span><span><i style="border-color:#8b78aa;border-top-style:dashed"></i>能流加权</span><span><i style="border-color:#9b703c;border-top-style:dotted"></i>独立Fresnel递推点</span></div><p class="pol-layers reading" data-layers></p><p class="reading" data-reading></p><p class="truth" data-truth></p>',
    note: "空气入射n₀=1、半无限基底nₛ=1.52，平面相干层系、各向同性非磁介质、实常数折射率、无吸收。单层/L层折射率可调，H=1.70；各层初始厚度d=550 nm/(4n)，再乘膜厚倍率。Snell约束nⱼsinθⱼ=sinθ₀；切向电场导纳Ys=n cosθ、Yp=n/cosθ，δ=2πnd cosθ/λ。相位沿z投影，不用几何路程nd/cosθ代替。透射率由出口/入口导纳比乘|t|²独立计算，不预设T=1−R。独立递推先采用完整电场Fresnel振幅，再转换p的符号和切向分量约定。按入射能流权重加R和T；50%表示s/p等能流，无分析器时包括非偏振输入，不能平均复反射振幅。图中光线仅示意传播方向，干涉由完整多次反射计算；层厚不按比例。回放实际改变当前入射角。裸界面Brewster角不保证镀膜系统零反射；δ=π/2标记也不保证当前反射谱最小。本例各层均为传播波，未计算全反射、倏逝波、色散、吸收、表面散射或基底背面。",
    update(root, s) {
      const p = parameters(s);
      s.mode = p.mode;
      const m = coatingBudget(p),
        aKey = JSON.stringify([m.mode, m.layers, m.wavelength, m.pFraction]),
        sKey = JSON.stringify([m.mode, m.layers, m.currentAngle, m.pFraction]);
      if (aKey !== angleKey) {
        angularData = sweepData(m, "angle");
        angleKey = aKey;
      }
      if (sKey !== spectrumKey) {
        spectralData = sweepData(m, "wavelength");
        spectrumKey = sKey;
      }
      root.querySelector("[data-mode]").textContent =
        names[m.mode] +
        "；当前入射角 " +
        m.currentAngle.toFixed(3) +
        "°，终点 " +
        m.angle.toFixed(3) +
        "°。" +
        (m.mode === "bare"
          ? "膜折射率和膜厚控件在裸界面模式下不参与结果。"
          : "各层物理厚度固定，改变入射角不会重新配膜厚。");
      root.querySelector("[data-incidence]").innerHTML = incidenceFigure(
        m,
        "rays",
      );
      root.querySelector("[data-basis]").innerHTML = [
        "s：电场垂直纸面 ⊙",
        "p：电场在纸面内",
        `当前 θ₀=${m.currentAngle.toFixed(2)}°`,
        "空气 n₀=1",
        "基底 nₛ=1.52",
        `透射角 ${((Math.asin(Math.sin((m.currentAngle * Math.PI) / 180) / 1.52) * 180) / Math.PI).toFixed(2)}°`,
      ]
        .map((text) => `<span>${text}</span>`)
        .join("");
      root.querySelector("[data-angle]").innerHTML = reflectanceFigure(
        angularData,
        m,
        "angle",
      );
      root.querySelector("[data-spectrum]").innerHTML = reflectanceFigure(
        spectralData,
        m,
        "wavelength",
      );
      root.querySelector(".stats").innerHTML = [
        ["s反射率 Rs", pct(m.s.R), "Ts=" + pct(m.s.T)],
        ["p反射率 Rp", pct(m.p.R), "Tp=" + pct(m.p.T)],
        ["按能流合成的R", pct(m.R), "合成T=" + pct(m.T)],
      ]
        .map(
          ([a, b, c]) =>
            `<div><small>${a}</small><strong>${b}</strong><em>${c}</em></div>`,
        )
        .join("");
      root.querySelector("[data-layers]").textContent = m.layers.length
        ? "从入射侧起，各层(n, d, 折射角θⱼ, δⱼ/π)：" +
          m.layers
            .map(
              (l, j) =>
                `(${l.n.toFixed(5)}, ${l.d.toFixed(3)} nm, ${((Math.acos(m.s.cosines[j + 1]) * 180) / Math.PI).toFixed(3)}°, ${((2 * l.n * l.d * m.s.cosines[j + 1]) / m.wavelength).toFixed(5)})`,
            )
            .join("；")
        : "没有膜层，直接求空气—玻璃界面的Fresnel反射与透射。";
      root.querySelector("[data-reading]").textContent =
        `裸界面的Brewster角真值为 ${m.bare.brewster.toFixed(6)}°；当前同角度裸界面Rs=${pct(m.bare.s.R)}，Rp=${pct(m.bare.p.R)}。${m.mode === "single" ? "当前膜的δ=π/2条件位于 " + m.quarterPhase.toFixed(3) + " nm；它是相位条件，是否为反射最小还取决于s/p界面振幅。" : ""}`;
      root.querySelector("[data-truth]").textContent =
        `独立Fresnel递推：Rs=${pct(m.sTruth.R)}，Ts=${pct(m.sTruth.T)}；Rp=${pct(m.pTruth.R)}，Tp=${pct(m.pTruth.T)}。统一切向电场约定后，两条算法的r、t实虚部最大差 ${m.error.toExponential(3)}。矩阵能流残差：Rs+Ts−1=${(m.s.R + m.s.T - 1).toExponential(2)}，Rp+Tp−1=${(m.p.R + m.p.T - 1).toExponential(2)}；能流加权R+T=${(m.R + m.T).toFixed(10)}。`;
    },
    setup: ({ root, state, render }) =>
      replay({
        root,
        state,
        render,
        element,
        signal,
        key: "progress",
        label: "回放入射角扫描",
        durationMs: 9000,
      }),
  });
}
