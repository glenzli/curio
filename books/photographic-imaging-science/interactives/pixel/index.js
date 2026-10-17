import { experiment } from "../common/ui.js";
import { V0, stages, pixelState, repeatedReads } from "./model.js";
import { playback } from "./playback.js";

const fmt = (x, digits = 1) =>
  (Math.abs(x) < 0.5 * 10 ** -digits ? 0 : x).toLocaleString("zh-CN", {
    maximumFractionDigits: digits,
  });
const palette = {
  charge: "#448b98",
  voltage: "#b47b43",
  single: "#8b8681",
  cds: "#448b98",
};
const svg = (label, content, height = 210) =>
  `<svg viewBox="0 0 420 ${height}" role="img" aria-label="${label}">${content}</svg>`;

function timing(s) {
  const x = (t) => 48 + t * 3.5;
  const low =
    Math.min(
      -0.8,
      -s.gain * s.electrons * 1000,
      (s.signal - V0) * 1000,
      s.resetOffsetV * 1000,
    ) * 1.15;
  const high =
    Math.max(0.8, (s.reference - V0) * 1000, s.resetOffsetV * 1000) * 1.3;
  const y = (v) => 170 - ((v - low) / (high - low)) * 138;
  let content = `<text x="48" y="16">FD 电压相对 V₀ 的变化 / mV</text>`;
  for (let i = 0; i <= 2; i++) {
    const value = low + ((high - low) * i) / 2;
    content += `<path d="M48 ${y(value)}H398" stroke="currentColor" opacity=".12"/><text x="42" y="${y(value) + 4}" text-anchor="end">${fmt(value)}</text>`;
  }
  const data = [
    [25, 0],
    [37.99, 0],
    [38, s.resetOffsetV * 1000],
    [50, s.resetOffsetV * 1000],
    [65, (s.resetOffsetV - s.gain * s.electrons) * 1000],
    [100, (s.resetOffsetV - s.gain * s.electrons) * 1000],
  ];
  const path = data
    .map(([t, v], i) => `${i ? "L" : "M"}${x(t)},${y(v)}`)
    .join(" ");
  content += `<defs><clipPath id="pixel-past"><rect x="48" y="24" width="${3.5 * s.progress}" height="154"/></clipPath></defs><path d="${path}" stroke="${palette.voltage}" fill="none" opacity=".25" stroke-dasharray="3 4"/><path d="${path}" clip-path="url(#pixel-past)" stroke="${palette.voltage}" stroke-width="2.4" fill="none"/><path d="M${x(s.progress)} 24V178" stroke="currentColor" opacity=".65"/>`;
  for (const [at, v, label, available] of [
    [44, s.reference, "Vᴿ", s.referenceAvailable],
    [73, s.signal, "Vˢ", s.signalAvailable],
  ])
    content += `<circle cx="${x(at)}" cy="${y((v - V0) * 1000)}" r="3.5" fill="${palette.voltage}" opacity="${available ? 1 : 0.25}"/><text x="${x(at) + 7}" y="${y((v - V0) * 1000) - 8}">${label}</text>`;
  for (let i = 0; i < stages.length; i++)
    content += `<text x="${x((stages[i].start + stages[i].end) / 2)}" y="192" text-anchor="middle">${i + 1}</text>`;
  content += `<text x="223" y="210" text-anchor="middle">步骤顺序（时长仅作示意）</text>`;
  return svg("FD 电压、两次采样和当前步骤", content, 220);
}

function noisePlot(samples, budget) {
  const limit = Math.max(
    1,
    budget.singleE * 3.4,
    budget.cdsE * 3.4,
    ...samples.flatMap((p) => [
      Math.abs(p.single) * 1.05,
      Math.abs(p.cds) * 1.05,
    ]),
  );
  const x = (i) => 45 + (350 * i) / (samples.length - 1),
    y = (value) => 92 - (value / limit) * 58;
  let content = `<text x="45" y="16">电荷估计误差 / e⁻</text>`;
  for (const value of [-limit, 0, limit])
    content += `<path d="M45 ${y(value)}H395" stroke="currentColor" opacity=".12"/><text x="39" y="${y(value) + 4}" text-anchor="end">${fmt(value, 0)}</text>`;
  for (const key of ["single", "cds"])
    content += `<path d="${samples.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p[key])}`).join(" ")}" stroke="${palette[key]}" fill="none" stroke-width="${key === "cds" ? 1.8 : 1.2}" opacity=".9"/>`;
  content += `<text x="45" y="174">1</text><text x="395" y="174" text-anchor="end">64 次独立读出</text>`;
  return svg("固定电荷重复读出的单次估计与 CDS 误差", content, 184);
}

