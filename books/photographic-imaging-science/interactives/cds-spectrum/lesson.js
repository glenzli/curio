import { control, curve, grid, number } from "../common/lesson-view.js";
import { cdsSpectrum, sample, response } from "./model.js";
export const spec = {
  title: "两次采样之间，噪声变了多少",
  alt: "互动示意：CDS采样孔径、频率响应与时域方差对照",
  intro:
    "先看同一条噪声波形上的两次读数，再改变间隔和采样宽度。缓慢变化的分量与快速变化的分量，差分后留下的量不同。",
  staticCaption:
    "32条10—320 kHz线谱；输入RMS 30 μV，间隔10 μs，矩形采样宽2 μs。",
  note: "有限随机相位线谱；单线50 kHz，均匀线功率或低频较强混合谱。采样值为矩形窗口平均，频响为sinc(πfw)[1−exp(−i2πfτ)]。1024个时间点覆盖一个100 μs共同周期，时间方差与独立线谱预算比较；它不是器件的连续白噪声或1/f测量。",
  controls: [
    {
      ...control("kind", "输入谱型", 0, 2, 1, 2),
      format: (v) => ["单线50 kHz", "各线等功率", "低频较强"][v],
    },
    control("rms", "输入噪声 RMS", 0, 60, 1, 30, " μV"),
    control("tau", "两次采样间隔", 0, 40, 0.5, 10, " μs", 1),
    control("aperture", "单次采样宽度", 0, 25, 0.5, 2, " μs", 1),
    control("time", "第一窗口中心", 15, 60, "any", 20, " μs", 1),
    control("seed", "波形种子", 1, 999, 1, 17),
  ],
  presets: [
    { label: "同一时刻相减", values: { tau: 0 } },
    { label: "50 kHz · 半周期", values: { kind: 0, tau: 10, aperture: 0 } },
    { label: "50 kHz · 整周期", values: { kind: 0, tau: 20, aperture: 0 } },
    { label: "窗口平均一个周期", values: { kind: 0, tau: 10, aperture: 20 } },
    { label: "恢复混合谱", values: { kind: 2, tau: 10, aperture: 2 } },
  ],
  replay: {
    key: "time",
    start: 15,
    end: 60,
    durationMs: 8000,
    label: "沿波形移动采样窗口",
  },
  evaluate(s) {
    const m = cdsSpectrum(s),
      raw = grid(0, 120, (t) => sample(m.lines, t), 240),
      averaged = grid(0, 120, (t) => sample(m.lines, t, s.aperture), 240),
      limit = Math.max(1, ...raw.map((v) => Math.abs(v[1]))) * 1.1;
    return {
      panels: [
        {
          title: "同一波形：原始值与窗口平均",
          curves: [
            curve("原始噪声", raw, 3, true),
            curve("矩形窗口平均", averaged),
          ],
          markers: [
            { value: s.time, label: "读数1" },
            ...(s.tau ? [{ value: s.time + s.tau, label: "读数2" }] : []),
          ],
          xMin: 0,
          xMax: 120,
          yMin: -limit,
          yMax: limit,
          xLabel: "时间 / μs",
          yLabel: "节点噪声 / μV",
        },
        {
          title: "差分与采样孔径的共同频率响应",
          curves: [
            curve(
              "|H_CDS|²",
              grid(0, 320, (f) => response(f, s), 640),
              1,
            ),
          ],
          xMin: 0,
          xMax: 320,
          samples: m.bands.map((b) => [b.frequency, b.response]),
          yMin: 0,
          yMax: 4.1,
          xLabel: "频率 / kHz",
          yLabel: "功率乘数",
        },
      ],
      stats: [
        ["本次两读数之差", number(m.first - m.second) + " μV", "来自固定波形"],
        ["输出噪声 RMS", number(Math.sqrt(m.variance)) + " μV", "线谱积分"],
        [
          "时域周期 RMS",
          number(Math.sqrt(m.timeVariance)) + " μV",
          "1024点独立重算",
        ],
      ],
      reading: `两次窗口平均分别为${number(m.first)}与${number(m.second)} μV。谱线预算给出方差${number(m.variance, 6)} μV²；由两次样本的方差与协方差另算为${number(m.covarianceReference, 6)} μV²。播放只移动窗口，输入波形与统计预算保持不变。`,
    };
  },
};
