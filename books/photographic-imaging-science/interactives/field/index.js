import { fieldResponse, maxHeight } from "./model.js";
import { experiment, plot, points, legend } from "../common/ui.js";
function psf(m) {
  const scale = 3.2,
    rx = m.radialSigma * scale,
    ry = m.tangentialSigma * scale;
  return `<svg viewBox="0 0 150 150" role="img" aria-label="椭圆高斯 PSF 的一倍与两倍标准差轮廓"><path d="M15 75H135M75 15V135" stroke="currentColor" opacity=".2"/><ellipse cx="75" cy="75" rx="${2 * rx}" ry="${2 * ry}" fill="none" stroke="#426d58" opacity=".5"/><ellipse cx="75" cy="75" rx="${rx}" ry="${ry}" fill="#426d5815" stroke="#426d58"/><circle cx="75" cy="75" r="1.5" fill="currentColor"/><text x="130" y="89" font-size="10" fill="currentColor">R</text><text x="81" y="22" font-size="10" fill="currentColor">T</text></svg><p>PSF 等强度轮廓：1σ、2σ<br>横向 R，纵向 T；框宽 46.9 µm</p>`;
}
export function mount({ element, signal }) {
  return experiment({
    element,
    signal,
    kicker: "像场实验 13 / 17 · 声明的高斯教学模型",
    title: "边缘变软，是焦面弯了，还是方向焦点分开了？",
    intro:
      "横轴是从中心到角落的像高，每条曲线固定一个频率。改变焦面，比较固定平面与局部重对焦的结果。",
    controls: [
      {
        key: "height",
        label: "观察像高",
        min: 0,
        max: 21.6,
        step: 0.1,
        value: 21.6,
        format: (v) => `${v.toFixed(1)} mm`,
      },
      {
        key: "focus",
        label: "当前像面轴向位置",
        min: -40,
        max: 160,
        step: 1,
        value: 0,
        format: (v) => `${v.toFixed(0)} µm`,
      },
      {
        key: "curvature",
        label: "平均焦面边缘位移 C",
        min: 0,
        max: 120,
        step: 1,
        value: 75,
        format: (v) => `${v} µm`,
      },
      {
        key: "astigmatism",
        label: "焦面分裂半差 A",
        min: 0,
        max: 40,
        step: 1,
        value: 0,
        format: (v) => `${v} µm`,
      },
      {
        key: "frequency",
        label: "细节曲线频率",
        min: 20,
        max: 60,
        step: 1,
        value: 30,
        format: (v) => `${v} lp/mm`,
      },
    ],
    presets: [
      { label: "仅场曲", values: { curvature: 75, astigmatism: 0, focus: 0 } },
      {
        label: "加入方向焦面分裂",
        values: { curvature: 75, astigmatism: 35, focus: 0 },
      },
      { label: "中心对焦", values: { focus: 0 } },
      {
        label: "当前像高重对焦",
        values: (s) => ({
          focus: Number((s.curvature * (s.height / maxHeight) ** 2).toFixed(1)),
        }),
      },
    ],
    content:
      '<div class="field-grid"><div><div class="chart-wrap"><div class="mtf-chart chart"></div><div class="legend"></div></div></div><div class="psf"></div></div><div class="focus-chart chart"></div><div class="stats"></div><p class="criterion"></p>',
    note: "R/T 在此明确指空间频率向量的径向/切向，并非通用的厂商 S/M 线型约定。模型设 u=(h/21.6 mm)²，z_R=(C+A)u，z_T=(C−A)u；σ_q²=(1.8 µm)²+[0.08(z−z_q)]²，MTF_q=exp[−2π²(σ_qν)²]，频率计算中 µm 换算为 mm。用局部椭圆高斯 PSF 演示诊断逻辑，不是某支镜头的处方、Seidel 拟合、完整衍射传播或实测。",
    update(root, s) {
      const m = fieldResponse(s),
        curves = [];
      for (const [frequency, color] of [
        [10, "#426d58"],
        [s.frequency, "#a77840"],
      ])
        for (const direction of ["radial", "tangential"])
          curves.push({
            name: `${frequency} lp/mm · ${direction === "radial" ? "径向 R" : "切向 T"}`,
            color,
            dashed: direction === "tangential",
            points: points(
              maxHeight,
              (h) => fieldResponse({ ...s, height: h, frequency })[direction],
            ),
          });
      root.querySelector(".mtf-chart").innerHTML = plot({
        curves,
        xMax: maxHeight,
        xLabel: "像高 · mm",
        markers: [{ value: s.height, label: "观察位置" }],
        title: "固定频率、不同像高的径向与切向 MTF",
      });
      root.querySelector(".legend").innerHTML = legend(curves);
      root.querySelector(".psf").innerHTML = psf(m);
      const focal = [
        {
          name: "径向最佳面",
          color: "#426d58",
          points: points(
            maxHeight,
            (h) => fieldResponse({ ...s, height: h }).radialFocus,
          ),
        },
        {
          name: "切向最佳面",
          color: "#496c8c",
          dashed: true,
          points: points(
            maxHeight,
            (h) => fieldResponse({ ...s, height: h }).tangentialFocus,
          ),
        },
        {
          name: "当前平面",
          color: "#a77840",
          points: [
            [0, s.focus],
            [maxHeight, s.focus],
          ],
        },
      ];
      root.querySelector(".focus-chart").innerHTML = plot({
        curves: focal,
        xMax: maxHeight,
        xLabel: "像高 · mm · 绿/蓝为两个最佳面，棕色为当前平面",
        yLabel: "轴向位置 · µm",
        yMin: -40,
        yMax: 160,
        markers: [{ value: s.height, label: "观察位置" }],
        title: "两个方向的最佳焦面与当前固定像面",
      });
      root.querySelector(".stats").innerHTML =
        `<div><small>选定位置 · 径向 MTF</small><strong>${m.radial.toFixed(3)}</strong><em>${s.frequency} lp/mm</em></div><div><small>选定位置 · 切向 MTF</small><strong>${m.tangential.toFixed(3)}</strong><em>${s.frequency} lp/mm</em></div><div><small>两个最佳面间距</small><strong>${Math.abs(m.radialFocus - m.tangentialFocus).toFixed(1)}</strong><em>µm</em></div>`;
      root.querySelector(".criterion").textContent =
        s.astigmatism === 0
          ? "仅有场曲：对选定像高重新对焦，可恢复本模型的轴上基准；同一平面上的其他位置仍会变化。"
          : "两个方向最佳面已分开：当前按钮取平均焦面，不保证任意频率的平均 MTF 最优，也不能让两方向同时达到各自最佳值。";
      root.querySelector(".lab").dataset.radialMtf = String(m.radial);
      root.querySelector(".lab").dataset.tangentialMtf = String(m.tangential);
    },
  });
}
