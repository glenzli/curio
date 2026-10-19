import { experiment } from "../common/ui.js";
import { replay } from "../common/replay.js";
import { spectralPair, quadratureTruth, cofactorNull } from "./model.js";
import { reflectanceFigure, responseFigure, readoutFigure } from "./figures.js";
export function mount({ element, signal, session }) {
  return experiment({
    element,
    signal,
    session,
    kicker: "第七章 · 光谱与相机响应",
    title: "同色异谱与相机的光谱响应",
    intro:
      "在均匀照明和参照相机下，A、B光谱具有相同的三个通道读数。改变照明或R通道的短波响应可打破这种同响应关系；人眼色度需由另一组光谱响应判断。",
    controls: [
      {
        key: "separation",
        label: "反射率偏离 0.5 的幅度 a",
        min: 0,
        max: 0.5,
        step: 0.01,
        value: 0.35,
        format: (v) => v.toFixed(2),
      },
      {
        key: "tilt",
        label: "照明光谱倾斜 τ",
        min: -0.8,
        max: 0.8,
        step: 0.05,
        value: 0,
        format: (v) => v.toFixed(2),
      },
      {
        key: "probe",
        label: "R通道增加的短波响应 η",
        min: 0,
        max: 0.5,
        step: 0.05,
        value: 0,
        format: (v) => v.toFixed(2),
      },
      {
        key: "progress",
        label: "从短波到长波的积分进度",
        min: 0,
        max: 100,
        step: 0.25,
        value: 100,
        format: (v) => v.toFixed(1) + "%",
      },
    ],
    presets: [
      {
        label: "参照条件 · 同响应",
        values: { separation: 0.35, tilt: 0, probe: 0, progress: 100 },
      },
      {
        label: "换照明",
        values: { separation: 0.35, tilt: 0.6, probe: 0, progress: 100 },
      },
      {
        label: "换相机响应",
        values: { separation: 0.35, tilt: 0, probe: 0.3, progress: 100 },
      },
      {
        label: "两条反射率相同",
        values: { separation: 0, tilt: 0, probe: 0, progress: 100 },
      },
      { label: "从短波开始", values: { progress: 0 } },
    ],
    content:
      '<style>.actions button{font-size:11px;padding:4px 8px}.spectral-pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:12px}.spectral-pair>div{min-width:0}.chart text{font-size:14px}.stats strong{font-size:20px}.truth{font-size:11px;line-height:1.9;padding:12px;border:1px solid #9caea255;border-radius:6px}.illuminant{font-size:12px;font-variant-numeric:tabular-nums}.illuminant b{white-space:nowrap}@media(max-width:650px){.spectral-pair{grid-template-columns:1fr}.stats{grid-template-columns:1fr}.chart text{font-size:20px}}</style><div class="spectral-pair"><div class="chart" data-reflectance></div><div class="chart" data-response></div></div><p class="illuminant" data-illumination></p><div class="chart" data-readout></div><div class="stats"></div><p class="reading" data-reading aria-live="polite"></p><p class="truth" data-truth></p>',
    note: "400–700 nm分为四个75 nm等宽波段，区间外响应为零。ρA=0.5+a(1,−1,1,−1)，ρB=0.5−a(1,−1,1,−1)；0≤a≤0.5。照明为相对谱曝光密度 E=(1−τ,1−τ/3,1+τ/3,1+τ)，几何比例固定，像面相对谱曝光H=Eρ。读数为∫Hs dλ/(75 nm)，无单位；不是电子数或显示RGB。响应为声明的理想方窗，未采用实测相机或CIE人眼函数。无荧光、噪声、白平衡、色彩矩阵、饱和或显示色块；倾斜参数不是色温。轮廓是完整积分，实色是已积分部分；动画顺序不代表相机按波长顺序曝光。",
    update(root, s) {
      const m = spectralPair(s),
        ta = quadratureTruth(m.a, m.illuminant, m.response),
        tb = quadratureTruth(m.b, m.illuminant, m.response),
        error = Math.max(
          ...ta.map((v, k) => Math.abs(v - m.cameraA[k])),
          ...tb.map((v, k) => Math.abs(v - m.cameraB[k])),
        ),
        delta = m.cameraA.map((v, k) => v - m.cameraB[k]),
        maxDelta = Math.max(...delta.map(Math.abs));
      root.querySelector("[data-reflectance]").innerHTML = reflectanceFigure(m);
      root.querySelector("[data-response]").innerHTML = responseFigure(m);
      root.querySelector("[data-readout]").innerHTML = readoutFigure(m);
      root.querySelector("[data-illumination]").textContent =
        "照明E · 四个波段的相对谱曝光密度：" +
        m.illuminant.map((v) => v.toFixed(3)).join(" / ") +
        "。总和恒为4，光谱形状可变。";
      root.querySelector(".stats").innerHTML = [
        [
          "反射率最大差",
          (2 * m.separation).toFixed(3),
          "无单位；A与B逐波段比较",
        ],
        ["完整响应最大差", maxDelta.toFixed(5), "max |cA − cB| · 相对值"],
        ["独立波长积分差", error.toExponential(2), "点积与400点中点积分比较"],
      ]
        .map(
          ([a, b, c]) =>
            `<div><small>${a}</small><strong>${b}</strong><em>${c}</em></div>`,
        )
        .join("");
      root.querySelector("[data-reading]").textContent =
        (m.separation === 0
          ? "A和B的反射率本来就相同。"
          : maxDelta < 1e-12
            ? "反射率不同，三个完整相机响应相同。"
            : "这对反射率仍是按参照条件构造的；在当前照明或相机下，三个响应不再全部相同。") +
        " Δ(R,G,B)=" +
        delta.map((v) => v.toFixed(5)).join("，") +
        "。";
      root.querySelector("[data-truth]").textContent =
        "参照真值：响应S₀的零方向为q=(1,−1,1,−1)，S₀q=0；独立三阶子式求得 " +
        cofactorNull().join("，") +
        "。参照照明下，两条反射率的完整响应都为(1,1,1)。改变照明或响应后须检查当前S·diag(E)·q，原先的S₀q=0已不足以保证相同。当前逐波长积分A=(" +
        ta.map((v) => v.toFixed(5)).join(", ") +
        ")，B=(" +
        tb.map((v) => v.toFixed(5)).join(", ") +
        ")。";
    },
    setup: ({ root, state, render }) =>
      replay({
        root,
        state,
        render,
        element,
        signal,
        key: "progress",
        label: "回放波段积分",
        durationMs: 8000,
      }),
  });
}
