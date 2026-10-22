import { lowpass, gains, WIDTH, HEIGHT, UPSCALE } from "./model.js";
import { kernelFigure, liveKernel } from "./figures.js";
import { control, number, grid, curve } from "../common/lesson-view.js";
import { imagePanels } from "../common/image-view.js";

const baseline = { mode: 2, separation: 1, frequency: 0.65, angle: 0, phase: 0.08, width: 1 };
export const spec = {
  title: "分光低通、像素积分与混叠",
  alt: "互动示意：两点或四点分光核、有符号OTF与同一已知条纹的采样",
  intro: "同一个点像分成几份，间隔与像素节距可直接比较。先看连续条纹，再看固定格点上的读数；负的传递系数会把条纹明暗反转。",
  staticCaption: "4 μm节距；四点等权、分光间隔1 px、频率0.65 cycle/px、水平方向；相位0.08周期，满宽像素积分。",
  note: "理想非相干等权副像模型；省略偏振态、波片色散、真实晶体处方、镜头像差和CFA。两点间隔为d，单点偏移为±d/2。32×16 px范围固定，连续图每px取8细格；所有图共用线性0…1，无逐图拉伸。像素孔径宽w、节距仍为1 px；w=0取点采样极限。曲线先计算采样前有符号OTF，离散折返另列。蓝框固定在样点(8,4)，用直接平移连续图像和二维求积独立核对该点，不读取cos/sinc公式。",
  controls: [
    {
      ...control("mode", "副像排列", 0, 2, 1, 2),
      format: v => ["无分光", "水平两点", "四点"][Math.round(v)],
      options: [
        { value: 0, label: "无分光" },
        { value: 1, label: "水平两点" },
        { value: 2, label: "四点" },
      ],
    },
    {
      ...control("separation", "两点间隔 d/p", 0, 2, 0.05, 1, " px", 2),
      enabled: s => s.mode !== 0,
      hint: s => s.mode === 0 ? "选择两点或四点后启用" : "每个方向的偏移为±d/2" },
    control("frequency", "条纹频率模长", 0.05, 1.5, 0.01, 0.65, " cycle/px", 2),
    control("angle", "频率向量方向", 0, 90, 1, 0, "°"),
    control("phase", "条纹相位", 0, 1, 0.01, 0.08, " 周期", 2),
    control("width", "方形像素积分宽度", 0, 1, 0.05, 1, " px", 2),
  ],
  presets: [
    { label: "同一条纹 · 无分光", values: { ...baseline, mode: 0 } },
    { label: "同一条纹 · 四点分光", values: baseline },
    { label: "轴向Nyquist零点", values: { ...baseline, frequency: 0.5 } },
    { label: "转向对角仍有响应", values: { ...baseline, frequency: 0.5, angle: 45 } },
    { label: "两点分光的正交方向", values: { ...baseline, mode: 1, angle: 90 } },
    { label: "更高频仍可透过", values: { ...baseline, frequency: 1.25 } },
  ],
  replay: { key: "phase", start: 0, end: 1, durationMs: 10000,
    startOnFirstPlay: true, label: "平移同一条纹" },
  evaluate(s) {
    const m = lowpass(s), kernel = kernelFigure(m), images = imagePanels([
      { label: "1 已知连续条纹", values: m.original,
        width: WIDTH * UPSCALE, height: HEIGHT * UPSCALE, gamma: 1,
        detail: "均值0.5，输入调制度0.8", scale: "固定32×16 px；线性0…1" },
      { label: "2 直接叠加分光副像", values: m.filtered,
        width: WIDTH * UPSCALE, height: HEIGHT * UPSCALE, gamma: 1,
        detail: "平移原条纹，按通量权重相加", scale: "保留已知连续图像，不从样本恢复" },
      { label: "3 无分光：积分后样本", values: m.unfilteredSamples,
        width: WIDTH, height: HEIGHT, gamma: 1,
        detail: "同一输入、同一像素孔径", scale: "每格一个观测；不插值放大" },
      { label: "4 当前分光：积分后样本", values: m.filteredSamples,
        width: WIDTH, height: HEIGHT, gamma: 1, probe: [m.probe.x, m.probe.y],
        detail: "蓝框固定样点(8,4)，另作直接求积", scale: "同一格点、同一线性显示白点" },
    ], { title: "分光前后的连续条纹与离散观测", tileHeight: 245 });
    const paths = [
      curve("分光 OTF", grid(0, 1.5, f => gains(s, f).optical), 0),
      curve("像素 OTF", grid(0, 1.5, f => gains(s, f).pixel), 1),
      curve("预采样 OTF", grid(0, 1.5, f => gains(s, f).total), 2),
      curve("预采样 MTF = |OTF|", grid(0, 1.5, f => Math.abs(gains(s, f).total)), 3, true),
    ];
    return {
      figure: `<svg xmlns="http://www.w3.org/2000/svg" class="drawing" role="img" aria-label="分光点核和已知条纹采样对照" viewBox="0 0 720 755">${kernel.replace("<svg ", '<svg x="0" y="0" width="720" height="245" ')}${images.figure.replace("<svg ", '<svg x="0" y="265" width="720" height="490" ')}</svg>`,
      figureHeight: 755,
      liveFigure: liveKernel(m) + images.liveFigure,
      panels: [{ title: "沿当前方向：有符号传递与取模", xMax: 1.5,
        xLabel: "频率模长 / cycle/px", yLabel: "归一化响应", yMin: -1, yMax: 1,
        curves: paths, markers: [{ value: s.frequency, label: "当前条纹" },
          { value: m.nyquist, label: "采样中心单元边界", color: "#777" }] }],
      stats: [
        ["分光 / 像素 OTF", `${number(m.optical, 4)} / ${number(m.pixel, 4)}`, "保留符号；两个环节分别计算"],
        ["预采样 OTF / MTF", `${number(m.total, 4)} / ${number(Math.abs(m.total), 4)}`, `条纹调制度 ${number(0.8 * Math.abs(m.total), 4)}`],
        ["蓝框：公式 / 直接求积", `${number(m.analytic, 6)} / ${number(m.direct, 6)}`, `绝对差 ${m.referenceError.toExponential(2)}`],
      ],
      reading: `当前频率向量 (${number(m.fx, 4)}, ${number(m.fy, 4)}) cycle/px，按4 μm节距为 (${number(m.fx * 250, 2)}, ${number(m.fy * 250, 2)}) lp/mm。折回中心频率单元得到 (${number(m.aliasX, 4)}, ${number(m.aliasY, 4)}) cycle/px；已知输入与这条等价条纹在全部512个样点上的最大差为 ${m.aliasDifference.toExponential(2)}。${Math.abs(m.total) < 1e-12 ? "当前条纹被预采样响应的零点消去。" : m.total < 0 ? "负OTF使连续输出相对输入反转半个周期；MTF数值只保留幅度。" : "当前预采样OTF为正。"} 分光余弦在零点之后还会恢复响应，有限个副像不能形成理想带限；改变相位不移动采样边界。`,
    };
  },
};
