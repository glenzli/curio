import { psfImage, directAt, SIDE, STEP_UM } from "./model.js";
import { control, number } from "../common/lesson-view.js";
import { imagePanels } from "../common/image-view.js";
let cacheKey, cached;
export const spec = {
  title: "PSF卷积与像素采样",
  alt: "互动示意：已知二维图案、有限PSF线性卷积和像素面积采样",
  intro:
    "点阵可以看清点像的叠加，细线图案可以比较不同方向。移动蓝框，核对该位置的空间求和与FFT卷积。",
  staticCaption:
    "550 nm、f/8；离焦与彗差为零；细网格1.1 μm，像素2.2 μm；黑色图外输入为零。",
  note: "局部空间不变、非相干、标量模型。复瞳使用直径32格、4倍补零；截取33×33格PSF并重新归一，截取前的离散能量比例单列。图案与卷积共用1.1 μm网格；像素积分对分片常量细格求平均。没有CFA、噪声、锐化或全场像差。PSF单独按峰值显示，其他图统一Gamma 2.2、线性范围0…1。回放逐点移动卷积探针。",
  controls: [
    control("defocus", "离焦系数", -0.3, 0.3, 0.025, 0, " λ rms", 3),
    control("coma", "彗差系数", -0.3, 0.3, 0.025, 0, " λ rms", 3),
    control("bin", "像素边长占细格数", 1, 4, 1, 2),
    {
      ...control("pattern", "输入图案", 0, 1, 1, 0),
      format: (v) => (v < 0.5 ? "点阵" : "细线与字形"),
    },
    control("probeX", "探针横坐标", 0, 47, 1, 24, "格"),
    control("probeY", "探针纵坐标", 0, 47, 1, 24, "格"),
  ],
  presets: [
    {
      label: "无像差点阵",
      values: { defocus: 0, coma: 0, bin: 2, pattern: 0 },
    },
    {
      label: "无像差细线",
      values: { defocus: 0, coma: 0, bin: 2, pattern: 1 },
    },
    {
      label: "彗差与细线",
      values: { defocus: 0, coma: 0.2, bin: 2, pattern: 1 },
    },
    {
      label: "离焦与大像素",
      values: { defocus: 0.2, coma: 0, bin: 4, pattern: 1 },
    },
  ],
  replay: {
    key: "probeX",
    start: 0,
    end: 47,
    startOnFirstPlay: true,
    label: "逐列检查卷积",
    durationMs: 8000,
  },
  evaluate(s) {
    const input = { ...s, probeX: Math.round(s.probeX) };
    const key = JSON.stringify([s.defocus, s.coma, s.bin, s.pattern]);
    if (key !== cacheKey) {
      cached = psfImage(input);
      cacheKey = key;
    }
    const m = cached,
      x = input.probeX,
      y = input.probeY;
    const direct = directAt(
        m.source,
        SIDE,
        SIDE,
        m.kernel.weights,
        m.kernel.side,
        x,
        y,
      ),
      fft = m.image[y * SIDE + x];
    const peak = Math.max(...m.kernel.weights),
      sourceSum = m.source.reduce((a, b) => a + b, 0);
    return {
      figureHeight: 500,
      ...imagePanels(
        [
          {
            label: "1 已知输入",
            values: m.source,
            width: SIDE,
            height: SIDE,
            detail: "固定像面范围 52.8 × 52.8 μm",
            scale: "细格1.1 μm；线性0…1",
          },
          {
            label: "2 有限PSF",
            values: m.kernel.weights,
            width: m.kernel.side,
            height: m.kernel.side,
            white: peak,
            detail: "显示按峰值归一；数值按总和归一",
            scale: `截取前能量 ${(100 * m.kernel.retained).toFixed(2)}%（离散全场）`,
          },
          {
            label: "3 线性卷积",
            values: m.image,
            width: SIDE,
            height: SIDE,
            probe: [x, y],
            detail: `蓝框中心 (${number((x + 0.5) * STEP_UM, 1)}, ${number((y + 0.5) * STEP_UM, 1)}) μm`,
            scale: "图外补零；没有从右边绕回左边",
          },
          {
            label: "4 面积积分后采样",
            values: m.sampled.image,
            width: m.sampled.width,
            height: m.sampled.height,
            detail: `${m.sampled.width} × ${m.sampled.height} 像素；节距 ${number(s.bin * STEP_UM, 1)} μm`,
            scale: "按原像面范围放大显示，没有插值补细节",
          },
        ],
        { title: "二维图案通过有限PSF与像素采样", tileHeight: 250 },
      ),
      stats: [
        [
          "探针：FFT / 空间求和",
          `${number(fft, 6)} / ${number(direct, 6)}`,
          "同一位置、同一有限模型的独立算法",
        ],
        [
          "探针绝对差",
          Math.abs(fft - direct).toExponential(2),
          "在线性强度域比较",
        ],
        [
          "完整卷积和 / 输入和",
          `${number(m.fullSum, 6)} / ${number(sourceSum, 6)}`,
          `本幅裁剪内保留 ${number(
            m.image.reduce((a, b) => a + b, 0),
            6,
          )}`,
        ],
      ],
      reading: `有限PSF权重和为 ${number(
        m.kernel.weights.reduce((a, b) => a + b, 0),
        8,
      )}；FFT虚部最大残差 ${m.imaginaryResidual.toExponential(2)}。归一的有限核保持完整卷积的总和，显示窗口裁掉的能量另计。原始PSF在截取窗口外的离散能量为 ${(100 * (1 - m.kernel.retained)).toFixed(2)}%；重新归一的有限核对应本次离散卷积；连续光学PSF的尾部积分需另外计算。`,
    };
  },
};
