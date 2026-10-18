import { experiment } from "../common/ui.js";
import { replay } from "../common/replay.js";
import { observations, experimentData, correlation } from "./model.js";
import { scatterFigure, covarianceTable, NAMES } from "./figures.js";
export function mount({ element, signal, session }) {
  let rawKey, key, raw, m;
  return experiment({
    element,
    signal,
    session,
    kicker: "第七章 · 白平衡与噪声协方差",
    title: "白平衡后的噪声怎样进入颜色混合",
    intro:
      "通道乘法会同时放大均值和标准差；矩阵再把多个通道的噪声混在一起。这里沿用同一批输入读数，分别比较变换前后散点、标准差与相关性。",
    controls: [
      {
        key: "exposure",
        label: "实际曝光变化",
        min: -2,
        max: 2,
        step: 0.25,
        value: 0,
        format: (v) => v.toFixed(2) + " stop",
      },
      {
        key: "red",
        label: "红通道白平衡增益",
        min: 1,
        max: 4,
        step: 0.05,
        value: 2,
        format: (v) => v.toFixed(2) + " ×",
      },
      {
        key: "blue",
        label: "蓝通道白平衡增益",
        min: 1,
        max: 4,
        step: 0.05,
        value: 2.5,
        format: (v) => v.toFixed(2) + " ×",
      },
      {
        key: "shared",
        label: "输入共同噪声 RMS",
        min: 0,
        max: 20,
        step: 1,
        value: 8,
        format: (v) => v.toFixed(0) + " e⁻",
      },
      {
        key: "mixing",
        label: "教学矩阵的混合比例",
        min: 0,
        max: 1,
        step: 0.05,
        value: 1,
        format: (v) => (100 * v).toFixed(0) + "%",
      },
      {
        key: "progress",
        label: "传播步骤的展示进度",
        min: 0,
        max: 100,
        step: 0.25,
        value: 100,
        format: (v) => v.toFixed(1) + "%",
      },
    ],
    presets: [
      {
        label: "中性灰白平衡",
        values: {
          red: 2,
          blue: 2.5,
          mixing: 1,
          shared: 8,
          exposure: 0,
          progress: 100,
        },
      },
      { label: "关闭白平衡", values: { red: 1, blue: 1, progress: 100 } },
      {
        label: "只有通道乘法",
        values: { red: 2, blue: 2.5, mixing: 0, progress: 60 },
      },
      {
        label: "独立输入仍会相关",
        values: { shared: 0, mixing: 1, progress: 100 },
      },
      {
        label: "增大共同噪声",
        values: { shared: 20, mixing: 1, progress: 100 },
      },
      { label: "少收两档光", values: { exposure: -2, progress: 100 } },
      {
        label: "重拍输入读数",
        values: (s) => ({ seed: ((s.seed ?? 20261018) + 1) >>> 0 }),
      },
      { label: "从输入开始", values: { progress: 0 } },
    ],
    content:
      '<style>.actions button{font-size:11px;padding:4px 8px}.wb-stages{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:12px}.wb-stage{min-width:0;border:1px solid var(--line,#aaa);border-radius:6px;padding:8px}.wb-stage[data-active=true]{outline:1px solid currentColor}.wb-stage svg{width:100%;height:auto}.wb-stage text{fill:currentColor;font-size:14px}.wb-stage p{font-size:11px;line-height:1.8;margin:5px 0}.wb-cov{overflow:auto;font-size:11px;font-variant-numeric:tabular-nums}.wb-cov table{width:100%;border-collapse:collapse}.wb-cov th,.wb-cov td{padding:8px;text-align:right;border-bottom:1px solid var(--line,#aaa);white-space:nowrap}.wb-cov caption{text-align:left;padding:12px 0}.truth{font-size:11px;line-height:1.9;border:1px solid var(--line,#aaa);padding:12px;border-radius:6px}.stats strong{font-size:20px}@media(max-width:650px){.wb-stages{grid-template-columns:1fr}.wb-stage p{font-size:11px}.stats{grid-template-columns:1fr}}</style><p class="reading" data-stage aria-live="polite"></p><div class="wb-stages"></div><div class="stats"></div><div class="wb-cov"></div><p class="reading" data-reading></p><p class="truth" data-truth></p>',
    note: "输入均值为曝光倍率乘(800,1600,640) e⁻；每通道独立Gaussian项方差μⱼ+4²，另加所有通道共同的Gaussian读出项。它是未饱和、黑电平校正后的三通道高计数近似，未模拟实际CFA空间相关或器件结构。输入用e⁻，乘白平衡后用输入电子参考刻度e_ref，不表示又产生电子。固定样本数4096；改变增益/混合不重拍，改变曝光/共同噪声会用同一种子重建输入，可单独重拍。白平衡W=diag(wR,1,wB)，混合M=(1−β)I+βK，K各行和为1，输出叫Y1/Y2/Y3，不是已标定XYZ或显示RGB。中间值保留浮点，不裁切。散点仅画前128个零均值样本，三个面板共用坐标范围；橙线为解析协方差的1σ椭圆，不是均值置信区间，也不包含约95%的二维样本。矩阵协方差另用独立潜在噪声源展开核对；样本协方差使用N−1分母。回放只突出传播步骤，不改变观测或真实协方差。",
    update(root, s) {
      const rk = JSON.stringify([s.exposure, s.shared, s.seed ?? 20261018]),
        k = JSON.stringify([rk, s.red, s.blue, s.mixing]);
      if (rk !== rawKey) {
        raw = observations(s);
        rawKey = rk;
      }
      if (k !== key) {
        m = experimentData(s, raw);
        root.querySelector(".wb-stages").innerHTML = m.stages
          .map(
            (stage, i) =>
              `<section class="wb-stage">${scatterFigure(m, i)}<p>均值：${stage.mean.map((v) => v.toFixed(1)).join(" / ")} e_ref<br>σ真值：${stage.covariance.map((r, j) => Math.sqrt(r[j]).toFixed(2)).join(" / ")} e_ref<br>σ样本：${m.measured[i].covariance.map((r, j) => Math.sqrt(r[j]).toFixed(2)).join(" / ")} e_ref</p></section>`,
          )
          .join("");
        root.querySelector(".wb-cov").innerHTML = covarianceTable(m);
        key = k;
      }
      const stage = Math.min(2, Math.floor(s.progress / 34));
      root
        .querySelectorAll(".wb-stage")
        .forEach((e, i) => (e.dataset.active = String(i === stage)));
      root.querySelector("[data-stage]").textContent = [
        "输入噪声由独立通道项与共同项组成。",
        "白平衡把每个通道的均值和标准差乘同一增益。",
        "矩阵混合后，要把协方差的交叉项一起计算。",
      ][stage];
      root.querySelector(".stats").innerHTML = m.stages
        .map(
          (t, i) =>
            `<div><small>${NAMES[i]} ρ₁₃</small><strong>${correlation(t.covariance).toFixed(4)}</strong><em>样本 ${correlation(m.measured[i].covariance).toFixed(4)}</em></div>`,
        )
        .join("");
      const a = m.stages[0],
        b = m.stages[1];
      root.querySelector("[data-reading]").textContent =
        `蓝通道SNR：输入${(a.mean[2] / Math.sqrt(a.covariance[2][2])).toFixed(4)}，白平衡后${(b.mean[2] / Math.sqrt(b.covariance[2][2])).toFixed(4)}；σ则由${Math.sqrt(a.covariance[2][2]).toFixed(3)}变为${Math.sqrt(b.covariance[2][2]).toFixed(3)}。种子${s.seed ?? 20261018}，4096次观测；协方差单位e_ref²。`;
      root.querySelector("[data-truth]").textContent =
        `矩阵乘积与潜在源独立展开的协方差最大差${Math.max(...m.stages.flatMap((t, i) => t.covariance.flat().map((v, j) => Math.abs(v - m.truth[i].covariance.flat()[j])))).toExponential(2)}。样本统计仅使用观测数组；与真值的有限样本差不是算法错误。教学K=[[1.4,−0.3,−0.1],[−0.15,1.3,−0.15],[−0.1,−0.4,1.5]]。`;
    },
    setup: ({ root, state, render }) =>
      replay({
        root,
        state,
        render,
        element,
        signal,
        key: "progress",
        label: "逐步展示噪声传播",
        durationMs: 8500,
      }),
  });
}
