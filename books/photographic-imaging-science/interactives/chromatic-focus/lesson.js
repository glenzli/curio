import { chromaticFocus, defocusedOtf, radialDensity } from "./model.js";
import { control, curve, grid, number } from "../common/lesson-view.js";
import { focusPlanes, spectralColors } from "./figures.js";
let cachedKey = "",
  cached;
export const spec = {
  title: "三条谱线的焦点与最佳对焦目标",
  alt: "互动示意：轴向色差下三谱线PSF与有符号OTF的合成",
  intro:
    "谱线权重按检测到的信号归一化；各谱线只改变自己的离焦相位。比较同一物理像面上的点像，并分别寻找轴上值和指定频率MTF的最大值。",
  staticCaption:
    "450/550/650 nm权重1:2:1，焦面−40/0/+40 μm，f/8，探针60 lp/mm。",
  note: "无中心遮挡的均匀圆瞳、标量近轴衍射、三条互不相干谱线。各谱线焦点在参数中给定。每条PSF全平面单位能量，按相同μm坐标合成；轴上比相对三谱线各自合焦的共同参考，不等于任意离焦图案的峰值Strehl。扫描步长2 μm，报告所取网格点中的最大值。",
  controls: [
    {
      ...control("split", "红蓝相对绿焦面距离", 0, 60, 2, 40, " μm"),
      enabled: (s) => s.band === 1,
      hint: (s) =>
        s.band === 1
          ? "移动红、蓝焦面；绿焦面固定为0。"
          : "单绿模式没有红、蓝信号；切回三线模式后可比较色差。",
    },
    control("focus", "所选像面", -80, 80, 2, 10, " μm"),
    control("fNumber", "f数", 6, 16, 0.5, 8, "", 1),
    control("frequency", "MTF探针频率", 10, 140, 5, 60, " lp/mm"),
    control("band", "谱线模式：0单绿 / 1三线", 0, 1, 1, 1),
  ],
  presets: [
    {
      label: "单绿合焦",
      values: { split: 40, focus: 0, fNumber: 8, frequency: 60, band: 0 },
    },
    {
      label: "三线轴向色差",
      values: { split: 40, focus: 10, fNumber: 8, frequency: 60, band: 1 },
    },
    {
      label: "更高频率的对焦目标",
      values: { split: 60, focus: 0, fNumber: 6, frequency: 120, band: 1 },
    },
  ],
  evaluate(s) {
    const key = JSON.stringify(s);
    if (key !== cachedKey) {
      cachedKey = key;
      cached = chromaticFocus(s);
    }
    const m = cached;
    const otf = (nu) =>
      m.lines.reduce(
        (v, l) =>
          v + l.weight * defocusedOtf(nu, s.focus - l.focus, l.nm, s.fNumber),
        0,
      );
    return {
      figureMinWidth: 560,
      figureHeight: 280,
      figure: focusPlanes(s, m),
      panels: [
        {
          title: "同一物理坐标的PSF径向剖面",
          xMax: 12,
          xLabel: "距轴心 / μm",
          yLabel: "PSF / 共同合焦参考轴上值",
          curves: [
            ...m.lines
              .map((l, i) => ({
                ...curve(
                  `${l.nm} nm（含权重）`,
                  grid(
                    0,
                    12,
                    (r) =>
                      (l.weight *
                        radialDensity(r, s.focus - l.focus, l.nm, s.fNumber)) /
                      m.idealAxis,
                    48,
                  ),
                  i,
                ),
                color: spectralColors[i],
              }))
              .filter((_, i) => m.lines[i].weight > 0),
            curve(
              "合成强度剖面",
              grid(0, 12, (r) => m.psf(r) / m.idealAxis, 48),
              3,
              true,
            ),
          ],
        },
        {
          title: "有符号OTF先求和，最后取模",
          xMax: 180,
          xLabel: "像面频率 / lp/mm",
          yLabel: "OTF / MTF",
          yMin: -0.25,
          curves: [
            curve("合成OTF实部", grid(0, 180, otf, 80)),
            curve(
              "合成MTF",
              grid(0, 180, (nu) => Math.abs(otf(nu)), 80),
              1,
            ),
          ],
          markers: [{ value: s.frequency, label: "", color: "#777" }],
        },
        {
          title: "不同对焦目标的同一焦面扫描",
          xMin: -80,
          xMax: 80,
          xLabel: "像面位置 / μm",
          yLabel: "轴上比 / 指定频率MTF",
          curves: [
            curve(
              "轴上比",
              m.scan.map((p) => [p.z, p.axis / m.idealAxis]),
            ),
            curve(
              `${s.frequency} lp/mm MTF`,
              m.scan.map((p) => [p.z, p.mtf]),
              1,
            ),
          ],
        },
      ],
      stats: [
        [
          "当前轴上比",
          number(m.current.axis / m.idealAxis, 3),
          "闭式sinc²参考",
        ],
        ["最大轴上值位置", number(m.bestAxis.z, 0) + " μm", "2 μm网格搜索"],
        [
          "最大探针MTF位置",
          number(m.bestMtf.z, 0) + " μm",
          `MTF ${number(m.bestMtf.mtf, 3)}`,
        ],
      ],
      reading: `当前各谱线OTF实部：${m.current.monochrome.map((x) => number(x.otf, 4)).join(" / ")}；加权后 ${number(m.current.otf, 4)}。PSF图用独立径向复振幅积分；轴上值另有闭式。两种最优位置可以相同，也可以不同，结论随频率、谱线权重和焦点间隔变化。`,
    };
  },
};
