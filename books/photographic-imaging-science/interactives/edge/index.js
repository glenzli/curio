import { experiment, plot, points, legend } from "../common/ui.js";
import { analyze, gaussianCDF, gaussianMTF, SIZE, RADIUS } from "./model.js";

const format = (x, digits = 3) =>
  (Math.abs(x) < 0.5 * 10 ** -digits ? 0 : x).toLocaleString("zh-CN", {
    maximumFractionDigits: digits,
  });
const stages = [
  "1 边缘拟合",
  "2 像素与投影",
  "3 ESF 分箱",
  "4 LSF 求导",
  "5 频率响应",
];

function drawEdge(canvas, samples, row, result) {
  const context = canvas.getContext("2d"),
    image = context.createImageData(SIZE, SIZE);
  for (let i = 0; i < samples.length; i++) {
    const value = Math.max(0, Math.min(1, 0.1 + 0.8 * samples[i].value));
    const grey = Math.round(255 * value ** (1 / 2.2));
    image.data.set([grey, grey, grey, 255], i * 4);
  }
  context.putImageData(image, 0, 0);
  context.strokeStyle = "#b98447";
  context.lineWidth = 0.7;
  context.strokeRect(0, row, SIZE, 1);
  for (const [geometry, color, dash] of [
    [result.truthGeometry, "#8b8e91", [2, 2]],
    [result.fit.geometry, "#448b98", []],
  ]) {
    if (!geometry) continue;
    context.strokeStyle = color;
    context.setLineDash(dash);
    context.beginPath();
    context.moveTo(geometry.intercept - geometry.slope * geometry.centerY, 0);
    context.lineTo(
      geometry.intercept + geometry.slope * (SIZE - 1 - geometry.centerY),
      SIZE - 1,
    );
    context.stroke();
  }
  context.setLineDash([]);
}

function responseChart(result, state, stage) {
  const range = 2 * RADIUS,
    shifted = (fn) => points(range, (u) => fn(u - RADIUS));
  if (stage <= 1) {
    const curves = [
      {
        name: "已知连续 ESF",
        color: "#8b8e91",
        dashed: true,
        points: shifted((x) => gaussianCDF(x / state.sigma)),
      },
    ];
    if (stage === 1)
      curves.push({
        name: result.esf.missing ? "含插值的 ESF" : "分箱均值",
        color: "#3f8b98",
        dashed: result.esf.missing > 0,
        points: result.esf.filled.map((p) => [p.x + RADIUS, p.value]),
      });
    const samples =
      stage === 0
        ? result.samples
            .filter((p) => p.y === state.row && Math.abs(p.distance) <= RADIUS)
            .map((p) => [p.distance + RADIUS, p.value])
        : result.esf.bins
            .filter((p) => p.count)
            .map((p) => [p.x + RADIUS, p.value]);
    return {
      curves,
      chart: plot({
        width: 420,
        curves,
        samples,
        xMax: range,
        yMin: -0.1,
        yMax: 1.1,
        xLabel: "法向距离 d + 12 / px（12 对应边缘中心）",
        yLabel: "归一化线性信号",
        title:
          stage === 0 ? "选中像素行投影到边缘法向" : "边缘样本分箱得到 ESF",
      }),
    };
  }
  if (stage === 2) {
    const curves = [
      {
        name: "解析 Gaussian LSF",
        color: "#8b8e91",
        dashed: true,
        points: shifted(
          (x) =>
            Math.exp((-x * x) / (2 * state.sigma ** 2)) /
            (Math.sqrt(2 * Math.PI) * state.sigma),
        ),
      },
      {
        name: "中心差分",
        color: "#b98447",
        points: result.lsf.map((p) => [p.x + RADIUS, p.raw]),
      },
    ];
    if (state.window)
      curves.push({
        name: "Hamming 加窗",
        color: "#3f8b98",
        points: result.lsf.map((p) => [p.x + RADIUS, p.value]),
      });
    const values = curves.flatMap((c) => c.points.map((p) => p[1]));
    return {
      curves,
      chart: plot({
        width: 420,
        curves,
        xMax: range,
        yMin: Math.min(0, ...values) * 1.1,
        yMax: Math.max(0.5, ...values) * 1.1,
        xLabel: "法向距离 d + 12 / px",
        yLabel: "LSF / px⁻¹",
        title: "从 ESF 中心差分得到 LSF，以及加窗的影响",
      }),
    };
  }
  const curves = [
    {
      name: "解析预采样 MTF",
      color: "#8b8e91",
      dashed: true,
      points: points(0.5, (f) => gaussianMTF(f, state.sigma)),
    },
    { name: "DFT，未作差分修正", color: "#b98447", points: result.raw },
    {
      name: "已知几何 · 修正后",
      color: "#73858b",
      dashed: true,
      points: result.known?.corrected ?? [],
    },
    {
      name: "拟合几何 · 修正后",
      color: "#3f8b98",
      points: result.fitted?.corrected ?? [],
    },
  ];
  const maximum =
    Math.max(1.1, ...curves.flatMap((c) => c.points.map((p) => p[1]))) * 1.05;
  return {
    curves,
    chart: plot({
      width: 420,
      curves,
      xMax: 0.5,
      yMax: maximum,
      xLabel: "空间频率 / cycles/pixel",
      yLabel: "归一化幅值",
      title: "LSF 的离散 Fourier 幅值及有限差分修正",
    }),
  };
}

