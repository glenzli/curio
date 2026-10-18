import { repeatability, MEAN } from "./model.js";
import { control, curve, grid, number } from "../common/lesson-view.js";
let key, cached;
function groups(m, progress) {
  const w = 720,
    h = 270,
    left = 90,
    right = 20,
    top = 40,
    bottom = 45;
  const lo = Math.min(0.4, ...m.data.map((d) => d.value)) - 0.01,
    hi = Math.max(0.8, ...m.data.map((d) => d.value)) + 0.01;
  const x = (i) => left + ((i + 0.5) / m.data.length) * (w - left - right),
    y = (v) => h - bottom - ((v - lo) / (hi - lo)) * (h - top - bottom);
  const visible = Math.floor((m.data.length * progress) / 100),
    colors = ["#40879a", "#bb7946", "#8b78aa", "#777"];
  let body = `<path d="M${left} ${y(MEAN)}H${w - right}" stroke="#777" stroke-dasharray="6 4"/><text x="${left}" y="18" font-size="14">MTF读数；虚线为生成均值0.600</text>`;
  for (let l = 0; l < m.p.lenses; l++) {
    const start = l * m.p.mounts * m.p.repeats,
      end = start + m.p.mounts * m.p.repeats;
    body += `<text x="${(x(start) + x(end - 1)) / 2}" y="${h - 12}" text-anchor="middle" font-size="13">样品${l + 1}</text>`;
    for (let a = 0; a < m.p.mounts; a++) {
      const first = start + a * m.p.repeats,
        last = first + m.p.repeats - 1;
      body += `<path d="M${x(first)} ${y(m.analysis.cell[l][a])}H${x(last)}" stroke="${colors[l % 4]}" stroke-width="2"/>`;
    }
    if (l)
      body += `<path d="M${x(start) - 2} ${top}V${h - bottom}" stroke="currentColor" opacity=".12"/>`;
  }
  for (let i = 0; i < visible; i++)
    body += `<circle cx="${x(i)}" cy="${y(m.data[i].value)}" r="2.8" fill="${colors[m.data[i].lens % 4]}"/>`;
  for (const v of [lo, MEAN, hi])
    body += `<text x="${left - 8}" y="${y(v) + 4}" text-anchor="end" font-size="12">${v.toFixed(3)}</text>`;
  return `<svg class="drawing repeat-groups" role="img" aria-label="按样品和装夹分组的重复MTF观测" viewBox="0 0 ${w} ${h}"><style>@media(max-width:550px){.lesson .repeat-groups text{font-size:25px}}</style>${body}</svg>`;
}
export const spec = {
  title: "重复拍摄、装夹与样品差异",
  alt: "互动示意：样品、装夹与重复拍摄的方差分量及选择峰值偏差",
  intro:
    "同一装夹中的读数共享两个随机项。分别改变连拍张数、装夹次数和样品数，再比较整套实验均值的散布。下方另检查对焦包围中挑最高点的结果。",
  staticCaption:
    "4支样品，每支3次装夹，每次5张；三层标准差0.040、0.025、0.015；生成均值0.600。",
  note: "平衡嵌套Gaussian模型：样品效应、装夹效应与拍摄误差独立、零均值，观测由模型生成，MTF读数不截断到0…1。矩估计只读观测与组标签，负的方差分量估计原样保留。总体均值0.600，重复整套研究256次；已知方差给出的均值标准差与观测标准误分开，不显示置信区间。对焦支路沿用40 lp/mm的Gaussian响应，−80…80 μm网格，比较选择读数、选中位置真值和独立复测。播放只逐条显露当前数据，统计始终使用完整数据。",
  controls: [
    control("lenses", "样品数", 2, 8, 1, 4),
    control("mounts", "每支装夹次数", 2, 6, 1, 3),
    control("repeats", "每次装夹张数", 2, 12, 1, 5),
    control("lensSD", "样品标准差", 0, 0.1, 0.005, 0.04, "", 3),
    control("mountSD", "装夹标准差", 0, 0.08, 0.005, 0.025, "", 3),
    control("readSD", "拍摄/焦点测量标准差", 0, 0.05, 0.005, 0.015, "", 3),
    control("seed", "随机种子", 1, 999999, 1, 17017),
    {
      ...control("grid", "对焦候选点数", 0, 2, 1, 2),
      format: (v) => String([9, 17, 33][Math.round(v)]),
    },
    control("progress", "已显露的观测", 0, 100, 1, 100, "%"),
  ],
  presets: [
    {
      label: "主要是拍摄误差",
      values: { lensSD: 0, mountSD: 0, readSD: 0.03 },
    },
    {
      label: "装夹项保留下来",
      values: { lensSD: 0, mountSD: 0.04, readSD: 0.015 },
    },
    {
      label: "三层都存在",
      values: { lensSD: 0.04, mountSD: 0.025, readSD: 0.015 },
    },
    { label: "所有输入方差为零", values: { lensSD: 0, mountSD: 0, readSD: 0 } },
  ],
  replay: {
    key: "progress",
    start: 0,
    end: 100,
    startOnFirstPlay: true,
    label: "逐条显示观测",
    durationMs: 9000,
  },
  evaluate(s) {
    const next = JSON.stringify([
      s.lenses,
      s.mounts,
      s.repeats,
      s.lensSD,
      s.mountSD,
      s.readSD,
      s.seed,
      s.grid,
    ]);
    if (key !== next) {
      cached = repeatability(s);
      key = next;
    }
    const m = cached,
      a = m.analysis,
      t = m.truth,
      sd = Math.sqrt(t.meanVariance),
      extent = Math.max(20, 4 * sd * 1000),
      bins = 25,
      step = (2 * extent) / bins;
    const counts = new Array(bins).fill(0);
    let outside = 0;
    for (const v of m.ensemble.values) {
      const i = Math.floor(((v - MEAN) * 1000 + extent) / step);
      if (i < 0 || i >= bins) outside++;
      else counts[i]++;
    }
    const hist = counts.map((n, i) => [
      -extent + (i + 0.5) * step,
      n / ((256 * step) / 1000),
    ]);
    const pdf = (x) =>
      Math.exp(-0.5 * (x / (sd * 1000)) ** 2) / (sd * Math.sqrt(2 * Math.PI));
    const max = Math.max(...hist.map((p) => p[1]), sd > 0 ? pdf(0) : 0) * 1.12;
    const selection = m.selection;
    return {
      figureHeight: 270,
      figure: groups(m, s.progress),
      panels: [
        {
          title: "重新生成整套实验256次：均值的分布",
          xMin: -extent,
          xMax: extent,
          xLabel: "整套均值−0.600（×10⁻³）",
          yLabel: "概率密度（MTF⁻¹）",
          yMax: max,
          curves: [
            curve("256次完整采集", hist),
            ...(sd > 0
              ? [
                  curve(
                    "已知Gaussian均值分布",
                    grid(-extent, extent, pdf),
                    2,
                    true,
                  ),
                ]
              : []),
          ],
          markers: [
            {
              value: 0,
              label: sd === 0 ? "方差为零" : "生成均值",
              color: "#777",
            },
          ],
        },
      ],
      stats: [
        [
          "当前完整观测数",
          String(m.data.length),
          `${s.lenses}支 × ${s.mounts}次 × ${s.repeats}张；点图显露${Math.floor((m.data.length * s.progress) / 100)}条`,
        ],
        [
          "均值标准差：已知 / 重复实测",
          `${number(sd, 5)} / ${number(Math.sqrt(m.ensemble.variance), 5)}`,
          "重复实测指256次完整合成采集",
        ],
        [
          "当前观测标准误：分组 / 当作独立",
          `${number(a.meanSE, 5)} / ${number(a.naiveSE, 5)}`,
          "不同的相关性假设，不是两条置信区间",
        ],
      ],
      staticRows: [
        "方差分量：生成值 / 原始矩估计；均方：观测 / 期望",
        ...[
          ["样品", "lens"],
          ["装夹", "mount"],
          ["拍摄", "read"],
        ].flatMap(([label, k]) => [
          `${label}方差（MTF²）：${number(t.components[k], 6)} / ${number(a.estimates[k], 6)}`,
          `${label}均方（MTF²）：${number(a.ms[k], 6)} / ${number(t.expectedMS[k], 6)}`,
        ]),
        `对焦包围：${selection.count}个候选，独立重复256次`,
        `被选中的观测最大值：${number(selection.observedMean, 6)}`,
        `选中位置的生成响应：${number(selection.selectedTruthMean, 6)}`,
        `选中位置的独立复测：${number(selection.validationMean, 6)}`,
        `生成曲线峰值真值：${number(selection.truePeak, 6)}`,
      ],
      table: `<div class="table-scroll"><table><thead><tr><th>分量（MTF²）</th><th>生成方差</th><th>原始矩估计</th><th>均方：观测 / 期望</th></tr></thead><tbody>${[
        ["样品", "lens"],
        ["装夹", "mount"],
        ["拍摄", "read"],
      ]
        .map(
          ([label, k]) =>
            `<tr><td>${label}</td><td>${number(t.components[k], 6)}</td><td>${number(a.estimates[k], 6)}</td><td>${number(a.ms[k], 6)} / ${number(t.expectedMS[k], 6)}</td></tr>`,
        )
        .join(
          "",
        )}</tbody></table><h4>对焦包围：${selection.count}个候选，独立重复256次</h4><table><thead><tr><th>比较对象</th><th>平均读数</th></tr></thead><tbody>${[
        ["被选中的观测最大值", selection.observedMean],
        ["选中位置的生成响应", selection.selectedTruthMean],
        ["选中位置的独立复测", selection.validationMean],
        ["生成曲线峰值真值", selection.truePeak],
      ]
        .map(
          ([label, v]) => `<tr><td>${label}</td><td>${number(v, 6)}</td></tr>`,
        )
        .join("")}</tbody></table></div>`,
      reading: `已知生成方差下，误把${m.data.length}条观测都当独立会得到均值标准差${number(Math.sqrt(t.iidMeanVariance), 5)}，正确嵌套预算为${number(sd, 5)}。同次装夹两张的协方差为${number(t.sameMountCovariance, 6)}，同支不同装夹为${number(t.sameLensCovariance, 6)}。直方图范围外${outside}/256次；负方差矩估计保留原值。对焦复测使用新的测量噪声，不复用选择时的误差；增加候选点可能抬高被选中的观测最大值，不能据此宣称真实峰值提高。`,
    };
  },
};
