import { experiment, plot, legend } from "../common/ui.js";
import { average } from "./model.js";
import {
  simulateCalibration,
  analyzeCalibration,
  predictCalibration,
} from "./calibration.js";
const fmt = (v, n = 3) => {
  const digits = v !== 0 && Math.abs(v) < 0.01 ? Math.max(6, n) : n;
  return (Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v).toLocaleString("zh-CN", {
    maximumFractionDigits: digits,
  });
};
const rms = (a) => Math.sqrt(average(a.map((v) => v * v)));
function paint(canvas, values, side, limit) {
  canvas.width = canvas.height = side;
  const c = canvas.getContext("2d"),
    image = c.createImageData(side, side);
  for (let i = 0; i < values.length; i++) {
    const t = Math.max(-1, Math.min(1, values[i] / limit)),
      rgb =
        t >= 0
          ? [0.5 + 0.5 * t, 0.5 - 0.18 * t, 0.5 - 0.3 * t]
          : [0.5 + 0.3 * t, 0.5 + 0.05 * t, 0.5 - 0.5 * t];
    image.data.set([...rgb.map((v) => Math.round(255 * v)), 255], i * 4);
  }
  c.putImageData(image, 0, 0);
}

export function mount({ element, signal }) {
  let cachedKey, data;
  return experiment({
    element,
    signal,
    kicker: "平场统计 · 空间相关与共享校准",
    title: "行列噪声与反复使用的平均暗场",
    intro:
      "每帧都重新产生独立像素、行共享和列共享噪声。将若干暗场平均后用于所有目标帧，比较观测方差、生成模型和已知平均暗场的理想校准。",
    controls: [
      {
        key: "signal",
        label: "目标信号均值",
        min: 0,
        max: 1000,
        step: 50,
        value: 200,
        format: (v) => `${v} e⁻`,
      },
      {
        key: "readNoise",
        label: "独立像素读噪 RMS",
        min: 0,
        max: 12,
        step: 1,
        value: 4,
        format: (v) => `${v} e⁻`,
      },
      {
        key: "rowNoise",
        label: "每帧行共享噪声 RMS",
        min: 0,
        max: 16,
        step: 1,
        value: 8,
        format: (v) => `${v} e⁻`,
      },
      {
        key: "columnNoise",
        label: "每帧列共享噪声 RMS",
        min: 0,
        max: 16,
        step: 1,
        value: 6,
        format: (v) => `${v} e⁻`,
      },
      {
        key: "sidePower",
        label: "方形 ROI 边长",
        min: 3,
        max: 5,
        step: 1,
        value: 4,
        format: (v) => `${2 ** v} × ${2 ** v} px`,
      },
      {
        key: "lightPower",
        label: "目标帧平均张数 L",
        min: 0,
        max: 6,
        step: 1,
        value: 2,
        format: (v) => `${2 ** v} 张`,
      },
      {
        key: "darkPower",
        label: "平均暗场的采集张数 M",
        min: 0,
        max: 6,
        step: 1,
        value: 2,
        format: (v) => `${2 ** v} 张`,
      },
    ],
    presets: [
      { label: "只有独立噪声", values: { rowNoise: 0, columnNoise: 0 } },
      { label: "行列相关噪声", values: { rowNoise: 8, columnNoise: 6 } },
      {
        label: "一张暗场反复使用",
        values: { rowNoise: 8, columnNoise: 6, darkPower: 0, lightPower: 6 },
      },
      { label: "增加暗场张数", values: { darkPower: 6 } },
    ],
    content: `<style>
      .actions button,.cal-options button{font-size:11px;padding:4px 8px}.cal-options{display:flex;flex-wrap:wrap;gap:7px;margin:12px 0}.cal-options [aria-pressed=true]{border-color:currentColor;background:#9caea222}.cal-chart{max-width:680px}.cal-chart text{font-size:12px}.cal-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;border-block:1px solid #9caea244;padding:13px 0;margin:18px 0}.cal-summary strong{display:block;font-size:21px;font-weight:500}.cal-summary small{display:block;font-size:10px;opacity:.65}.cal-summary em{display:block;font-size:10px;opacity:.7;font-style:normal}.cal-reading,.cal-status{font-size:12px;font-variant-numeric:tabular-nums}.cal-status{border-left:2px solid #448b98;padding-left:12px}.cal-table{width:100%;border-collapse:collapse;font-size:11px;font-variant-numeric:tabular-nums;margin:18px 0}.cal-table th,.cal-table td{padding:7px 4px;border-bottom:1px solid #9caea233;text-align:right;font-weight:400}.cal-table th:first-child,.cal-table td:first-child{text-align:left}.cal-table th{opacity:.65}.cal-images{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:20px 0}.cal-images figure{margin:0;min-width:0}.cal-images figcaption{font-size:11px;margin-bottom:5px}.cal-images canvas{display:block;width:100%;height:auto;image-rendering:pixelated;border-radius:4px}.cal-images small{font-size:10px;display:block;opacity:.7}.cal-section{font-size:13px;margin:25px 0 8px}.cal-scale{font-size:11px}
      @media(max-width:650px){.cal-summary{grid-template-columns:1fr}.cal-summary>div{display:grid;grid-template-columns:1fr 1fr;gap:3px 8px;align-items:center}.cal-summary strong{text-align:right;font-size:19px}.cal-summary em{grid-column:1/-1}.cal-images{grid-template-columns:1fr}.cal-images figure{max-width:220px}.cal-table{font-size:10px}}
    </style><div class="cal-options" data-options></div><p class="cal-status" data-status aria-live="polite"></p><div class="cal-summary" data-summary></div><div class="chart cal-chart" data-variance></div><div class="legend" data-variance-legend></div><p class="cal-reading" data-covariance></p><p class="cal-reading" data-formula></p><h4 class="cal-section">从观测平场对分解行、列和独立像素分量</h4><table class="cal-table"><thead><tr><th>方差来源</th><th>生成真值 (e⁻)²</th><th>观测估计 (e⁻)²</th></tr></thead><tbody data-components></tbody></table><p class="cal-reading" data-component-note></p><div class="chart cal-chart" data-profiles></div><div class="legend" data-profile-legend></div><p class="cal-reading">此图只显示第一组的中心化行/列均值；它们还含有限像素平均的涨落。灰色虚线保留生成的行/列偏移差，不参与估计。</p><h4 class="cal-section">第一组重复实验：校准后的误差图</h4><div class="cal-images"><figure><figcaption>有限暗场校准后 · 相对真值</figcaption><canvas data-calibrated role="img" aria-label="平均目标帧减平均暗场后，相对真实目标信号的误差"></canvas><small data-calibrated-reading></small></figure><figure><figcaption>已知平均暗场 · 理想对照</figcaption><canvas data-oracle role="img" aria-label="使用真实平均暗图校准后的目标帧误差"></canvas><small data-oracle-reading></small></figure><figure><figcaption>平均暗场误差 · 真值对照</figcaption><canvas data-master role="img" aria-label="采集的平均暗场与已知平均暗图的差"></canvas><small data-master-reading></small></figure></div><p class="cal-scale" data-scale></p>`,
    note: "电子域线性模型，不量化、不剪切。以独立 Gaussian 近似散粒与读出噪声：目标帧的像素独立方差为 μs+μd+σp²，暗帧为 μd+σp²；μd 固定 20 e⁻，同一固定偏置图在光暗帧中共用，RMS 5 e⁻。这不是精确低计数 Poisson 采样，增益页仍保留 Poisson 平场；也不引入 PRNU 或灯光漂移。每帧的行和列偏移独立生成，不在帧内强行去均值；同帧同一行或列的像素共享该偏移，各帧、目标/暗场采集互相独立。64 组独立重复实验，每组重新采集一批暗场；每组内部同一张平均暗场用于全部目标帧。曲线方差与协方差跨这 64 组计算，不是固定一次校准后逐帧的时间方差。方差分量由观测差分 q=(F1−F2)/√2 的双向随机效应分解估计：去行列均值后的平方和除以 (n−1)²，再从行/列均值的样本方差中扣去像素分量/n。保留负估计，不把它们开平方或解释成负的物理噪声。独立观测估计、已知模型预测和真值误差图分别显示；不作真实相机或 EMVA 合格性结论。",
    update(root, s) {
      const parameters = {
          signal: s.signal,
          readNoise: s.readNoise,
          rowNoise: s.rowNoise,
          columnNoise: s.columnNoise,
          side: 2 ** s.sidePower,
          targetSeed: s.targetSeed ?? 32011,
          darkSeed: s.darkSeed ?? 82013,
        },
        key = JSON.stringify(parameters);
      if (key !== cachedKey) {
        data = simulateCalibration(parameters);
        cachedKey = key;
      }
      const domain = s.domain ?? "mean",
        M = 2 ** s.darkPower,
        L = 2 ** s.lightPower,
        n = parameters.side,
        observed = analyzeCalibration(data.observations, {
          darkFrames: M,
          stackFrames: L,
          domain,
        }),
        truth = predictCalibration(data.parameters, {
          darkFrames: M,
          stackFrames: L,
          domain,
        });
      const grid = Array.from({ length: 64 }, (_, i) => i + 1);
      const curves = [
          {
            name: "生成模型 · 含共享暗场",
            color: "#8b8e91",
            dashed: true,
            points: grid.map((count) => [
              count,
              predictCalibration(data.parameters, {
                darkFrames: M,
                stackFrames: count,
                domain,
              }).stack,
            ]),
          },
          {
            name: "把像素全当独立 · 对照",
            color: "#b47b43",
            dashed: true,
            points: grid.map((count) => [
              count,
              predictCalibration(data.parameters, {
                darkFrames: M,
                stackFrames: count,
                domain,
                independentPixels: true,
              }).stack,
            ]),
          },
          {
            name: "已知平均暗场 · 理想校准",
            color: "#58788c",
            points: grid.map((count) => [count, truth.target / count]),
          },
          {
            name: "共享暗场的方差下限",
            color: "#448b98",
            points: [
              [1, truth.floor],
              [64, truth.floor],
            ],
          },
        ],
        maximum =
          1.08 *
          Math.max(
            ...curves.flatMap((c) => c.points.map((p) => p[1])),
            ...observed.curve.map((p) => p.variance),
          );
      const varianceScale = maximum < 0.1 ? 1000 : 1;
      root.querySelector("[data-variance]").innerHTML = plot({
        width: 420,
        leftPadding: 70,
        rightPadding: 26,
        xMin: 0,
        xMax: 64,
        yMax: maximum * varianceScale,
        curves: curves.map((c) => ({
          ...c,
          points: c.points.map(([x, y]) => [x, y * varianceScale]),
        })),
        samples: observed.curve.map((p) => [
          p.count,
          p.variance * varianceScale,
        ]),
        markers: [{ value: L, label: `L = ${L}`, color: "#448b98" }],
        xLabel: "目标帧平均张数 L",
        yLabel: `${domain === "mean" ? "ROI 均值" : "中心像素"}方差 / ${varianceScale === 1000 ? "10⁻³ " : ""}(e⁻)²`,
        title: "固定暗场张数时，目标帧平均的方差与校准下限",
      });
      root.querySelector("[data-variance-legend]").innerHTML = legend([
        ...curves,
        { name: "64 组观测的样本方差", color: "#9b703c" },
      ]);
      root.querySelector("[data-summary]").innerHTML = [
        ["生成模型预测", fmt(truth.stack), "(e⁻)²；包括有限暗场"],
        [
          "观测的校准后方差",
          fmt(observed.current.variance),
          "(e⁻)²；跨 64 组独立实验",
        ],
        ["共享暗场方差下限", fmt(truth.floor), "(e⁻)²；不会随 L 增大而消失"],
      ]
        .map(
          ([name, value, note]) =>
            `<div><small>${name}</small><strong>${value}</strong><em>${note}</em></div>`,
        )
        .join("");
      root.querySelector("[data-status]").textContent =
        `当前观察${domain === "mean" ? `${n} × ${n} ROI 的均值` : `中心像素 (${n / 2}, ${n / 2})`}；每组用 ${M} 张暗场校准 ${L} 张目标帧。改 L 或 M 复用同批采集的前缀平均。${domain === "mean" ? " 行列共享项只能按行数/列数平均，不能按总像素数平均。" : " 单个像素仍包含行列噪声；两条像素独立性对照在此重合。"}`;
      root.querySelector("[data-covariance]").textContent =
        `两张校正目标帧的跨实验协方差：观测 ${fmt(observed.sharedCovariance)} (e⁻)²，生成真值 ${fmt(truth.floor)} (e⁻)²。两帧使用同一平均暗场，差分会抵消该共享误差；PTC 差分因此看不到这项校准方差。有限重复可能使协方差估计偏离真值。`;
      root.querySelector("[data-formula]").textContent =
        domain === "mean"
          ? `生成模型：Var(ROI 均值) = σ独立²/n² + σ行²/n + σ列²/n。目标帧为 ${fmt(truth.target)} (e⁻)²，暗帧为 ${fmt(truth.dark)} (e⁻)²；校准后的平均方差为 V目标/L + V暗/M。`
          : `生成模型：单像素方差为独立、行和列分量之和。目标帧 ${fmt(truth.target)} (e⁻)²，暗帧 ${fmt(truth.dark)} (e⁻)²；校准后的平均方差为 V目标/L + V暗/M。`;
      const componentTruth = {
        independent: s.signal + data.parameters.darkMean + s.readNoise ** 2,
        row: s.rowNoise ** 2,
        column: s.columnNoise ** 2,
      };
      root.querySelector("[data-components]").innerHTML = [
        ["independent", "独立像素（含散粒近似）"],
        ["row", "同帧行共享"],
        ["column", "同帧列共享"],
      ]
        .map(
          ([k, name]) =>
            `<tr><td>${name}</td><td>${fmt(componentTruth[k])}</td><td>${fmt(observed.components[k])}</td></tr>`,
        )
        .join("");
      root.querySelector("[data-component-note]").textContent =
        `估计只读取目标平场对的观测差分；64 对分别计算后取平均。${Object.values(observed.components).some((v) => v < 0) ? " 存在负分量估计：保留有限样本的分解结果，不解释为负的物理方差；此处未给出置信区间。" : " 生成参数只列为真值，不参与方差分解。"}`;
      const p = data.observations[0].decomposition,
        profileCurves = [
          {
            name: "观测行均值",
            color: "#448b98",
            points: [...p.rows].map((v, i) => [i, v]),
          },
          {
            name: "观测列均值",
            color: "#b47b43",
            points: [...p.columns].map((v, i) => [i, v]),
          },
          {
            name: "生成行偏移差 · 对照",
            color: "#8b8e91",
            dashed: true,
            points: [...data.example.rowTruth].map((v, i) => [i, v]),
          },
          {
            name: "生成列偏移差 · 对照",
            color: "#a0a3a6",
            dashed: true,
            points: [...data.example.columnTruth].map((v, i) => [i, v]),
          },
        ],
        extent =
          Math.max(
            1,
            ...profileCurves.flatMap((c) =>
              c.points.map((p) => Math.abs(p[1])),
            ),
          ) * 1.1;
      root.querySelector("[data-profiles]").innerHTML = plot({
        width: 420,
        leftPadding: 64,
        rightPadding: 26,
        curves: profileCurves,
        xMax: n - 1,
        yMin: -extent,
        yMax: extent,
        xLabel: "行号或列号",
        yLabel: "中心化差分均值 / e⁻",
        title: "第一组平场对的行列均值和生成偏移差",
      });
      root.querySelector("[data-profile-legend]").innerHTML =
        legend(profileCurves);
      const first = data.observations[0],
        light = first.targets[L].values,
        dark = first.darks[M].values,
        errors = {
          calibrated: light.map((v, i) => v - dark[i] - s.signal),
          oracle: light.map((v, i) => v - data.darkTruth[i] - s.signal),
          master: dark.map((v, i) => v - data.darkTruth[i]),
        },
        limit =
          3 *
          Math.sqrt(
            predictCalibration(data.parameters, {
              darkFrames: M,
              stackFrames: L,
              domain: "pixel",
            }).stack,
          );
      for (const [name, values] of Object.entries(errors)) {
        paint(root.querySelector(`[data-${name}]`), values, n, limit);
        root.querySelector(`[data-${name}-reading]`).textContent =
          `相对真值 RMS ${fmt(rms(values))} e⁻；ROI 均值 ${fmt(average(values))} e⁻`;
      }
      root.querySelector("[data-scale]").textContent =
        `三图共用 ±${fmt(limit)} e⁻ 色标，蓝色为负、棕色为正；超出色标的误差显示为端点颜色。RMS 未扣去各图均值。理想对照与误差图使用生成真值，真实拍摄中无法直接得到。`;
      for (const b of root.querySelectorAll("[data-domain]"))
        b.setAttribute("aria-pressed", String(b.dataset.domain === domain));
    },
    setup({ root, state, render }) {
      const options = root.querySelector("[data-options]");
      for (const [key, label] of [
        ["mean", "ROI 均值"],
        ["pixel", "中心像素"],
      ]) {
        const b = document.createElement("button");
        b.dataset.domain = key;
        b.textContent = label;
        b.addEventListener(
          "click",
          () => {
            state.domain = key;
            render();
          },
          { signal },
        );
        options.append(b);
      }
      for (const [key, label, seed] of [
        ["targetSeed", "更换目标帧", 32011],
        ["darkSeed", "重拍暗场", 82013],
      ]) {
        const b = document.createElement("button");
        b.textContent = label;
        b.addEventListener(
          "click",
          () => {
            state[key] = (state[key] ?? seed) + 1;
            render();
          },
          { signal },
        );
        options.append(b);
      }
      render();
    },
  });
}