export function mount({ element, signal }) {
  let cachedKey = "",
    samples = [];
  return experiment({
    element,
    signal,
    kicker: "4T 像素 · 电荷与采样",
    title: "先读参考电平，再转移信号电荷",
    intro:
      "逐步看 PPD、FD 和列读出线的状态。拖动复位偏移，比较两次电压怎样一起移动，以及差值为什么保持不变。",
    controls: [
      {
        key: "electrons",
        label: "积分结束时的信号电荷",
        min: 0,
        max: 10000,
        step: 100,
        value: 2000,
        format: (x) => `${fmt(x, 0)} e⁻`,
      },
      {
        key: "capacitanceFf",
        label: "FD 电容",
        min: 5,
        max: 30,
        step: 1,
        value: 10,
        format: (x) => `${x} fF`,
      },
      {
        key: "sampleNoiseUv",
        label: "每次采样的独立噪声（RMS）",
        min: 0,
        max: 500,
        step: 5,
        value: 30,
        format: (x) => `${x} µV`,
      },
      {
        key: "resetSigma",
        label: "本次复位偏移 k",
        min: -3,
        max: 3,
        step: 0.1,
        value: 1.5,
        format: (x) => `${fmt(x)} σᵣ`,
      },
      {
        key: "progress",
        label: "读出过程",
        min: 0,
        max: 100,
        step: 0.5,
        value: 46,
        format: (x) =>
          stages[
            Math.min(
              5,
              stages.findIndex(
                (s) => x >= s.start && (x < s.end || s.end === 100),
              ),
            )
          ].name,
      },
    ],
    presets: [
      ...stages.map((stage, index) => ({
        label: `${index + 1} ${stage.name}`,
        values: { progress: stage.at },
      })),
      {
        label: "重新采样",
        values: (s) => ({ seed: (s.seed ?? 20261017) + 1 }),
      },
    ],
    content: `<style>
      .actions button{font-size:11px;padding:4px 8px}.actions button[aria-current=step]{border-color:currentColor;background:color-mix(in srgb,currentColor 7%,transparent)}
      .step-info{border-left:2px solid #b47b43;padding-left:12px;margin:18px 0}.step-info strong{font-size:14px}.step-info p{font-size:12px;min-height:3.4em;margin:4px 0}
      .pixel-nodes{display:grid;grid-template-columns:minmax(0,1fr) 48px minmax(0,1fr);align-items:center;gap:8px}.charge-node{border:1px solid #9caea277;padding:14px;border-radius:6px;min-width:0}.charge-node small{display:block;opacity:.65;font-size:10px}.charge-node strong{font-size:20px;font-variant-numeric:tabular-nums}.charge-bar{height:5px;background:#448b9819;margin-top:10px}.charge-bar i{display:block;height:100%;background:#448b98}.gate{text-align:center;font-size:11px;opacity:.55}.gate.on{opacity:1;font-weight:600}.gate.on b{background:#448b9822}.gate b{display:block;border-block:1px solid #9caea277;padding:4px 0;font-weight:inherit}.read-path{display:flex;justify-content:flex-end;align-items:center;gap:9px;font-size:11px;margin:10px 0 16px}.read-path span{border:1px solid #9caea255;padding:3px 8px;border-radius:4px}.read-path .on{border-color:#448b98}.gate-tracks{display:grid;gap:8px;margin:18px 0}.gate-row{display:flex;align-items:center;font-size:11px}.gate-row>span{flex:0 0 11.428571%}.gate-track{flex:1;margin-right:5.238095%;position:relative;height:15px;border-bottom:1px solid #9caea244}.gate-track i{position:absolute;top:0;height:10px;background:#448b9866}.gate-track em{position:absolute;top:-3px;height:18px;border-left:1px solid currentColor}.pixel-chart svg{display:block;width:100%;height:auto;overflow:visible}.pixel-chart text{fill:currentColor;font:12px ui-sans-serif,sans-serif}.pixel-readings{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;border-block:1px solid #9caea244;padding:12px 0;margin:14px 0;font-variant-numeric:tabular-nums}.pixel-readings small{font-size:10px;opacity:.65;display:block}.pixel-readings strong{font-size:15px;font-weight:500;display:block}.noise-heading{margin-top:24px;border-top:1px solid #9caea244;padding-top:14px}.noise-heading h4{margin:0;font-size:14px}.noise-heading p{font-size:11px}.noise-key{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:11px}.noise-key i{display:inline-block;width:16px;margin-right:5px;border-top:2px solid;vertical-align:middle}.pixel-summary{font-size:12px;line-height:1.8}.charge-node .fd-reading{font-size:10px;margin-top:5px}
      @media(max-width:550px){.pixel-readings{grid-template-columns:1fr}.pixel-readings>div{display:flex;justify-content:space-between;align-items:center;gap:10px}.pixel-readings strong{font-size:14px}.charge-node{padding:10px}.charge-node strong{font-size:17px}.pixel-nodes{grid-template-columns:minmax(0,1fr) 35px minmax(0,1fr);gap:5px}.read-path{gap:6px}.step-info p{min-height:5.1em}}
    </style><div class="step-info" aria-live="polite"><strong data-stage></strong><p data-detail></p></div><div data-circuit></div><div class="gate-tracks" data-gates></div><div class="pixel-chart" data-timing></div><div class="pixel-readings" data-readings aria-live="polite"></div><p class="pixel-summary" data-pair></p><div class="noise-heading"><h4>固定电荷，重复读出</h4><p>每次重新生成复位偏移和采样误差；下图共 64 次。单次信号读数以已知 V₀ 为参考，CDS 用本次 Vᴿ 为参考。</p></div><div class="noise-key"><span><i style="border-color:#8b8681"></i>只读信号电平</span><span><i style="border-color:#448b98"></i>CDS 差分</span></div><div class="pixel-chart" data-noise></div><p class="pixel-summary" data-budget></p>`,
    note: "线性 FD、完整电荷转移，源跟随器增益取 1，温度 300 K，电压均折算至 FD。PPD 从已清空状态开始，积分结束的电子数固定；未加入散粒噪声、暗电流、转移损失、饱和或列电路误差。复位噪声 RMS 按 kT/C 模型计算，本轮的 k 在两次采样中完全相同；每个采样另加独立 Gaussian 白噪声。阴影曲线表示尚未执行的步骤，步骤时长不表示真实器件时钟。回放一遍 8 秒，离开视区或切换页面会暂停。",
    update(root, state) {
      const s = pixelState(state),
        stage = stages[s.stage];
      root.querySelector("[data-stage]").textContent =
        `${s.stage + 1} / 6 · ${stage.name}`;
      root.querySelector("[data-detail]").textContent = stage.detail;
      for (const button of root.querySelectorAll(".actions button")) {
        if (button.textContent === `${s.stage + 1} ${stage.name}`)
          button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      }
      const percent = (value) =>
        s.electrons ? (100 * value) / s.electrons : 0;
      root.querySelector("[data-circuit]").innerHTML =
        `<div class="pixel-nodes"><div class="charge-node"><small>PPD · 存放信号电荷</small><strong>${fmt(s.ppdCharge, 0)} e⁻</strong><div class="charge-bar"><i style="width:${percent(s.ppdCharge)}%"></i></div></div><div class="gate ${s.tx ? "on" : ""}"><b>TX</b>${s.tx ? "转移 →" : "关闭"}</div><div class="charge-node"><small>FD · 电荷转为电压</small><strong>${fmt(s.fdCharge, 0)} e⁻</strong><div class="charge-bar"><i style="width:${percent(s.fdCharge)}%"></i></div><div class="fd-reading">${s.fdVoltage === null ? "电压尚未建立参考" : `${s.fdVoltage.toFixed(6)} V`}</div></div></div><div class="read-path"><span class="${s.rst ? "on" : ""}">RST ${s.rst ? "接通复位" : "关闭"}</span><span>SF 缓冲</span>→<span class="${s.sel ? "on" : ""}">SEL ${s.sel ? "接通列线" : "关闭"}</span></div>`;
      root.querySelector("[data-gates]").innerHTML = [
        ["RST", 25, 38],
        ["TX", 50, 65],
        ["SEL", 38, 80],
      ]
        .map(
          ([name, start, end]) =>
            `<div class="gate-row"><span>${name}</span><div class="gate-track"><i style="left:${start}%;width:${end - start}%"></i><em style="left:${s.progress}%"></em></div></div>`,
        )
        .join("");
      root.querySelector("[data-timing]").innerHTML = timing(s);
      root.querySelector("[data-readings]").innerHTML = [
        [
          "参考样本 Vᴿ",
          s.referenceAvailable ? s.reference.toFixed(6) + " V" : "待采样",
        ],
        [
          "信号样本 Vˢ",
          s.signalAvailable ? s.signal.toFixed(6) + " V" : "待采样",
        ],
        [
          "差值 Vᴿ − Vˢ",
          s.differenceAvailable
            ? fmt(s.difference * 1000, 4) + " mV"
            : "待差分",
        ],
      ]
        .map(
          ([name, value]) =>
            `<div><small>${name}</small><strong>${value}</strong></div>`,
        )
        .join("");
      root.querySelector("[data-pair]").textContent =
        `转换增益 ${fmt(s.gain * 1e6, 3)} µV/e⁻；本次共同复位偏移 ${fmt(s.resetOffsetV * 1e6, 1)} µV。${s.differenceAvailable ? `差值折算为 ${fmt(s.estimated, 2)} e⁻，相对固定信号误差 ${fmt(s.estimated - s.electrons, 2)} e⁻。` : "完成两次采样后，再用差值估计电子数。"}`;
      const key = [state.capacitanceFf, state.sampleNoiseUv, state.seed].join(
        ":",
      );
      if (key !== cachedKey) {
        samples = repeatedReads(state);
        cachedKey = key;
        root.querySelector("[data-noise]").innerHTML = noisePlot(samples, s);
      }
      root.querySelector("[data-budget]").textContent =
        `理论读出噪声 RMS：只读信号电平 ${fmt(s.singleE, 2)} e⁻，CDS ${fmt(s.cdsE, 2)} e⁻。CDS 消去了共同复位项，但独立采样噪声从每次的 σᵥ 变为差值的 √2 σᵥ。`;
    },
    setup: (context) => playback({ ...context, element, signal }),
  });
}
