import { reconstruct, valueAt, PERIOD, DIMENSION } from "./model.js";
import { control, curve, grid, number } from "../common/lesson-view.js";
export const spec = {
  title: "亚像素位移能补回哪些细节",
  alt: "互动示意：亚像素位移、矩形像素积分、已知图案和重建残差",
  intro:
    "先比较四张重复帧与四种采样相位。两种重建都只读取观测；已知位移一支用来隔离配准误差，原始图案只用于事后核对。",
  staticCaption:
    "一维周期16 px；33个实Fourier系数；四相位0、0.25、0.5、0.75 px；无噪声、无配准误差、无正则化。",
  note: "一维静态单色周期图案，节距1 px，最高1 cycle/px；Gaussian光学模糊后作宽a的矩形面积平均。观测叠加独立同方差Gaussian噪声，seed=8105，取连续强度刻度。解为最小范数伪逆，正则项为λ‖c‖²；不施加非负约束，不截断重建负值。数值秩阈值为最大奇异值的10⁻⁹。播放逐帧增加观测，不增加先验；二维CFA的配准与重建需另给相应的前向模型。",
  controls: [
    {
      ...control("frames", "使用帧数", 1, 4, 1, 4),
      format: (v) => String(Math.floor(v)),
    },
    {
      ...control("diverse", "采样相位", 0, 1, 1, 1),
      format: (v) => (v ? "每帧错开0.25 px" : "每帧位置相同"),
      enabled: (s) => Math.floor(s.frames) > 1,
      hint: (s) =>
        Math.floor(s.frames) > 1
          ? "改变新增帧的采样位置，第一帧的位置不变。"
          : "当前只有第一帧；增加帧数后才能比较采样相位。",
    },
    control("aperture", "像素积分宽度", 0.5, 1, 0.025, 0.8, " px", 3),
    control("blur", "光学模糊 σ", 0, 0.35, 0.025, 0.1, " px", 3),
    control("noise", "观测噪声 σ", 0, 0.03, 0.001, 0, "", 3),
    {
      ...control("bias", "末帧位移估计误差", -0.15, 0.15, 0.01, 0, " px", 2),
      enabled: (s) => Math.floor(s.frames) > 1,
      hint: (s) =>
        Math.floor(s.frames) > 1
          ? "误差随帧序号递增；已知位移支路不受此控件影响。"
          : "第一帧作为位置参考，不加位移估计误差。",
    },
    control("ridge", "正则系数 λ", 0, 0.05, 0.001, 0, "", 3),
  ],
  presets: [
    {
      label: "四种相位 · 无噪声",
      values: {
        frames: 4,
        diverse: 1,
        aperture: 0.8,
        blur: 0.1,
        noise: 0,
        bias: 0,
        ridge: 0,
      },
    },
    {
      label: "重复帧仍有歧义",
      values: {
        frames: 4,
        diverse: 0,
        aperture: 0.8,
        blur: 0.1,
        noise: 0,
        bias: 0,
        ridge: 0,
      },
    },
    {
      label: "像素孔径零点",
      values: {
        frames: 4,
        diverse: 1,
        aperture: 1,
        blur: 0.1,
        noise: 0,
        bias: 0,
        ridge: 0,
      },
    },
    {
      label: "配准误差",
      values: {
        frames: 4,
        diverse: 1,
        aperture: 0.8,
        blur: 0.1,
        noise: 0,
        bias: 0.1,
        ridge: 0,
      },
    },
    {
      label: "噪声与正则化",
      values: {
        frames: 4,
        diverse: 1,
        aperture: 0.8,
        blur: 0.2,
        noise: 0.015,
        bias: 0,
        ridge: 0.02,
      },
    },
  ],
  replay: {
    key: "frames",
    start: 1,
    end: 4,
    durationMs: 9000,
    startOnFirstPlay: true,
    label: "逐帧加入观测",
  },
  evaluate(s) {
    const m = reconstruct({ ...s, frames: Math.floor(s.frames) }),
      p = m.p;
    const samplePoints = m.observed.map((v, i) => [
      (i % PERIOD) + (p.diverse ? Math.floor(i / PERIOD) / 4 : 0),
      v,
    ]);
    return {
      panels: [
        {
          title: "输入与重建 · 共用线性标尺",
          xMin: 0,
          xMax: 16,
          xLabel: "位置 / px",
          yMin: -0.4,
          yMax: 1.4,
          yLabel: "相对线性强度",
          curves: [
            curve(
              "已知原始图案",
              grid(0, 16, (x) => valueAt(m.truth, x, p), 400),
              0,
              true,
            ),
            curve(
              "使用估计位移",
              grid(0, 16, (x) => valueAt(m.fit.coefficients, x, p), 400),
              1,
            ),
            curve(
              "使用已知位移",
              grid(0, 16, (x) => valueAt(m.known.coefficients, x, p), 400),
              2,
            ),
          ],
        },
        {
          title: "像素积分后的观测",
          xMin: 0,
          xMax: 16,
          xLabel: "真实采样位置 / px",
          yMin: 0,
          yMax: 1,
          yLabel: "像素平均强度",
          curves: [
            curve(
              "光学模糊与像素积分后的连续像",
              grid(0, 16, (x) => valueAt(m.truth, x, p, true), 400),
              3,
            ),
          ],
          samples: samplePoints,
        },
        {
          title: "观测残差 · 零线为精确拟合",
          xMin: 0,
          xMax: Math.max(15, m.observed.length - 1),
          xLabel: "按帧排列的观测序号",
          yMin: -0.1,
          yMax: 0.1,
          yLabel: "预测 − 观测",
          curves: [
            curve(
              "估计位移支路残差",
              m.residual.map((v, i) => [i, v]),
              1,
            ),
            curve(
              "零",
              [
                [0, 0],
                [m.observed.length - 1, 0],
              ],
              3,
              true,
            ),
          ],
        },
      ],
      stats: [
        [
          "数值秩 / 未知系数",
          `${m.fit.rank} / ${DIMENSION}`,
          `${m.observed.length} 个观测；已知位移秩 ${m.known.rank}`,
        ],
        [
          "原图 RMSE · 估计 / 已知位移",
          `${number(m.rmse, 5)} / ${number(m.knownRmse, 5)}`,
          "在固定1024个周期位置上核对真值",
        ],
        [
          "观测残差 RMS",
          m.residualRms.toExponential(2),
          `非零奇异值条件比 ${number(m.fit.condition, 2)}`,
        ],
      ],
      reading: `33维系数空间中，当前估计矩阵有 ${DIMENSION - m.fit.rank} 个数值不可辨识方向；残差小并不保证原图正确。1 cycle/px的矩形孔径响应 |sinc(a)| = ${number(m.witnessAmplitude, 6)}，a=1时为零，任意平移都不能恢复该频率。图内原图与两条重建共用−0.4…1.4标尺；超出绘图范围的值保留在RMSE中。`,
    };
  },
};
