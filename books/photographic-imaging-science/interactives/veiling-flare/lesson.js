import { veilingFlare } from "./model.js";
import { control, number, curve, grid } from "../common/lesson-view.js";
import { imagePanels } from "../common/image-view.js";
export const spec = {
  title: "面纱眩光怎样降低对比",
  alt: "互动示意：均匀杂散光、Michelson对比度与扣均值后的散粒噪声",
  intro:
    "黑白图案保持不变，只增加一层均匀杂散光。比较对比度，再假设已知这层光的平均值，检查扣除后还剩多少噪声。",
  staticCaption:
    "亮区1000 e⁻，暗区100 e⁻，均匀杂散光300 e⁻/像素，读噪4 e⁻ rms。",
  note: "局部均匀、与目标光独立的杂散光；各处电子数为期望值。示意图显示无噪声均值；噪声按独立Poisson与加性读噪计算，已知均值扣除不增加校准误差。不追迹散射或鬼影；饱和另属捕获限制。本图显示白点固定2000 e⁻、Gamma 2.2。",
  controls: [
    control("bright", "亮区信号", 200, 1000, 50, 1000, " e⁻"),
    control("dark", "暗区信号", 0, 200, 10, 100, " e⁻"),
    control("veil", "均匀杂散光", 0, 900, 10, 300, " e⁻/像素"),
    control("readNoise", "读噪", 0, 10, 1, 4, " e⁻ rms"),
  ],
  presets: [
    { label: "无眩光", values: { veil: 0 } },
    { label: "加入300 e⁻", values: { veil: 300 } },
    { label: "暗区原信号为零", values: { dark: 0, veil: 300 } },
  ],
  replay: {
    key: "veil",
    start: 0,
    end: 900,
    durationMs: 7000,
    startOnFirstPlay: true,
    label: "逐渐增加杂散光",
  },
  evaluate(s) {
    const m = veilingFlare(s),
      width = 160,
      height = 96;
    const direct = Array.from({ length: width * height }, (_, i) => {
      const x = i % width,
        y = Math.floor(i / width);
      return x > 15 && x < 145 && y > 15 && y < 81
        ? Math.floor(x / 12) % 2
          ? s.bright
          : s.dark
        : s.dark;
    });
    const panels = imagePanels(
      [
        {
          label: "原图均值",
          values: direct,
          width,
          height,
          white: 2000,
          detail: "固定白点2000 e⁻；Gamma 2.2",
        },
        {
          label: "加上均匀杂散光",
          values: direct.map((x) => x + s.veil),
          width,
          height,
          white: 2000,
          detail: "图案差值不变，黑位与均值一起升高",
        },
        {
          label: "扣除已知杂散光均值",
          values: direct,
          width,
          height,
          white: 2000,
          detail: "均值恢复；噪声方差仍含杂散光电子",
          active: true,
        },
      ],
      {
        title: "同一图案的原始、面纱眩光与理想均值扣除",
        columns: 3,
        tileHeight: 190,
      },
    );
    return {
      ...panels,
      figureHeight: 200,
      panels: [
        {
          title: "固定输入下的Michelson对比度",
          xMax: 900,
          xLabel: "杂散光 / e⁻每像素",
          yLabel: "调制度",
          curves: [
            curve(
              "解析均值对比",
              grid(
                0,
                900,
                (b) => (s.bright - s.dark) / (s.bright + s.dark + 2 * b),
              ),
            ),
          ],
          markers: [{ value: s.veil, label: "当前" }],
        },
      ],
      stats: [
        [
          "对比度：原图 / 含眩光",
          `${number(m.contrast, 3)} / ${number(m.observedContrast, 3)}`,
          "两区均值的Michelson定义",
        ],
        [
          "扣均值后暗区噪声",
          number(Math.sqrt(m.varianceLow), 2) + " e⁻ rms",
          "杂散光的Poisson方差仍在",
        ],
        [
          "暗区SNR：原图 / 扣均值后",
          `${number(m.darkSnrBefore, 2)} / ${number(m.darkSnrCorrected, 2)}`,
          "以原暗区信号为分子",
        ],
        [
          "条纹端点独立核对",
          Math.abs(m.observedContrast - m.referenceContrast).toExponential(2),
          "从完整周期均值重算对比",
        ],
      ],
      reading: `亮暗均值从${m.bright}/${m.dark}变为${m.rawHigh}/${m.rawLow} e⁻。即使准确扣掉${m.veil} e⁻，暗区噪声方差仍为${m.varianceLow} e⁻²。实际杂散光并不总是均匀，估计背景也会带来额外误差。`,
    };
  },
};
