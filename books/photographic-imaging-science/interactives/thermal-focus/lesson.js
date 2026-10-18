import { thermalFocus, secondarySpectrum } from "./model.js";
import { control, curve, grid, number } from "../common/lesson-view.js";
import { thermalPositions } from "./figures.js";
export const spec = {
  title: "折射率温漂与镜筒伸长",
  alt: "互动示意：折射率温漂、玻璃膨胀与镜筒伸长的分离",
  intro:
    "一片100 mm薄透镜和一段100 mm镜筒分别计算。比较镜片焦距变化、传感器位置变化，以及两者相减后的离焦。",
  staticCaption: "n=1.50；dn/dT=2 ppm/K，玻璃8 ppm/K，镜筒12 ppm/K，升温20 K。",
  note: "示意材料参数，非N-BK7/N-F2的温度目录。均匀温度、薄透镜、空气折射率固定；n(T)与半径热膨胀在此有限温区按给定线性律定义。镜筒伸长把传感器向后推；不含组间距、胶合应力或闭环对焦。目录部分色散另用已有SCHOTT数据。",
  controls: [
    control("temperature", "温差", -30, 50, 1, 20, " K"),
    control("dn", "dn/dT", -6, 8, 0.5, 2, "×10⁻⁶/K", 1),
    control("glassExpansion", "玻璃线膨胀系数", 0, 20, 1, 8, " ppm/K"),
    control("barrelExpansion", "镜筒线膨胀系数", 0, 30, 1, 12, " ppm/K"),
  ],
  presets: [
    {
      label: "自由薄透镜",
      values: { temperature: 20, dn: 2, glassExpansion: 8, barrelExpansion: 0 },
    },
    {
      label: "镜筒也伸长",
      values: {
        temperature: 20,
        dn: 2,
        glassExpansion: 8,
        barrelExpansion: 12,
      },
    },
    {
      label: "一阶热补偿",
      values: { temperature: 20, dn: 2, glassExpansion: 8, barrelExpansion: 4 },
    },
  ],
  replay: {
    key: "temperature",
    start: -30,
    end: 50,
    label: "改变温度",
    startOnFirstPlay: true,
  },
  evaluate(s) {
    const m = thermalFocus(s),
      catalog = secondarySpectrum(),
      bounds = [-30, 50].flatMap((temperature) => {
        const v = thermalFocus({ ...s, temperature });
        return [v.residual, v.linear];
      });
    return {
      figureMinWidth: 560,
      figureHeight: 270,
      figure: thermalPositions(m),
      panels: [
        {
          title: "焦点相对传感器的位置",
          xMin: -30,
          xMax: 50,
          xLabel: "温差 / K",
          yLabel: "轴向差 / μm",
          yMin: Math.min(-1, ...bounds) * 1.1,
          yMax: Math.max(1, ...bounds) * 1.1,
          curves: [
            curve(
              "有限温差模型",
              grid(
                -30,
                50,
                (t) => thermalFocus({ ...s, temperature: t }).residual,
              ),
            ),
            curve(
              "一阶展开",
              grid(
                -30,
                50,
                (t) => thermalFocus({ ...s, temperature: t }).linear,
              ),
              1,
              true,
            ),
          ],
          markers: [{ value: s.temperature, label: "", color: "#777" }],
        },
      ],
      stats: [
        [
          "镜片焦距变化",
          number((m.exact - 100) * 1000, 3) + " μm",
          "折射率与玻璃半径共同作用",
        ],
        [
          "传感器位置变化",
          number((m.sensor - 100) * 1000, 3) + " μm",
          "镜筒伸长",
        ],
        [
          "剩余离焦",
          number(m.residual, 3) + " μm",
          `一阶值 ${number(m.linear, 3)} μm`,
        ],
      ],
      reading: `一阶分量：玻璃膨胀 ${number(m.shape, 3)} μm，折射率 ${number(m.material, 3)} μm，传感器后移 ${number(m.mount, 3)} μm。另核已有N-BK7/N-F2消色差配比：P_gF=${number(catalog.a, 5)} / ${number(catalog.b, 5)}，残余g−F光焦度由部分色散得 ${catalog.secondary.toExponential(5)} mm⁻¹，直接谱线相减得 ${catalog.direct.toExponential(5)} mm⁻¹。材料的色散与温漂需分别比较。`,
    };
  },
};