function projectionChart(result, state, stage) {
  if (stage === 0) {
    const center = (SIZE - 1) / 2,
      fit = result.fit,
      geometry = fit.candidate;
    const ys = Array.from({ length: SIZE }, (_, y) => y);
    const curves = [
      {
        name: "生成时的直边 · 真值",
        color: "#8b8e91",
        dashed: true,
        points: ys.map((y) => [
          y,
          result.truthGeometry.intercept +
            result.truthGeometry.slope * (y - center) -
            center,
        ]),
      },
    ];
    if (geometry)
      curves.push({
        name: fit.geometry ? "行质心的直线拟合" : "未通过检查的直线候选",
        color: fit.geometry ? "#448b98" : "#b47b43",
        points: ys.map((y) => [
          y,
          geometry.intercept + geometry.slope * (y - center) - center,
        ]),
      });
    const samples = fit.rows.map((p) => [p.y, p.center - center]),
      values = [
        ...curves.flatMap((c) => c.points.map((p) => p[1])),
        ...samples.map((p) => p[1]),
      ];
    const lo = Math.min(...values),
      hi = Math.max(...values),
      pad = Math.max(0.25, (hi - lo) * 0.12);
    return {
      curves,
      chart: plot({
        width: 420,
        curves,
        samples,
        xMax: SIZE - 1,
        yMin: lo - pad,
        yMax: hi + pad,
        xLabel: "像素行 y",
        yLabel: "边缘 x − 31.5 / px",
        title: "逐行梯度质心、直边拟合与已知几何对照",
      }),
    };
  }
  if (!result.active)
    return {
      curves: [],
      chart: `<p class="edge-empty">当前观测不能完成这一步：${result.fit.reason}</p>`,
    };
  return responseChart(result, state, stage - 1);
}

