import { migrateStageProgress, experiment } from "../common/ui.js";
import { replay } from "../common/replay.js";
import {
  dualMetrics,
  dualTruth,
  dualObservations,
  dualMoments,
} from "./model.js";
import { readoutCards, scatterFigure } from "./figures.js";
export function mount({ element, signal, session }) {
  let cacheKey, cache;
  return experiment({
    version: 2,
    migrate: (saved) => migrateStageProgress(saved, [0, 30, 60, 85], 3),
    element,
    signal,
    session,
    kicker: "第五章 · 同次曝光的双增益读出",
    title: "一次曝光的两个增益读数",
    intro:
      "同一次积分的高、低增益读数共享同一份电荷，可与两次独立曝光作比较。各读数均换算到电子刻度；散点和协方差来自观测，生成模型另列作对照。",
    controls: [
      {
        key: "signalEV",
        label: "每次曝光的平均信号",
        min: 0,
        max: 16,
        step: 0.25,
        value: 6,
        format: (v) => (2 ** v).toFixed(2) + " e⁻",
      },
      {
        key: "highNoise",
        label: "H通道独立读噪 RMS",
        min: 0,
        max: 12,
        step: 0.5,
        value: 1,
        format: (v) => v.toFixed(1) + " e⁻",
      },
      {
        key: "lowNoise",
        label: "L通道独立读噪 RMS",
        min: 0,
        max: 12,
        step: 0.5,
        value: 4,
        format: (v) => v.toFixed(1) + " e⁻",
      },
      {
        key: "progress",
        label: "查看讲解环节",
        min: 0,
        max: 3,
        step: 1,
        value: 3,
        discrete: true,
        format: (v) =>
          ["积分", "高增益读出", "低增益或再次积分", "归一化与融合"][
            Math.min(3, Math.floor(v))
          ],
      },
    ],
    presets: [
      { label: "同一次曝光", values: { mode: "shared" } },
      { label: "两次独立曝光", values: { mode: "independent" } },
      {
        label: "散粒噪声占主导",
        values: {
          signalEV: 10,
          highNoise: 1,
          lowNoise: 1,
          mode: "shared",
          progress: 3,
        },
      },
      {
        label: "阴影读噪",
        values: {
          signalEV: 0,
          highNoise: 1,
          lowNoise: 4,
          mode: "shared",
          progress: 3,
        },
      },
      {
        label: "高增益先截顶",
        values: {
          signalEV: 14,
          highNoise: 1,
          lowNoise: 4,
          mode: "shared",
          progress: 3,
        },
      },
      { label: "从积分开始", values: { progress: 0 } },
      {
        label: "换一组成对读数",
        values: (s) => ({ seed: (s.seed ?? 20261018) + 1 }),
      },
    ],
    content:
      '<style>.actions button{font-size:11px;padding:4px 8px}.dual-chart svg{width:100%;height:auto;display:block}.dual-chart text{fill:currentColor;font:11px ui-sans-serif,sans-serif}.dual-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;list-style:none;padding:0;margin:12px 0}.dual-steps li{border:1px solid #9caea255;padding:10px;border-radius:5px;min-width:0;opacity:.25}.dual-steps li[data-ready=true]{opacity:1}.dual-steps li[aria-current=step]{border-color:currentColor;background:#9caea211}.dual-steps span{font-size:11px;display:block;min-height:2.2em}.dual-steps strong{font-size:12px;display:block;overflow-wrap:anywhere;margin-top:8px}[data-sequence] h4{font-size:12px}.dual-table{width:100%;font-size:11px;border-collapse:collapse;margin:15px 0;font-variant-numeric:tabular-nums}.dual-table th,.dual-table td{text-align:left;padding:7px 5px;border-bottom:1px solid #9caea233}.dual-key{font-size:11px;line-height:1.8}.truth{font-size:11px;line-height:1.9;border:1px solid #9caea255;border-radius:6px;padding:12px;overflow-wrap:anywhere}.stats strong{font-size:20px}@media(max-width:550px){.dual-chart text{font-size:16px}.dual-steps{grid-template-columns:1fr 1fr}.stats{grid-template-columns:1fr}.stats>div{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.dual-table th,.dual-table td{padding:7px 2px}}</style><p class="reading" data-mode></p><div class="dual-chart" data-sequence></div><div class="stats"></div><div class="dual-chart" data-scatter></div><p class="dual-key" data-key></p><table class="dual-table"><thead><tr><th>统计量 / (e⁻)²</th><th>4096组观测</th><th>裁切前真值</th></tr></thead><tbody></tbody></table><p class="reading" data-reading></p><div class="truth" data-truth aria-label="双增益独立真值对照"></div>',
    note: "声明的两路径教学读出链；H=80 µV/e⁻、L=20 µV/e⁻，可用电压上限均0.8 V，对应10000与40000 e⁻。假定光电二极管不先饱和。共同前级噪声1.5 e⁻ rms；同次曝光共用Poisson电荷和此前级噪声，各路径另加独立Gaussian读噪。两次独立曝光模式的电荷及前级噪声均独立，每次均值相同，因此总采光量是两倍。减黑后的负值保留；不加ADC量化。H截顶时改用未截顶的L，L截顶而H未截顶时用H，两者截顶则标记失效。融合权重由已知生成参数计算，未估计实拍权重。切换规则会带来选择效应，不套用未裁切线性方差。参数与顺序不代表具体厂商电路，来源仅用于同次信号双增益读出的机制。",
    update(root, s) {
      const p = {
          mean: 2 ** s.signalEV,
          highNoise: s.highNoise,
          lowNoise: s.lowNoise,
          mode: s.mode === "independent" ? "independent" : "shared",
          seed: Number.isSafeInteger(s.seed) ? s.seed : 20261018,
        },
        key = JSON.stringify(p);
      Object.assign(s, { mode: p.mode, seed: p.seed });
      if (key !== cacheKey) {
        const metrics = dualMetrics(p),
          truth = dualTruth(p),
          records = dualObservations(p),
          observed = dualMoments(records.samples);
        cache = {
          metrics,
          truth,
          records,
          observed,
          scatter: scatterFigure(p, records),
        };
        root.querySelector("[data-scatter]").innerHTML = cache.scatter;
        cacheKey = key;
      }
      const { metrics: m, truth: t, records: o, observed: v } = cache,
        clipped = o.highClipped || o.lowClipped;
      root.querySelector("[data-mode]").textContent =
        `${p.mode === "shared" ? "一次积分，共享电荷" : "两次独立积分"}；每组平均信号电荷合计 ${(p.mean * (p.mode === "shared" ? 1 : 2)).toFixed(2)} e⁻。未裁切时融合权重 H=${m.weightH.toFixed(4)}，L=${(1 - m.weightH).toFixed(4)}。${o.bothClipped ? `两路均截顶 ${o.bothClipped} 组，这些组的输入无法由融合恢复。` : ""}`;
      root.querySelector("[data-sequence]").innerHTML = readoutCards(
        p,
        o.example,
        o.samples[0],
        [0, 30, 60, 85][Math.min(3, Math.floor(s.progress))],
      );
      root.querySelector("[data-key]").textContent = clipped
        ? "蓝点为有截顶的实际观测；暂停绘制线性真值椭圆，表中仍保留裁切前真值。"
        : "蓝点：前256组成对观测；棕色虚线：裁切前真值协方差的1σ椭圆。它只显示协方差尺度，不表示Poisson/Gaussian混合分布的固定覆盖概率。";
      root.querySelector(".stats").innerHTML = [
        [
          "融合的观测 RMS",
          Math.sqrt(v.fusedVariance).toFixed(4) + " e⁻",
          clipped ? "已含截顶与路径切换" : "样本标准差",
        ],
        [
          "线性模型 RMS",
          Math.sqrt(m.variance).toFixed(4) + " e⁻",
          "裁切前预测",
        ],
        [
          "遗漏协方差的预测",
          Math.sqrt(m.omitCovariance).toFixed(4) + " e⁻",
          "沿用同一融合权重",
        ],
      ]
        .map(
          ([a, b, c]) =>
            `<div><small>${a}</small><strong>${b}</strong><em>${c}</em></div>`,
        )
        .join("");
      root.querySelector("tbody").innerHTML = [
        ["Var(H)", v.highVariance, m.cov[0][0]],
        ["Var(L)", v.lowVariance, m.cov[1][1]],
        ["Cov(H,L)", v.covariance, m.cov[0][1]],
        ["Var(融合)", v.fusedVariance, m.variance],
      ]
        .map(
          ([a, b, c]) =>
            `<tr><td>${a}</td><td>${b.toFixed(4)}</td><td>${c.toFixed(4)}</td></tr>`,
        )
        .join("");
      root.querySelector("[data-reading]").textContent =
        `观测协方差 ${v.covariance.toFixed(4)} (e⁻)²，裁切前真值 ${t.covariance.toFixed(4)} (e⁻)²。H截顶 ${o.highClipped}/4096，L截顶 ${o.lowClipped}/4096；${o.fallback}组改用L，两路均截顶 ${o.bothClipped}/4096。融合均值 ${v.means.fused.toFixed(4)} e⁻，相对生成均值偏差 ${(v.means.fused - p.mean).toFixed(4)} e⁻。${clipped ? "这里的偏差与方差必须一起看；线性SNR不概括裁切损失。" : p.mode === "shared" ? "共同电荷的涨落出现在两条读数中；融合只能降低独立读噪，不能把同一份散粒噪声平均掉。" : "此时两份电荷独立，协方差真值为零；平均的收益伴随两次曝光的采光代价。"}`;
      root.querySelector("[data-truth]").textContent =
        `独立真值对照：按各噪声源的路径传播得到协方差 ${m.cov[0][1].toFixed(9)}、融合方差 ${m.variance.toFixed(9)} (e⁻)²；条件协方差与标量二次最小化给出 ${t.covariance.toFixed(9)}、${t.variance.toFixed(9)}。统计只读取H、L和融合结果，不用生成电荷修正观测。`;
      for (const b of root.querySelectorAll(".actions button"))
        if (["同一次曝光", "两次独立曝光"].includes(b.textContent))
          b.setAttribute(
            "aria-pressed",
            String((b.textContent === "同一次曝光") === (p.mode === "shared")),
          );
    },
    setup: ({ root, state, render }) =>
      replay({
        root,
        state,
        render,
        element,
        signal,
        key: "progress",
        end: 3,
        label: "回放读出步骤",
        durationMs: 8000,
      }),
  });
}
