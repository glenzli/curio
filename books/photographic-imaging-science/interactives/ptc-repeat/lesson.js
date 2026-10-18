import { collect, repeatedPtc, STUDIES, GAIN, READ_NOISE } from "./model.js";
import { expectedVariance, BLACK } from "../flatfield/model.js";
import { control, curve, grid, number } from "../common/lesson-view.js";
let key, cached;
const range = (values) => {
  const valid = values.filter((v) => v !== null && Number.isFinite(v)),
    lo = Math.min(...valid),
    hi = Math.max(...valid),
    span = Math.max(hi - lo, 0.01 * Math.max(1, Math.abs(hi)));
  return [lo - span * 0.12, hi + span * 0.12];
};
// Independent studies are discrete marks, not a continuous time trajectory.
const scatter = (name, points, color, limits) =>
  points.map(([x, y], i) =>
    curve(
      i ? "" : name,
      Array.from({ length: 9 }, (_, k) => [
        x + 0.12 * Math.cos((k * Math.PI) / 4),
        y + (limits[1] - limits[0]) * 0.011 * Math.sin((k * Math.PI) / 4),
      ]),
      color,
    ),
  );
export const spec = {
  title: "PTC重复采集的估计散布",
  alt: "互动示意：24次独立PTC采集的增益、读噪估计和已知真值",
  intro:
    "每次重新采集16个信号级，再从观测拟合增益。同一次采集的成对差分和单帧空间方差并列比较；改变拟合范围时复用这批观测。",
  staticCaption:
    "24套采集；每级2对16×16 px平场；增益真值0.2 DN/e⁻、读噪10 e⁻；无PRNU或漂移，默认排除饱和级。",
  note: "复用原PTC的Poisson计数、Gaussian读噪、满阱剪切和整数DN量化。增益0.2 DN/e⁻、读噪10 e⁻、满阱12000 e⁻；每套16个信号级。各次采集用不同确定性随机流，同一ROI的固定响应图样保持不变。改变ROI会重新生成该大小的模拟采集，不是裁切同一幅大图。拟合只接收观测矩和已知白点；差分先中心化，用N−1分母后除以2。读噪估计近似扣1/12 DN²量化方差，条件不足时留空。样本标准差描述24次参数估计的散布，不是单帧读噪，也不是置信区间。动画逐次显露观测，汇总始终使用完整24次。不是EMVA合格性测试。",
  controls: [
    {
      ...control("roi", "每帧ROI", 0, 1, 1, 0),
      format: (v) => (v ? "32 × 32 px" : "16 × 16 px"),
    },
    control("pairs", "每信号级平场对数", 1, 4, 1, 2, " 对"),
    control("prnuPercent", "固定响应差异 PRNU", 0, 5, 0.5, 0, "%", 1),
    control("driftPercent", "两帧照明相对差", 0, 20, 1, 0, "%"),
    control("fitPercent", "拟合均值上限 / 白点跨度", 30, 105, 5, 75, "%"),
    {
      ...control("exclude", "排除接近饱和的级", 0, 1, 1, 1),
      format: (v) => (v ? "开" : "关"),
      hint: "仅当拟合范围包含接近饱和的观测时生效；用下方两个饱和段预设比较。",
    },
    control("study", "显露到第几次采集", 1, STUDIES, 1, STUDIES, ""),
    control("batch", "随机批次", 0, 9, 1, 0, ""),
  ],
  presets: [
    {
      label: "均匀像素",
      values: {
        roi: 0,
        pairs: 2,
        prnuPercent: 0,
        driftPercent: 0,
        fitPercent: 75,
        exclude: 1,
        study: 24,
      },
    },
    {
      label: "更大的ROI和更多平场",
      values: {
        roi: 1,
        pairs: 4,
        prnuPercent: 0,
        driftPercent: 0,
        fitPercent: 75,
        exclude: 1,
        study: 24,
      },
    },
    {
      label: "稳定PRNU",
      values: {
        prnuPercent: 2,
        driftPercent: 0,
        fitPercent: 75,
        exclude: 1,
        study: 24,
      },
    },
    {
      label: "PRNU与照明漂移",
      values: {
        prnuPercent: 4,
        driftPercent: 20,
        fitPercent: 75,
        exclude: 1,
        study: 24,
      },
    },
    {
      label: "同范围排除饱和段",
      values: {
        prnuPercent: 0,
        driftPercent: 0,
        fitPercent: 105,
        exclude: 1,
        study: 24,
      },
    },
    {
      label: "纳入饱和段",
      values: {
        prnuPercent: 0,
        driftPercent: 0,
        fitPercent: 105,
        exclude: 0,
        study: 24,
      },
    },
  ],
  replay: {
    key: "study",
    start: 1,
    end: STUDIES,
    durationMs: 10000,
    startOnFirstPlay: true,
    label: "逐次显露估计",
  },
  evaluate(s) {
    const cacheKey = JSON.stringify([
      s.roi,
      s.pairs,
      s.prnuPercent,
      s.driftPercent,
      s.batch,
    ]);
    if (cacheKey !== key) {
      cached = collect(s);
      key = cacheKey;
    }
    const m = repeatedPtc(s, cached),
      i = Math.max(0, Math.floor(s.study) - 1),
      f = m.fits[i],
      data = m.trials[i];
    const dots = (method) =>
      m.fits
        .slice(0, i + 1)
        .flatMap((f, j) =>
          f[method] === null
            ? []
            : [
                [
                  j + 1,
                  typeof f[method] === "number" ? f[method] : f[method].slope,
                ],
              ],
        );
    const estimates = m.fits.flatMap((f) => [
        f.temporal?.slope ?? null,
        f.spatial?.slope ?? null,
      ]),
      gainRange = range([GAIN, ...estimates]),
      noiseRange = range([READ_NOISE, ...m.fits.map((f) => f.readNoise)]);
    const truth = {
        gain: GAIN,
        readNoise: READ_NOISE,
        prnu: s.prnuPercent / 100,
        drift: s.driftPercent / 100,
      },
      max = data.white - BLACK;
    const varianceMax =
      Math.max(
        ...data.measurements.map((p) => Math.max(p.temporal, p.spatial)),
        expectedVariance(max, truth, "spatial"),
      ) * 1.05;
    return {
      panels: [
        {
          title: "重复采集的增益估计",
          leftPadding: 112,
          xMin: 0,
          xMax: STUDIES,
          xLabel: "独立采集序号",
          yMin: gainRange[0],
          yMax: gainRange[1],
          yLabel: "拟合斜率 / DN/e⁻",
          curves: [
            ...scatter("成对差分", dots("temporal"), 0, gainRange),
            ...scatter("单帧空间方差", dots("spatial"), 1, gainRange),
            curve(
              "生成增益真值",
              [
                [0, GAIN],
                [STUDIES, GAIN],
              ],
              3,
              true,
            ),
          ],
        },
        {
          title: `第${i + 1}次的观测与未饱和模型`,
          leftPadding: 112,
          xMin: 0,
          xMax: max * 1.04,
          xLabel: "扣黑电平的均值 / DN",
          yMin: 0,
          yMax: varianceMax,
          yLabel: "方差 / DN²",
          markers: [{ value: (max * s.fitPercent) / 100, label: "拟合上限" }],
          curves: [
            curve(
              "成对差分观测",
              data.measurements.map((p) => [p.mean, p.temporal]),
              0,
            ),
            curve(
              "空间方差观测",
              data.measurements.map((p) => [p.mean, p.spatial]),
              1,
            ),
            curve(
              "差分未饱和预测",
              grid(0, max, (x) => expectedVariance(x, truth, "temporal")),
              2,
              true,
            ),
            curve(
              "空间未饱和预测",
              grid(0, max, (x) => expectedVariance(x, truth, "spatial")),
              3,
              true,
            ),
          ],
        },
        {
          title: "重复采集的读噪估计",
          leftPadding: 112,
          xMin: 0,
          xMax: STUDIES,
          xLabel: "独立采集序号",
          yMin: noiseRange[0],
          yMax: noiseRange[1],
          yLabel: "读噪估计 / e⁻ RMS",
          curves: [
            ...scatter(
              "由暗场方差和拟合增益估计",
              dots("readNoise"),
              0,
              noiseRange,
            ),
            curve(
              "生成读噪真值",
              [
                [0, READ_NOISE],
                [STUDIES, READ_NOISE],
              ],
              3,
              true,
            ),
          ],
        },
      ],
      stats: [
        [
          "成对差分 · 均值 ± 样本SD",
          `${number(m.temporal.mean, 5)} ± ${number(m.temporal.sd, 5)}`,
          `${m.temporal.n}/24 个有效斜率，DN/e⁻`,
        ],
        [
          "空间方差 · 均值 ± 样本SD",
          `${number(m.spatial.mean, 5)} ± ${number(m.spatial.sd, 5)}`,
          `${m.spatial.n}/24 个有效斜率，DN/e⁻`,
        ],
        [
          "读噪估计 · 均值 ± 样本SD",
          `${number(m.read.mean, 3)} ± ${number(m.read.sd, 3)}`,
          `${m.read.n}/24 次有效，e⁻`,
        ],
      ],
      reading: `全部24次采集的统计保持不变，当前显示前${i + 1}次。第${i + 1}次选入${f.selected.length}/16个信号级：差分斜率${number(f.temporal?.slope ?? null, 6)} DN/e⁻，空间斜率${number(f.spatial?.slope ?? null, 6)} DN/e⁻，读噪估计${number(f.readNoise, 4)} e⁻。已知增益为0.200000 DN/e⁻，差分估计的平均偏差为${number(m.temporal.mean === null ? null : m.temporal.mean - GAIN, 6)} DN/e⁻。当前ROI内的固定响应图样在24次采集中共用；照明漂移与PRNU、饱和筛选会改变估计偏差，重复更多次不能自动消除这些偏差。`,
    };
  },
};
