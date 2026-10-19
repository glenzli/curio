import { experiment, plot, legend } from "../common/ui.js";
import {
  BLACK,
  FULL_WELL,
  LEVELS,
  simulate,
  fitTransfer,
  expectedVariance,
} from "./model.js";

const fmt = (value, digits = 2) =>
  (Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value).toLocaleString("zh-CN", {
    maximumFractionDigits: digits,
  });
const error = (estimate, truth) =>
  estimate === null ? "不可用" : `${fmt(100 * (estimate / truth - 1), 2)}%`;
function draw(canvas, values, side, transform) {
  canvas.width = side;
  canvas.height = side;
  const context = canvas.getContext("2d"),
    image = context.createImageData(side, side);
  for (let i = 0; i < values.length; i++) {
    const value = Math.max(0, Math.min(1, transform(values[i]))),
      grey = Math.round(255 * value ** (1 / 2.2));
    image.data.set([grey, grey, grey, 255], 4 * i);
  }
  context.putImageData(image, 0, 0);
}

function transferChart(data, fit, method, state) {
  const max = data.white - BLACK,
    selected = fit[method],
    truth = data.truth;
  const theory = Array.from({ length: 201 }, (_, i) => {
    const x = (max * i) / 200;
    return [x, expectedVariance(x, truth, method)];
  });
  const curves = [
    {
      name:
        method === "temporal"
          ? "无漂移的线性模型 · 对照"
          : "PRNU 空间方差模型 · 对照",
      color: "#8b8e91",
      dashed: true,
      points:
        method === "temporal"
          ? theory.map(([x]) => [
              x,
              truth.gain * x + truth.readVariance + 1 / 12,
            ])
          : theory,
    },
  ];
  if (method === "temporal" && truth.drift && truth.prnu)
    curves.push({
      name: "含设定漂移的未饱和预测",
      color: "#b47b43",
      points: theory,
    });
  if (selected)
    curves.push({
      name: "观测数据的直线拟合",
      color: method === "temporal" ? "#448b98" : "#b47b43",
      points: [
        [0, selected.intercept],
        [max, selected.intercept + selected.slope * max],
      ],
    });
  const samples = data.measurements.map((p) => [p.mean, p[method]]),
    values = [
      ...samples.map((p) => p[1]),
      ...curves.flatMap((c) => c.points.map((p) => p[1])),
    ];
  const minimum = Math.min(0, ...values) * 1.05,
    maximum = Math.max(1, ...values) * 1.07;
  return {
    curves,
    chart: plot({
      width: 420,
      leftPadding: 82,
      rightPadding: 34,
      curves,
      samples,
      xMax: max * 1.04,
      yMin: minimum,
      yMax: maximum,
      markers: [
        {
          value: data.measurements[state.level].mean,
          label: `第 ${state.level} 级`,
          color: "#b47b43",
        },
      ],
      xLabel: "已扣黑电平的均值 / DN",
      yLabel:
        method === "temporal" ? "成对差分方差 ÷ 2 / DN²" : "单帧空间方差 / DN²",
      title:
        method === "temporal"
          ? "成对平场的均值—时间方差与增益拟合"
          : "单帧空间方差受固定响应差异的影响",
    }),
  };
}

