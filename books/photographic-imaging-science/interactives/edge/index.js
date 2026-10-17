import { experiment, plot, points, legend } from "../common/ui.js";
import { analyze, gaussianCDF, gaussianMTF, SIZE, RADIUS } from "./model.js";

const format = (x, digits = 3) => x.toLocaleString("zh-CN", { maximumFractionDigits: digits });
const stages = ["1 像素与投影", "2 ESF 分箱", "3 LSF 求导", "4 频率响应"];

function drawEdge(canvas, samples, row) {
  const context = canvas.getContext("2d"), image = context.createImageData(SIZE, SIZE);
  for (let i = 0; i < samples.length; i++) {
    const value = Math.max(0, Math.min(1, .1 + .8 * samples[i].value));
    const grey = Math.round(255 * value ** (1 / 2.2));
    image.data.set([grey, grey, grey, 255], i * 4);
  }
  context.putImageData(image, 0, 0);
  context.strokeStyle = "#b98447"; context.lineWidth = .7;
  context.strokeRect(0, row, SIZE, 1);
}

function projectionChart(result, state, stage) {
  const range = 2 * RADIUS, shifted = fn => points(range, u => fn(u - RADIUS));
  if (stage <= 1) {
    const curves = [{ name: "已知连续 ESF", color: "#8b8e91", dashed: true,
      points: shifted(x => gaussianCDF(x / state.sigma)) }];
    if (stage === 1) curves.push({ name: result.esf.missing ? "含插值的 ESF" : "分箱均值", color: "#3f8b98", dashed: result.esf.missing > 0,
      points: result.esf.filled.map(p => [p.x + RADIUS, p.value]) });
    const samples = stage === 0 ? result.samples.filter(p => p.y === state.row && Math.abs(p.distance) <= RADIUS).map(p => [p.distance + RADIUS, p.value]) :
      result.esf.bins.filter(p => p.count).map(p => [p.x + RADIUS, p.value]);
    return { curves, chart: plot({ curves, samples, xMax: range, yMin: -.1, yMax: 1.1,
      xLabel: "法向距离 d + 12 / px（12 对应边缘中心）", yLabel: "归一化线性信号", title: stage === 0 ? "选中像素行投影到边缘法向" : "边缘样本分箱得到 ESF" }) };
  }
  if (stage === 2) {
    const curves = [
      { name: "解析 Gaussian LSF", color: "#8b8e91", dashed: true, points: shifted(x => Math.exp(-x * x / (2 * state.sigma ** 2)) / (Math.sqrt(2 * Math.PI) * state.sigma)) },
      { name: "中心差分", color: "#b98447", points: result.lsf.map(p => [p.x + RADIUS, p.raw]) },
    ];
    if (state.window) curves.push({ name: "Hamming 加窗", color: "#3f8b98", points: result.lsf.map(p => [p.x + RADIUS, p.value]) });
    const values = curves.flatMap(c => c.points.map(p => p[1]));
    return { curves, chart: plot({ curves, xMax: range, yMin: Math.min(0, ...values) * 1.1, yMax: Math.max(.5, ...values) * 1.1,
      xLabel: "法向距离 d + 12 / px", yLabel: "LSF / px⁻¹", title: "从 ESF 中心差分得到 LSF，以及加窗的影响" }) };
  }
  const curves = [
    { name: "解析预采样 MTF", color: "#8b8e91", dashed: true, points: points(.5, f => gaussianMTF(f, state.sigma)) },
    { name: "DFT，未作差分修正", color: "#b98447", points: result.raw },
    { name: "有限差分修正后", color: "#3f8b98", points: result.corrected },
  ];
  const maximum = Math.max(1.1, ...curves.flatMap(c => c.points.map(p => p[1]))) * 1.05;
  return { curves, chart: plot({ curves, xMax: .5, yMax: maximum, xLabel: "空间频率 / cycles/pixel", yLabel: "归一化幅值", title: "LSF 的离散 Fourier 幅值及有限差分修正" }) };
}

