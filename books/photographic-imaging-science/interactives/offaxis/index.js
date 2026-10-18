import { experiment } from "../common/ui.js";
import { replay } from "../common/replay.js";
import { illumination } from "./model.js";
import { geometryFigure, curveData, illuminationFigure } from "./figures.js";
const stages = [
  "出瞳在垂直视线的平面上投影，面积乘cosθ。",
  "中心距离从z变为z/cosθ，反平方项乘cos²θ。",
  "像面接收光还要乘一个入射余弦cosθ。",
  "三个因子相乘得到cos⁴θ；有限出瞳另外逐面积元积分。",
];
export function mount({ element, signal, session }) {
  let key, curveKey, m, data;
  return experiment({
    element,
    signal,
    session,
    kicker: "第一章 · 离轴辐照度",
    title: "cos⁴θ 的几何来源与有限出瞳修正",
    intro:
      "离轴角变大时，出瞳投影缩小、中心距离变长，像面接收还要乘余弦。先逐项看这三个因子，再扩大出瞳，比较小瞳近似与完整面积积分。",
    controls: [
      {
        key: "angle",
        label: "像点到出瞳中心的离轴角 θ",
        min: 0,
        max: 65,
        step: 1,
        value: 45,
        format: (v) => v.toFixed(1) + "°",
      },
      {
        key: "radiusRatio",
        label: "出瞳半径 / 轴向距离 a/z",
        min: 0.005,
        max: 0.35,
        step: "any",
        value: 0.05,
        format: (v) => v.toFixed(4),
      },
      {
        key: "progress",
        label: "几何推导的展示进度",
        min: 0,
        max: 100,
        step: 0.25,
        value: 100,
        format: (v) => v.toFixed(1) + "%",
      },
    ],
    presets: [
      {
        label: "小出瞳 · 45°",
        values: { angle: 45, radiusRatio: 0.05, progress: 100 },
      },
      {
        label: "扩大出瞳",
        values: { angle: 45, radiusRatio: 0.35, progress: 100 },
      },
      { label: "轴上对照", values: { angle: 0, progress: 100 } },
      { label: "看出瞳投影", values: { progress: 20 } },
      { label: "看距离项", values: { progress: 45 } },
      { label: "看接收面", values: { progress: 70 } },
      { label: "三个因子合起来", values: { progress: 100 } },
      { label: "从推导开始", values: { progress: 0 } },
    ],
    content:
      '<style>.actions button{font-size:11px;padding:4px 8px}.off-geometry{display:grid;grid-template-columns:1.2fr 1fr;gap:12px}.off-geometry svg{display:block;width:100%;height:auto}.off-geometry text{fill:currentColor;font:12px sans-serif}.factors{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:15px 0}.factor{border:1px solid #9caea255;border-radius:6px;padding:10px;min-width:0}.factor[data-active=true]{border-color:#bb7946;background:#bb79460c}.factor small{display:block;font-size:10px}.factor strong{display:block;font-size:18px;font-weight:500}.factor em{font-size:10px;font-style:normal;opacity:.65}.stats strong{font-size:20px}.truth{font-size:11px;line-height:1.9;border:1px solid #9caea255;border-radius:6px;padding:12px}.chart text{font-size:12px}@media(max-width:600px){.factors{grid-template-columns:1fr 1fr}.stats{grid-template-columns:1fr}.off-geometry{grid-template-columns:1fr}.off-geometry text{font-size:13px}.chart text{font-size:21px}}</style><div class="off-geometry" data-geometry></div><div class="factors"></div><p class="reading" data-stage aria-live="polite"></p><div class="chart" data-curve></div><div class="legend"><span><i style="border-color:#40879a"></i>有限圆瞳积分</span><span><i style="border-color:#bb7946;border-top-style:dashed"></i>小瞳cos⁴θ</span><span><i style="border-color:#9b703c;border-top-style:dotted"></i>独立解析真值</span></div><div class="stats"></div><p class="truth" data-truth></p>',
    note: "固定平行的圆形出瞳与平面接收面，z=60 mm，像点高度h=z tanθ；方向无关的辐亮度L和能量透射率T。每个瞳面面积元贡献TL·z²/[z²+(x−h)²+y²]² dA，全部瞳面可见。未含镜组瞳像畸变、机械截光、像素角度响应或材料散射。实线为64×128等面积中点积分，归一化到同一有限瞳的轴上积分；独立真值由圆周边界积分求出。cos⁴θ取所有面积元都近似处于中心视线的极限，不能替代有限瞳积分。右上为固定方向的平行投影示意，不把有限视点下的瞳形当作同一投影。回放只突出推导步骤，不改变角度或辐照度。",
    update(root, s) {
      const k = JSON.stringify([s.angle, s.radiusRatio]);
      if (s.radiusRatio !== curveKey) {
        data = curveData(s.radiusRatio);
        curveKey = s.radiusRatio;
      }
      if (k !== key) {
        m = illumination(s);
        root.querySelector("[data-curve]").innerHTML = illuminationFigure(
          data,
          s.angle,
        );
        key = k;
      }
      root.querySelector("[data-geometry]").innerHTML =
        geometryFigure(m, "side") + geometryFigure(m, "projection");
      const step = Math.min(3, Math.floor(s.progress / 25));
      root.querySelector(".factors").innerHTML = [
        ["出瞳投影", "cosθ", m.projection],
        ["距离反平方", "cos²θ", m.distance],
        ["接收面投影", "cosθ", m.receiver],
        ["小瞳乘积", "cos⁴θ", m.smallPupil],
      ]
        .map(
          ([label, formula, value], i) =>
            `<div class="factor" data-active="${i === step}"><small>${label}</small><strong>${value.toFixed(5)}</strong><em>${formula}</em></div>`,
        )
        .join("");
      root.querySelector("[data-stage]").textContent = stages[step];
      root.querySelector(".stats").innerHTML = [
        [
          "cos⁴θ近似",
          (100 * m.smallPupil).toFixed(4) + "%",
          "相对同一角度模型的轴上值",
        ],
        [
          "有限出瞳积分",
          (100 * m.relative).toFixed(4) + "%",
          "相对同一有限出瞳轴上值",
        ],
        [
          "独立解析真值",
          (100 * m.truth).toFixed(4) + "%",
          "相对轴上；面积元角度完整保留",
        ],
      ]
        .map(
          ([a, b, c]) =>
            `<div><small>${a}</small><strong>${b}</strong><em>${c}</em></div>`,
        )
        .join("");
      root.querySelector("[data-truth]").textContent =
        `数值积分与独立解析式的相对照度差为 ${(m.relative - m.truth).toExponential(3)}。有限瞳真值与cos⁴θ相差 ${(100 * (m.truth - m.smallPupil)).toFixed(5)} 个百分点，属于近似误差。当前出瞳半径a=${m.radiusMm.toFixed(3)} mm，中心距离r=${m.distanceMm.toFixed(3)} mm。轴上解析值E(0)/(TL)=πa²/(z²+a²)，有限瞳对照不使用cos⁴θ作为答案。`;
    },
    setup: ({ root, state, render }) =>
      replay({
        root,
        state,
        render,
        element,
        signal,
        key: "progress",
        label: "逐项展示几何因子",
        durationMs: 8000,
      }),
  });
}