export function mount({ element, signal, session }) {
  let cachedKey, data;
  return experiment({
    element,
    signal,
    session,
    kicker: "平场统计 · 均值与方差",
    title: "从成对平场估计系统增益",
    intro:
      "每个信号级采集多对独立平场。两图共用这批观测：左图用差分估计时间方差，右图直接求单帧空间方差；输入增益只用于生成与真值对照。",
    controls: [
      {
        key: "gain",
        label: "生成模型的系统增益",
        min: 0.05,
        max: 1,
        step: 0.05,
        value: 0.2,
        format: (x) => `${fmt(x, 2)} DN/e⁻`,
      },
      {
        key: "readNoise",
        label: "生成模型的读噪 RMS",
        min: 2,
        max: 20,
        step: 1,
        value: 10,
        format: (x) => `${x} e⁻`,
      },
      {
        key: "prnuPercent",
        label: "固定像素响应差异 PRNU",
        min: 0,
        max: 5,
        step: 0.25,
        value: 2,
        format: (x) => `${fmt(x, 2)}%`,
      },
      {
        key: "driftPercent",
        label: "两帧照明差 / 两帧平均照明",
        min: 0,
        max: 20,
        step: 1,
        value: 0,
        format: (x) => `${x}%`,
      },
      {
        key: "side",
        label: "方形 ROI 边长",
        min: 16,
        max: 64,
        step: 16,
        value: 32,
        format: (x) => `${x} × ${x} px`,
      },
      {
        key: "pairs",
        label: "每级平场对数",
        min: 1,
        max: 8,
        step: 1,
        value: 4,
        format: (x) => `${x} 对`,
      },
      {
        key: "fitPercent",
        label: "拟合均值上限 / 数字白点跨度",
        min: 30,
        max: 105,
        step: 5,
        value: 75,
        format: (x) => `${x}%`,
      },
      {
        key: "level",
        label: "查看采样级",
        min: 0,
        max: LEVELS - 1,
        step: 1,
        value: 8,
        format: (x) => (x === 0 ? "0 · 暗场" : `${x} / ${LEVELS - 1}`),
      },
    ],
    presets: [
      {
        label: "均匀像素",
        values: {
          prnuPercent: 0,
          driftPercent: 0,
          fitPercent: 75,
          excludeClipped: true,
        },
      },
      {
        label: "固定响应差异",
        values: {
          prnuPercent: 2,
          driftPercent: 0,
          fitPercent: 75,
          excludeClipped: true,
        },
      },
      {
        label: "照明漂移",
        values: {
          prnuPercent: 2,
          driftPercent: 20,
          fitPercent: 75,
          excludeClipped: true,
        },
      },
      {
        label: "把饱和段纳入拟合",
        values: {
          prnuPercent: 0,
          driftPercent: 0,
          fitPercent: 105,
          excludeClipped: false,
        },
      },
      {
        label: "重新采样",
        values: (s) => ({ seed: (s.seed ?? 20261018) + 1 }),
      },
    ],
    content: `<style>
      .actions button,.flat-options button{font-size:11px;padding:4px 8px}.flat-options{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}.flat-options [aria-pressed=true]{background:#9caea222;border-color:currentColor}.flat-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;border-block:1px solid #9caea244;padding:14px 0;margin:18px 0}.flat-summary small{font-size:10px;display:block;opacity:.65}.flat-summary strong{font-size:21px;display:block;font-weight:500;font-variant-numeric:tabular-nums}.flat-summary em{font-size:10px;display:block;font-style:normal;opacity:.7}.flat-charts{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:18px 0}.flat-charts>div{min-width:0}.flat-charts .chart{margin:0}.flat-charts text{font-size:13px}.flat-charts .legend{font-size:10px}.flat-images{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:20px 0}.flat-images figure{margin:0;min-width:0}.flat-images figcaption{font-size:11px;margin-bottom:6px}.flat-images canvas{display:block;width:100%;height:auto;image-rendering:pixelated;border-radius:4px}.flat-images small{font-size:10px;display:block;opacity:.65}.flat-reading,.flat-status{font-size:12px;font-variant-numeric:tabular-nums}.flat-status{border-left:2px solid #448b98;padding-left:12px}.flat-status[data-warning=true]{border-color:#b47b43}.flat-table{width:100%;border-collapse:collapse;font-size:10px;font-variant-numeric:tabular-nums;margin:10px 0}.flat-table th,.flat-table td{padding:6px 3px;border-bottom:1px solid #9caea233;text-align:right;font-weight:400}.flat-table th:first-child,.flat-table td:first-child{text-align:left}.flat-table tr[data-current=true]{background:#9caea218}.flat-table th{opacity:.65}.flat-details{margin:18px 0;font-size:11px}.flat-details summary{cursor:pointer}.flat-caption{font-size:11px}
      @media(max-width:650px){.flat-charts{grid-template-columns:1fr;gap:22px}.flat-summary{grid-template-columns:1fr}.flat-summary>div{display:grid;grid-template-columns:1fr 1fr;gap:3px 10px;align-items:center}.flat-summary strong{text-align:right;font-size:19px}.flat-summary em{grid-column:1/-1}.flat-images{grid-template-columns:1fr}.flat-images figure{max-width:200px}.flat-table{font-size:9px}.flat-table th,.flat-table td{padding:6px 2px}}
    </style><div class="flat-options" data-options></div><div class="flat-summary" data-summary></div><p class="flat-status" data-status aria-live="polite"></p><div class="flat-charts"><div><div class="chart" data-temporal></div><div class="legend" data-temporal-legend></div></div><div><div class="chart" data-spatial></div><div class="legend" data-spatial-legend></div></div></div><p class="flat-caption">棕点为全部观测级，竖线标出当前查看的级；拟合只使用下表中标为“参与”的级。两图纵轴分别定标。对照曲线是未饱和模型，不用于拟合，也不描述剪切后的分布。</p><p class="flat-reading" data-reading></p><div class="flat-images"><figure><figcaption>第一个平场 · DN</figcaption><canvas data-first role="img" aria-label="当前信号级第一对平场的第一帧"></canvas><small>两帧共用黑电平与数字白点</small></figure><figure><figcaption>第二个平场 · DN</figcaption><canvas data-second role="img" aria-label="当前信号级第一对平场的第二帧"></canvas><small>同一固定响应图样，独立采样噪声</small></figure><figure><figcaption>中心化差分 · 显示伸展</figcaption><canvas data-difference role="img" aria-label="两帧之差扣去 ROI 均值后的伸展显示"></canvas><small>按当前差分 RMS 的 ±3 倍伸展，不表示绝对噪声大小</small></figure></div><p class="flat-reading" data-noise></p><details class="flat-details"><summary>采样级、方差与拟合范围</summary><table class="flat-table"><thead><tr><th>级</th><th>均值 DN</th><th>单帧 DN²</th><th>差分/2 DN²</th><th>拟合</th></tr></thead><tbody data-levels></tbody></table></details>`,
    note: `固定曝光时长，改变均匀照明；第 0 级为暗场，其余级直到线性满阱 ${FULL_WELL} e⁻ 的 1.25 倍。黑电平 ${BLACK} DN 假定已准确标定，数字白点由读出模式给定。每个像素的固定响应在采集期间保持不变，ROI 内响应差异按样本均值 0、样本方差等于设定 PRNU² 生成；两帧照明围绕同一均值对称变化。计数服从 Poisson 分布，读噪独立 Gaussian；电荷先在满阱剪切，再加入读噪、量化到整数 DN 并限制到数字白点。差分方差先减去差分 ROI 均值，再用 N−1 分母，最后除以 2；多对结果取平均。增益拟合只读取观测均值、方差及白点，以 3% 到指定均值上限的级做普通最小二乘；默认排除至少 0.1% 像素达到白点前 2 DN 的级。这是教学筛选，不是线性满阱的测量判据。暗场读噪估计使用拟合增益，并近似扣除 1/12 DN² 量化方差；不满足均匀独立量化近似时仅供比较，方差不足便不报告。没有暗电流、行列相关、有限暗场标定误差或真实 RAW 输入；这里不作 EMVA 合格性声明。`,
    update(root, state) {
      const parameters = {
        gain: state.gain,
        readNoise: state.readNoise,
        prnu: state.prnuPercent / 100,
        drift: state.driftPercent / 100,
        side: state.side,
        pairs: state.pairs,
        seed: state.seed ?? 20261018,
      };
      const key = JSON.stringify(parameters);
      if (key !== cachedKey) {
        data = simulate(parameters);
        cachedKey = key;
      }
      const fit = fitTransfer(data.measurements, {
        white: data.white,
        fitMax: state.fitPercent / 100,
        excludeClipped: state.excludeClipped !== false,
      });
      const point = data.measurements[state.level],
        temporal = transferChart(data, fit, "temporal", state),
        spatial = transferChart(data, fit, "spatial", state);
      root.querySelector("[data-temporal]").innerHTML = temporal.chart;
      root.querySelector("[data-spatial]").innerHTML = spatial.chart;
      root.querySelector("[data-temporal-legend]").innerHTML = legend(
        temporal.curves,
      );
      root.querySelector("[data-spatial-legend]").innerHTML = legend(
        spatial.curves,
      );
      root.querySelector("[data-summary]").innerHTML = [
        ["生成增益 · 真值", fmt(data.truth.gain, 4), "DN/e⁻，不参与拟合"],
        [
          "成对差分的拟合斜率",
          fit.temporal ? fmt(fit.temporal.slope, 4) : "不可用",
          `DN/e⁻；相对真值 ${error(fit.temporal?.slope ?? null, data.truth.gain)}`,
        ],
        [
          "单帧空间方差的拟合斜率",
          fit.spatial ? fmt(fit.spatial.slope, 4) : "不可用",
          `DN/e⁻；相对真值 ${error(fit.spatial?.slope ?? null, data.truth.gain)}`,
        ],
      ]
        .map(
          ([name, value, note]) =>
            `<div><small>${name}</small><strong>${value}</strong><em>${note}</em></div>`,
        )
        .join("");
      const warning =
        !!state.driftPercent ||
        state.excludeClipped === false ||
        !fit.temporal ||
        fit.temporal.intercept < 0 ||
        fit.temporal.slope <= 0;
      const status = root.querySelector("[data-status]");
      status.dataset.warning = String(warning);
      status.textContent = `${state.side ** 2} 个 ROI 像素，每级 ${state.pairs} 对平场；${fit.selected.length} / ${LEVELS} 级参与拟合。${state.driftPercent ? "两帧照明不同，稳定 PRNU 仍会在中心化差分中留下结构，时间方差估计不再只含随机噪声。" : state.prnuPercent ? "固定响应差异使单帧空间方差随均值弯曲；稳定照明下，成对差分可消去共同图样。" : "当前像素响应一致，比较两种方差估计的有限样本波动。"}${state.excludeClipped === false ? " 已允许饱和级进入拟合；高端方差回落会改变斜率。" : ""}${fit.temporal && fit.temporal.intercept < 0 ? " 拟合截距为负，不能把它开平方解释成读噪。" : ""}`;
      root.querySelector("[data-reading]").textContent =
        `第 ${state.level} 级：均值 ${fmt(point.mean, 3)} DN，单帧空间方差 ${fmt(point.spatial, 3)} DN²，成对差分方差/2 ${fmt(point.temporal, 3)} DN²。${fit.selected.includes(state.level) ? "参与拟合。" : "不参与拟合。"} 白点邻域像素 ${fmt(point.clipped * 100, 2)}%；第一对差分的 ROI 均值 ${fmt(point.display.differenceMean, 3)} DN。`;
      for (const [name, values] of [
        ["first", point.display.first],
        ["second", point.display.second],
      ])
        draw(
          root.querySelector(`[data-${name}]`),
          values,
          state.side,
          (value) => (value - BLACK) / (data.white - BLACK),
        );
      const difference = point.display.difference,
        mean = point.display.differenceMean;
      const rms = Math.sqrt(
        difference.reduce((s, v) => s + (v - mean) ** 2, 0) /
          (difference.length - 1),
      );
      draw(
        root.querySelector("[data-difference]"),
        difference,
        state.side,
        (value) => 0.5 + (value - mean) / (6 * Math.max(rms, 1e-12)),
      );
      root.querySelector("[data-noise]").textContent =
        `暗场成对方差 ${fmt(data.measurements[0].temporal, 4)} DN²；读噪估计 ${fit.readNoise !== null ? fmt(fit.readNoise, 3) + " e⁻" : "不可用（增益或量化扣除条件不足）"}，生成真值 ${state.readNoise} e⁻。${fit.temporal ? `直线截距 ${fmt(fit.temporal.intercept, 4)} DN²。` : ""} 调整查看级或拟合范围会复用同一批图像；“重新采样”保留固定响应图样，只更换计数与读出噪声。`;
      root.querySelector("[data-levels]").innerHTML = data.measurements
        .map(
          (p) =>
            `<tr data-current="${p.level === state.level}"><td>${p.level}</td><td>${fmt(p.mean, 1)}</td><td>${fmt(p.spatial, 1)}</td><td>${fmt(p.temporal, 1)}</td><td>${fit.selected.includes(p.level) ? "参与" : "排除"}</td></tr>`,
        )
        .join("");
      const button = root.querySelector("[data-exclude]");
      if (button) {
        const enabled = state.excludeClipped !== false;
        button.textContent = `排除饱和级：${enabled ? "开" : "关"}`;
        button.setAttribute("aria-pressed", String(enabled));
      }
    },
    setup({ root, state, render }) {
      const button = document.createElement("button");
      button.dataset.exclude = "";
      button.addEventListener(
        "click",
        () => {
          state.excludeClipped = state.excludeClipped === false;
          render();
        },
        { signal },
      );
      root.querySelector("[data-options]").append(button);
      render();
    },
  });
}
