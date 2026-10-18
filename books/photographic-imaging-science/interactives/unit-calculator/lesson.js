import { scales } from "./model.js";
import { control, curve, grid, number } from "../common/lesson-view.js";
export const spec = {
  title: "像素、衍射与信噪比的单位换算",
  alt: "互动示意：光子预算、采样频率、衍射尺度与SNR判据换算",
  intro:
    "输入统一的像素、波长、孔径和噪声条件，计算各自的物理尺度。光学截止、Nyquist频率和SNR下端分别报告。",
  staticCaption: "4 μm像素，550 nm，f/8，曝光量10⁻⁴ J/m²；读噪3 e⁻，SNR下端1。",
  note: "单色、方形像素、空气中的理想圆瞳、无像差。光子数按整个像素面积；此表不代表QE标定。SNR模型为μ/√(μ+σr²)，满阱固定32000 e⁻，不含暗电流、PRNU或空间平均。频率为像面lp/mm，Airy为第一零点直径。",
  controls: [
    control("pixel", "像素节距", 2, 8, 0.5, 4, " μm", 1),
    control("wavelength", "波长", 400, 700, 10, 550, " nm"),
    control("fNumber", "f数", 2, 16, 0.5, 8, "", 1),
    control(
      "exposure",
      "曝光量（log₁₀）",
      -6,
      -2,
      0.25,
      -4,
      " log₁₀(J/m²)",
      2,
    ),
    control("read", "读噪", 0, 10, 0.5, 3, " e⁻ rms", 1),
    control("target", "下端SNR", 1, 10, 0.5, 1, ":1", 1),
  ],
  presets: [
    {
      label: "第1章光子预算",
      values: {
        pixel: 4,
        wavelength: 550,
        fNumber: 8,
        exposure: -4,
        read: 3,
        target: 1,
      },
    },
    {
      label: "第12章6 μm像素",
      values: {
        pixel: 6,
        wavelength: 550,
        fNumber: 8,
        exposure: -4,
        read: 3,
        target: 1,
      },
    },
  ],
  evaluate(s) {
    const m = scales(s);
    return {
      panels: [
        {
          title: "含散粒噪声的SNR与所选下端",
          xMax: Math.max(200, m.noise.minimum * 1.4),
          xLabel: "平均信号电子数 μ / e⁻",
          yLabel: "SNR",
          yMax: Math.max(15, s.target * 1.4),
          curves: [
            curve(
              "μ/√(μ+σr²)",
              grid(0, Math.max(200, m.noise.minimum * 1.4), (x) =>
                x === 0 ? 0 : x / Math.sqrt(x + s.read * s.read),
              ),
            ),
            curve(
              "下端判据",
              [
                [0, s.target],
                [Math.max(200, m.noise.minimum * 1.4), s.target],
              ],
              1,
              true,
            ),
          ],
          markers: [{ value: m.noise.minimum, label: "", color: "#777" }],
        },
      ],
      stats: [
        [
          "平均入射光子",
          number(m.signal.photons, 1) + " 个",
          `像素能量 ${m.signal.energy.toExponential(2)} J`,
        ],
        [
          "Nyquist / 光学截止",
          number(m.nyquist, 1) + " / " + number(m.cutoff, 1),
          "lp/mm；二者不是同一阈值",
        ],
        [
          "Airy第一零点直径",
          number(m.airy, 3) + " μm",
          `SNR下端 ${number(m.noise.minimum, 3)} e⁻`,
        ],
      ],
      reading: `p=${s.pixel} μm=${number(s.pixel * 1e-3, 4)} mm；λ=${s.wavelength} nm=${number(s.wavelength * 1e-6, 6)} mm。fNyquist=1/(2p)，fc=1/(λN)，两者比 ${number(m.ratio, 4)}。指定SNR下端到32000 e⁻的范围为 ${number(m.noise.stops, 3)}档；它与32000/读噪的工程比不同。`,
    };
  },
};