export function mount({ element, signal }) {
  let cachedKey, result;
  return experiment({
    element, signal, kicker: "系统测试 · 斜边分析", title: "从像素样本计算 MTF",
    intro: "左侧是已知模糊量的合成斜边。依次查看法向投影、ESF 分箱、LSF 求导和 Fourier 幅值；再改角度与噪声，比较估计曲线和解析模型。",
    controls: [
      { key: "sigma", label: "有效 Gaussian 模糊 σ", min: .4, max: 2, step: .05, value: .85, format: x => `${format(x, 2)} px` },
      { key: "angle", label: "边缘偏离竖直的角度", min: 0, max: 12, step: .5, value: 5, format: x => `${x}°` },
      { key: "factor", label: "ESF 分箱宽度", min: 1, max: 4, step: 1, value: 4, format: x => `1/${x} px` },
      { key: "noise", label: "归一化样本噪声 rms", min: 0, max: .03, step: .0025, value: 0, format: x => `${format(x * 100, 2)}%` },
      { key: "row", label: "查看像素行", min: 0, max: SIZE - 1, step: 1, value: 32, format: x => `${x} / ${SIZE - 1}` },
    ],
    presets: [
      { label: "书中 σ = 0.85 px", values: { sigma: .85, angle: 5, factor: 4, noise: 0, window: false, stage: 3 } },
      { label: "竖直边缘与缺箱", values: { angle: 0, factor: 4, stage: 1 } },
      { label: "加入噪声", values: { angle: 5, noise: .02, stage: 2 } },
    ],
    content: `<style>.edge-steps,.edge-options{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}.edge-steps [aria-pressed=true],.edge-options [aria-pressed=true]{background:#9caea222;border-color:currentColor}.edge-layout{display:grid;grid-template-columns:145px minmax(0,1fr);gap:20px;align-items:center;margin:18px 0}.edge-layout figure{margin:0}.edge-layout canvas{width:100%;height:auto;image-rendering:pixelated;border-radius:3px}.edge-layout figcaption{font-size:10px;opacity:.7}.edge-layout .chart{margin:0}.bin-counts{height:34px;display:flex;align-items:end;gap:1px;margin:8px 0}.bin-counts i{flex:1;min-width:0;background:#3f8b98aa}.bin-counts i.missing{background:#b98447}.edge-warning{font-size:11px}.edge-result{font-size:11px;font-variant-numeric:tabular-nums}@media(max-width:650px){.edge-layout{grid-template-columns:1fr;gap:14px}.edge-layout figure{max-width:190px}.stats strong{font-size:16px}}</style><div class="edge-steps" data-steps role="group" aria-label="分析步骤"></div><div class="edge-layout"><figure><canvas width="64" height="64" data-edge role="img" aria-label="合成 Gaussian 模糊斜边，棕线标出选中行"></canvas><figcaption>64 × 64 线性样本；棕线为选中行。像素图按固定 Gamma 2.2 显示。</figcaption></figure><div><div class="chart" data-chart></div><div class="legend" data-legend></div></div></div><p class="reading" data-step-reading></p><div class="edge-options" data-options></div><p class="reading">各箱的样本数：棕色表示空箱。计算使用全部 64 行。</p><div class="bin-counts" data-counts role="img" aria-label="ESF 各箱占用与空箱"></div><div class="stats"><div><small>解析模型 MTF50</small><strong data-analytic></strong><em>cycles/pixel</em></div><div><small>修正后的估计 MTF50</small><strong data-estimate></strong><em>只在已显示频带内找交点</em></div><div><small>分箱覆盖</small><strong data-coverage></strong><em>有样本的箱 / 全部箱</em></div></div><p class="edge-warning" data-warning aria-live="polite"></p><p class="edge-result" data-result></p>`,
    note: "教学输入为已知的连续 Gaussian ESF，σ 表示整个有效线性系统的模糊量；在像素中心采样，不另乘一次像素孔径响应。边缘角度与中心位置直接给定，法向中心偏移固定为 0.2 px，未实现边缘拟合、相机 RAW 解码或完整 ISO 12233 测量。噪声为归一化线性样本上的独立 Gaussian 扰动，按固定种子生成。ESF 在 ±12 px 内均匀分箱，内部空箱仅线性插值以说明后续影响；存在空箱时不报告 MTF50。LSF 用中心差分，可选 Hamming 窗；DFT 用四倍补零细化频率采样，以非零直流幅值归一化。差分响应绝对值低于 0.2 的频带不反除。MTF50 取从零频开始首次向下穿越 0.5 的交点，不向频带外外推。曲线只显示到原像素 Nyquist 0.5 cycles/pixel；细分箱与补零都不增加传感器分辨率。",
    update(root, state) {
      const key = JSON.stringify([state.sigma, state.angle, state.factor, state.noise, !!state.window, state.seed ?? 1]);
      if (cachedKey !== key) { result = analyze({ ...state, seed: state.seed ?? 1 }); cachedKey = key; }
      const stage = state.stage ?? 0, drawing = projectionChart(result, state, stage);
      drawEdge(root.querySelector("[data-edge]"), result.samples, state.row);
      root.querySelector("[data-chart]").innerHTML = drawing.chart;
      root.querySelector("[data-legend]").innerHTML = legend(drawing.curves);
      const descriptions = [
        `这里只画第 ${state.row} 行的投影样本。横轴按边缘法向距离归并；改变行号可以看到不同的亚像素位置。`,
        `箱宽 ${format(result.h)} px。每箱对落入其中的原始样本取均值；空箱的连线仅作插值示意。`,
        "中心差分除以 2 倍箱宽。求导会放大高频噪声；Hamming 窗压低远端，但也会改变测量响应。",
        "棕线是加窗后 LSF 的 DFT 幅值，蓝线进一步除以中心差分的响应。解析灰线来自生成样本的同一 Gaussian 模型。",
      ];
      root.querySelector("[data-step-reading]").textContent = descriptions[stage];
      const maximum = Math.max(...result.esf.bins.map(b => b.count), 1);
      root.querySelector("[data-counts]").innerHTML = result.esf.bins.map(b => `<i class="${b.count ? "" : "missing"}" style="height:${b.count ? 6 + 28 * b.count / maximum : 6}px" title="d=${format(b.x)} px，${b.count} 个样本"></i>`).join("");
      root.querySelector("[data-analytic]").textContent = format(result.analytic50, 4);
      root.querySelector("[data-estimate]").textContent = result.esf.missing ? "不报告" : result.estimated50 === null ? "未跨阈值" : format(result.estimated50, 4);
      root.querySelector("[data-coverage]").textContent = `${result.esf.bins.length - result.esf.missing} / ${result.esf.bins.length}`;
      root.querySelector("[data-warning]").textContent = result.esf.missing ? `有 ${result.esf.missing} 个空箱，亚像素相位覆盖不足。后续曲线包含插值结果，不能据此报告 MTF50。` : "当前所有箱都有样本。估计仍包含分箱、有限差分、窗口与噪声的影响。";
      root.querySelector("[data-result]").textContent = `取像素节距 4 μm，解析模型为 ${format(result.analytic50 / .004, 1)} lp/mm。${result.estimated50 === null ? "当前不作估计值换算。" : `本次估计为 ${format(result.estimated50 / .004, 1)} lp/mm。`} 这属于整个输入系统，不能直接归为镜头的 MTF50。`;
      for (const button of root.querySelectorAll("[data-stage]")) button.setAttribute("aria-pressed", String(Number(button.dataset.stage) === stage));
      const toggle = root.querySelector("[data-window]");
      if (toggle) { toggle.textContent = `LSF 加窗：${state.window ? "开" : "关"}`; toggle.setAttribute("aria-pressed", String(!!state.window)); }
    },
    setup({ root, state, render }) {
      stages.forEach((name, index) => {
        const button = document.createElement("button"); button.textContent = name; button.dataset.stage = index;
        button.addEventListener("click", () => { state.stage = index; render(); }, { signal });
        root.querySelector("[data-steps]").append(button);
      });
      const windowButton = document.createElement("button"); windowButton.dataset.window = "";
      windowButton.addEventListener("click", () => { state.window = !state.window; render(); }, { signal });
      const resample = document.createElement("button"); resample.textContent = "重新采样噪声";
      resample.addEventListener("click", () => { state.seed = (state.seed ?? 1) + 1; state.noise ||= .02; render(); }, { signal });
      root.querySelector("[data-options]").append(windowButton, resample);
      render();
    },
  });
}