export function mount({ element, signal, session }) {
  let cachedKey, result;
  return experiment({
    element,
    signal,
    session,
    kicker: "系统测试 · 从样本拟合边缘",
    title: "拟合边缘，再计算 ESF、LSF 与 MTF",
    intro:
      "棕点是逐行估计的边缘位置，青线是直线拟合，灰虚线保留生成时的真值。随后分别按拟合几何与已知几何投影，比较两条测量路径和解析 MTF。",
    controls: [
      {
        key: "sigma",
        label: "生成系统的 Gaussian 模糊 σ",
        min: 0.4,
        max: 2,
        step: 0.05,
        value: 0.85,
        format: (x) => `${format(x, 2)} px`,
      },
      {
        key: "angle",
        label: "生成边缘偏离竖直的角度",
        min: 0,
        max: 12,
        step: 0.5,
        value: 5,
        format: (x) => `${x}°`,
      },
      {
        key: "phase",
        label: "生成边缘的法向中心偏移",
        min: -0.45,
        max: 0.45,
        step: 0.05,
        value: 0.2,
        format: (x) => `${format(x, 2)} px`,
      },
      {
        key: "contrast",
        label: "线性样本的两侧平台差",
        min: 0,
        max: 1,
        step: 0.05,
        value: 1,
        format: (x) => format(x, 2),
      },
      {
        key: "factor",
        label: "ESF 分箱宽度",
        min: 1,
        max: 4,
        step: 1,
        value: 4,
        format: (x) => `1/${x} px`,
        options: [
          { value: 1, label: "1 px" },
          { value: 2, label: "1/2 px" },
          { value: 3, label: "1/3 px" },
          { value: 4, label: "1/4 px" },
        ],
      },
      {
        key: "noise",
        label: "归一化样本噪声 RMS",
        min: 0,
        max: 0.03,
        step: 0.0025,
        value: 0,
        format: (x) => `${format(x * 100, 2)}%`,
        numeric: { toInput: (v) => 100 * v, fromInput: (v) => v / 100, step: "any", unit: "%" },
      },
      {
        key: "row",
        label: "查看像素行",
        hint: "只改变选中行及其投影样本；MTF仍用全部有效行计算。",
        min: 0,
        max: SIZE - 1,
        step: 1,
        value: 32,
        format: (x) => `${x} / ${SIZE - 1}`,
        discrete: true, numeric: { step: 1, unit: "行" },
      },
    ],
    presets: [
      {
        label: "书中 σ = 0.85 px",
        values: {
          sigma: 0.85,
          angle: 5,
          phase: 0.2,
          contrast: 1,
          factor: 4,
          noise: 0,
          window: false,
          stage: 0,
          geometry: "fitted",
        },
      },
      {
        label: "竖直边缘与缺箱",
        values: { angle: 0, contrast: 1, noise: 0, factor: 4, stage: 2 },
      },
      {
        label: "加入噪声",
        values: { angle: 5, contrast: 1, noise: 0.02, stage: 0 },
      },
      {
        label: "低对比与噪声",
        values: { contrast: 0.1, noise: 0.03, stage: 0, geometry: "fitted" },
      },
    ],
    content: `<style>
      .actions button,.edge-steps button,.edge-options button{font-size:11px;padding:4px 8px}.edge-steps,.edge-options{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}.edge-steps [aria-pressed=true],.edge-options [aria-pressed=true]{background:#9caea222;border-color:currentColor}.edge-observation{display:grid;grid-template-columns:150px minmax(0,1fr);gap:20px;align-items:center;margin:20px 0}.edge-observation figure{margin:0;min-width:0}.edge-observation canvas{width:100%;height:auto;image-rendering:pixelated;border-radius:3px}.edge-observation figcaption{font-size:10px;opacity:.7}.edge-chart text{font-size:12px}.edge-summary{font-size:12px;font-variant-numeric:tabular-nums}.edge-fit-status{font-size:11px;border-left:2px solid #448b98;padding-left:10px}.edge-fit-status[data-failed=true]{border-color:#b47b43}.bin-counts{height:34px;display:flex;align-items:end;gap:1px;margin:8px 0}.bin-counts i{flex:1;min-width:0;background:#3f8b98aa}.bin-counts i.missing{background:#b98447}.edge-warning,.edge-result{font-size:11px;font-variant-numeric:tabular-nums}.edge-empty{padding:24px 12px;border:1px dashed #9caea277;font-size:12px}.edge-compare{display:grid;grid-template-columns:1fr 1fr;gap:12px;border-block:1px solid #9caea244;padding:12px 0;margin:18px 0}.edge-compare small{display:block;font-size:10px;opacity:.65}.edge-compare strong{display:block;font-size:19px;font-weight:500}.stats strong{font-size:20px}
      @media(max-width:650px){.edge-observation{grid-template-columns:1fr;gap:12px}.edge-observation figure{max-width:180px}.stats{grid-template-columns:1fr}.stats>div{display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px 12px}.stats em{width:100%}.stats strong{font-size:16px}.edge-compare strong{font-size:17px}}
    </style><div class="edge-steps" data-steps role="group" aria-label="分析步骤"></div><div class="edge-observation"><figure><canvas width="64" height="64" data-edge role="img" aria-label="合成斜边、已知直边及拟合直边"></canvas><figcaption>64 × 64 线性样本；棕线是选中行，灰虚线是真值，青线是拟合。固定 Gamma 2.2 仅用于像素图显示。</figcaption></figure><div><p class="edge-summary" data-geometry-summary></p><p class="edge-fit-status" data-fit-status aria-live="polite"></p></div></div><div class="chart edge-chart" data-chart></div><div class="legend" data-legend></div><p class="reading" data-step-reading></p><div class="edge-options" data-options></div><p class="reading">当前投影各箱的样本数：棕色为空箱。两种几何使用相同观测、平台归一化与全部 64 行。</p><div class="bin-counts" data-counts role="img" aria-label="当前几何下的 ESF 分箱覆盖"></div><div class="stats"><div><small>生成系统的解析 MTF50</small><strong data-analytic></strong><em>cycles/pixel</em></div><div><small>当前路径的测量 MTF50</small><strong data-estimate></strong><em>存在空箱或拟合失败时不报告</em></div><div><small>当前分箱覆盖</small><strong data-coverage></strong><em>有样本的箱 / 全部箱</em></div></div><div class="edge-compare" data-compare></div><p class="edge-warning" data-warning aria-live="polite"></p><p class="edge-result" data-result></p>`,
    note: "教学输入为连续 Gaussian ESF 的像素中心样本，σ 表示整个有效线性系统的模糊量，不另乘像素孔径响应。拟合器只读取 x、y 与样本值：从图像左右各 1/8 宽度估计平台与噪声，逐行三点平滑，在半高粗定位附近取 15 段差分的质心，再用普通最小二乘拟合直边。平台差小于 0.01 或小于平台噪声 RMS 的 5 倍、可用行不足一半、或行质心残差 RMS 超过 0.75 px 时不采用拟合。这些是教学条件，残差 RMS 不是角度或位置的置信区间。拟合几何与真值几何使用相同观测平台归一化；真值只作对照，不参与拟合。ESF 在 ±12 px 内分箱，空箱仅插值示意，有空箱便不报告 MTF50。LSF 用中心差分，可选 Hamming 窗；DFT 四倍补零，以非零直流幅值归一化，差分响应绝对值低于 0.2 时不反除。仅在原像素 Nyquist 0.5 cycles/pixel 内找首次向下穿越 0.5 的交点。此处不解码真实 RAW，也不构成完整 ISO 12233 测量。",
    update(root, state) {
      const key = JSON.stringify([
        state.sigma,
        state.angle,
        state.phase,
        state.contrast,
        state.factor,
        state.noise,
        !!state.window,
        state.seed ?? 1,
        state.geometry ?? "fitted",
      ]);
      if (cachedKey !== key) {
        result = analyze({ ...state, seed: state.seed ?? 1 });
        cachedKey = key;
      }
      const stage = state.stage ?? 0,
        drawing = projectionChart(result, state, stage),
        fit = result.fit;
      drawEdge(
        root.querySelector("[data-edge]"),
        result.observations,
        state.row,
        result,
      );
      root.querySelector("[data-chart]").innerHTML = drawing.chart;
      root.querySelector("[data-legend]").innerHTML = legend(drawing.curves);
      root.querySelector("[data-geometry-summary]").textContent =
        `生成真值：角度 ${format(state.angle)}°，法向中心偏移 ${format(state.phase)} px。${fit.geometry ? `观测拟合：${format(fit.geometry.angle)}°，${format(fit.geometry.phase)} px。` : "当前没有可采用的拟合几何。"}`;
      const status = root.querySelector("[data-fit-status]");
      status.dataset.failed = String(!fit.geometry);
      status.textContent = fit.geometry
        ? `${fit.rows.length} 行参与拟合；行质心残差 RMS ${format(fit.residualRms, 4)} px。估计平台差 ${format(fit.levels.contrast, 4)}，平台噪声 RMS ${format(fit.levels.noise, 4)}。`
        : fit.reason;
      const descriptions = [
        "逐行从灰度差分求质心，再拟合一条直线；生成时的角度和中心位置只用于灰线与数值对照。",
        `这里只画第 ${state.row} 行的投影样本。改变行号可比较各行提供的亚像素采样位置。`,
        `箱宽 ${format(result.h)} px，按当前几何对原始样本分箱取均值；空箱连线仅作示意。`,
        "中心差分除以 2 倍箱宽。求导放大高频噪声；Hamming 窗压低远端，也会改变测量响应。",
        "灰线是生成系统的解析 MTF，灰青虚线按已知几何计算，青线按拟合几何计算；棕线保留当前路径未作差分修正的 DFT 幅值。",
      ];
      root.querySelector("[data-step-reading]").textContent =
        descriptions[stage];
      const maximum = Math.max(1, ...result.esf.bins.map((b) => b.count));
      root.querySelector("[data-counts]").innerHTML = result.esf.bins
        .map(
          (b) =>
            `<i class="${b.count ? "" : "missing"}" style="height:${b.count ? 6 + (28 * b.count) / maximum : 6}px" title="d=${format(b.x)} px，${b.count} 个样本"></i>`,
        )
        .join("");
      const measured = (path) =>
        path?.estimated50 === null || !path
          ? "不可用"
          : format(path.estimated50, 4);
      root.querySelector("[data-analytic]").textContent = format(
        result.analytic50,
        4,
      );
      root.querySelector("[data-estimate]").textContent = measured(
        result.active,
      );
      root.querySelector("[data-coverage]").textContent = result.active
        ? `${result.esf.bins.length - result.esf.missing} / ${result.esf.bins.length}`
        : "未分箱";
      root.querySelector("[data-compare]").innerHTML = [
        ["按已知几何测量", result.known],
        ["按拟合几何测量", result.fitted],
      ]
        .map(
          ([name, path]) =>
            `<div><small>${name} · cycles/pixel</small><strong>${measured(path)}</strong></div>`,
        )
        .join("");
      root.querySelector("[data-warning]").textContent = !result.active
        ? "当前路径停止计算；知道生成系统的模糊量，并不能从无效观测中得到一次边缘测量。"
        : result.esf.missing
          ? `有 ${result.esf.missing} 个空箱；后续曲线包含插值，不报告 MTF50。`
          : "分箱覆盖完整。两条测量路径仍受有限采样、求导、窗口及噪声影响。";
      root.querySelector("[data-result]").textContent =
        `当前投影：${state.geometry === "known" ? "已知几何，仅作对照" : "观测拟合几何"}。${result.estimated50 !== null ? `相对解析模型的 MTF50 差为 ${format(result.estimated50 - result.analytic50, 4)} cycles/pixel。` : "当前没有可报告的 MTF50 交点。"}`;
      for (const button of root.querySelectorAll("[data-stage]"))
        button.setAttribute(
          "aria-pressed",
          String(Number(button.dataset.stage) === stage),
        );
      for (const button of root.querySelectorAll("[data-geometry]"))
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.geometry === (state.geometry ?? "fitted")),
        );
      const window = root.querySelector("[data-window]");
      if (window) {
        window.textContent = `Hamming 窗：${state.window ? "开" : "关"}`;
        window.setAttribute("aria-pressed", String(!!state.window));
      }
    },
    setup({ root, state, render }) {
      for (const [index, label] of stages.entries()) {
        const button = document.createElement("button");
        button.dataset.stage = index;
        button.textContent = label;
        button.addEventListener(
          "click",
          () => {
            state.stage = index;
            render();
          },
          { signal },
        );
        root.querySelector("[data-steps]").append(button);
      }
      for (const [key, label] of [
        ["fitted", "使用拟合几何"],
        ["known", "使用已知几何"],
      ]) {
        const button = document.createElement("button");
        button.dataset.geometry = key;
        button.textContent = label;
        button.addEventListener(
          "click",
          () => {
            state.geometry = key;
            render();
          },
          { signal },
        );
        root.querySelector("[data-options]").append(button);
      }
      const window = document.createElement("button");
      window.dataset.window = "";
      window.addEventListener(
        "click",
        () => {
          state.window = !state.window;
          render();
        },
        { signal },
      );
      root.querySelector("[data-options]").append(window);
      const resample = document.createElement("button");
      resample.textContent = "重新采样";
      resample.addEventListener(
        "click",
        () => {
          state.seed = (state.seed ?? 1) + 1;
          render();
        },
        { signal },
      );
      root.querySelector("[data-options]").append(resample);
      render();
    },
  });
}
