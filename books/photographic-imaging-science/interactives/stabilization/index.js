import { experiment, plot, legend } from "../common/ui.js";
import {
  motionExperiment,
  motionTruth,
  traceShift,
  PIXEL_MM,
} from "./model.js";
const blue = "#448b98",
  gold = "#b47b43",
  purple = "#8b78aa";
const fixed = (v, n = 3) => (Math.abs(v) < 1e-10 ? 0 : v).toFixed(n);
function diagram(sample) {
  const rays = [-0.5, 0, 0.5].map((h) =>
    traceShift(sample.theta, sample.delta, h),
  );
  const x = (z) => 80 + z * 2.6,
    y = (h) => 145 - h * 100;
  let out = `<text x="28" y="18">镜组横移 δ；像面参考中心随传感器移动</text><path d="M28 145H490" stroke="currentColor" opacity=".2"/>`;
  for (const r of rays) {
    const base = traceShift(sample.theta, 0, r.height);
    out += `<path d="M${x(-20)} ${y(r.height - 20 * sample.theta)}L${x(0)} ${y(r.height)}L${x(50)} ${y(base.y2)}L${x(150)} ${y(base.image)}" stroke="currentColor" opacity=".15" fill="none" stroke-dasharray="4 4"/><path d="M${x(-20)} ${y(r.height - 20 * sample.theta)}L${x(0)} ${y(r.height)}L${x(50)} ${y(r.y2)}L${x(150)} ${y(r.image)}" fill="none" stroke="${blue}" stroke-width="${r.height === 0 ? 2 : 1.3}"/>`;
  }
  out += `<path d="M${x(0)} 85V205" stroke="${blue}" stroke-width="3"/><path d="M${x(50)} ${y(sample.delta) - 60}V${y(sample.delta) + 60}" stroke="${gold}" stroke-width="3"/><path d="M${x(150)} ${y(sample.sensor) - 45}V${y(sample.sensor) + 45}" stroke="${purple}" stroke-width="4"/><path d="M${x(150) - 7} ${y(sample.sensor)}h14" stroke="${purple}" stroke-width="2"/><circle cx="${x(150)}" cy="${y(sample.image)}" r="4" fill="${gold}"/><text x="${x(0)}" y="43" text-anchor="middle">前组 +10 D</text><text x="${x(50)}" y="62" text-anchor="middle">防抖组 −10 D</text><text x="${x(150)}" y="43" text-anchor="end">传感器</text><text x="28" y="242">蓝线：实际光路 · 淡虚线：未补偿光路</text><text x="28" y="263">横、纵比例不同；金点为光束交点，紫短线为传感器参考中心</text>`;
  return `<svg role="img" aria-label="防抖组和传感器位移对光束交点相对位置的影响" viewBox="0 0 520 278">${out}</svg>`;
}
export function mount({ element, signal }) {
  return experiment({
    element,
    signal,
    kicker: "防抖 · 光学位移与相对像移",
    title: "镜组补偿和传感器补偿如何分担位移",
    intro:
      "选择一个时刻，比较防抖组、光束交点和传感器中心的位置。下方保留整段100 ms的残余轨迹，单个时刻恰好重合并不代表整段曝光都稳定。",
    controls: [
      {
        key: "amplitude",
        label: "入射方向角摆幅",
        min: 0,
        max: 1,
        step: 0.05,
        value: 0.5,
        format: (v) => `${v.toFixed(2)} mrad`,
      },
      {
        key: "ois",
        label: "镜组补偿比例",
        min: 0,
        max: 1.5,
        step: 0.05,
        value: 0,
        format: (v) => `${v.toFixed(2)} ×`,
      },
      {
        key: "ibis",
        label: "传感器补偿比例",
        min: 0,
        max: 1.5,
        step: 0.05,
        value: 0,
        format: (v) => `${v.toFixed(2)} ×`,
      },
      {
        key: "delay",
        label: "共同补偿延迟",
        min: 0,
        max: 25,
        step: 1,
        value: 0,
        format: (v) => `${v} ms`,
      },
      {
        key: "time",
        label: "观察时刻",
        min: 0,
        max: 100,
        step: 1,
        value: 25,
        format: (v) => `${v} ms`,
      },
    ],
    presets: [
      { label: "关闭补偿", values: { ois: 0, ibis: 0, delay: 0 } },
      { label: "仅镜组补偿", values: { ois: 1, ibis: 0, delay: 0 } },
      { label: "仅传感器补偿", values: { ois: 0, ibis: 1, delay: 0 } },
      { label: "两者各一半", values: { ois: 0.5, ibis: 0.5, delay: 0 } },
      { label: "两者都全量", values: { ois: 1, ibis: 1, delay: 0 } },
      { label: "镜组延迟10 ms", values: { ois: 1, ibis: 0, delay: 10 } },
    ],
    content: `<style>.actions button{font-size:11px;padding:4px 8px}.shift-ray svg,.shift-plot svg{display:block;width:100%;height:auto}.shift-ray text,.shift-plot text{fill:currentColor;font:11px ui-sans-serif,sans-serif}.shift-bottom{display:grid;grid-template-columns:1.1fr 1fr;gap:20px;align-items:start}.shift-bottom>div{min-width:0}.truth{font-size:11px;line-height:1.9;border:1px solid #9caea255;border-radius:6px;padding:12px 14px;margin:14px 0}.stats strong{font-size:20px}.position{font-size:12px;line-height:1.85}@media(max-width:650px){.shift-bottom{grid-template-columns:1fr}.stats{gap:6px}.stats strong{font-size:16px}.stats small,.stats em{font-size:9px}.shift-ray text{font-size:13px}}</style><div class="stats" data-stats></div><div class="shift-ray" data-rays></div><p class="position" data-position></p><div class="shift-bottom"><div><div class="shift-plot" data-trajectory></div><div class="legend" data-key></div></div><div class="truth" data-truth></div></div><p class="reading" data-reading aria-live="polite"></p>`,
    note: "一维、无穷远、近轴薄组：前组+10 D位于0，后组−10 D位于50 mm，像面位于150 mm；总焦距200 mm，像素间距4 µm。入射方向以10 Hz正弦摆动，曝光恰为100 ms完整一周期；延迟后的正弦已处于稳态，不模拟启动过程。镜组与传感器分别跟随同一延迟信号。未设行程、速度上限，未估计陀螺仪噪声、控制带宽、滚动快门、主体运动或近摄视差；数值不能换算为器材的防抖档数。",
    update(root, state) {
      const m = motionExperiment(state),
        s = m.current;
      root.querySelector("[data-stats]").innerHTML = [
        [
          "当前未补偿像移",
          `${fixed(s.uncorrected / PIXEL_MM)} px`,
          `${fixed(s.uncorrected * 1000)} µm`,
        ],
        [
          "防抖组机械位移 δ",
          `${fixed(s.delta * 1000)} µm`,
          "此组位移的像面作用为 −δ",
        ],
        [
          "当前相对残余像移",
          `${fixed(s.residual / PIXEL_MM)} px`,
          "光束交点 − 传感器中心",
        ],
      ]
        .map(
          ([a, b, c]) =>
            `<div><small>${a}</small><strong>${b}</strong><em>${c}</em></div>`,
        )
        .join("");
      root.querySelector("[data-rays]").innerHTML = diagram(s);
      root.querySelector("[data-position]").textContent =
        `当前防抖后的光束交点 y=${fixed(s.image * 1000)} µm；传感器参考中心 yₛ=${fixed(s.sensor * 1000)} µm；差值为${fixed(s.residual * 1000)} µm。`;
      const curves = [
        {
          name: "未补偿像移",
          color: "currentColor",
          dashed: true,
          points: m.series.map((s) => [s.time, s.uncorrected / PIXEL_MM]),
        },
        {
          name: "相对残余像移",
          color: gold,
          points: m.series.map((s) => [s.time, s.residual / PIXEL_MM]),
        },
      ];
      const bound = Math.max(
        1,
        ...curves.flatMap((c) => c.points.map((p) => Math.abs(p[1]))),
      );
      root.querySelector("[data-trajectory]").innerHTML = plot({
        curves,
        markers: [
          { value: state.time, label: `${state.time} ms`, color: purple },
        ],
        xMax: 100,
        yMin: -bound,
        yMax: bound,
        xLabel: "曝光时间 / ms",
        yLabel: "像移 / px",
        title: "100毫秒完整周期内的未补偿及残余轨迹",
        width: 432,
        leftPadding: 48,
        rightPadding: 24,
      });
      root.querySelector("[data-key]").innerHTML = legend(curves);
      root.querySelector("[data-truth]").innerHTML =
        `<strong>独立对照</strong><br>逐面追迹当前残余：${fixed(s.residual * 1000, 6)} µm；解析式 200θ−δ−yₛ：${fixed(motionTruth(state) * 1000, 6)} µm。<br>512个中点采样的整周期RMS=${fixed(m.rms * 1000, 6)} µm；谐波解析真值=${fixed(m.truthRms * 1000, 6)} µm，差值${(Math.abs(m.rms - m.truthRms) * 1000).toExponential(2)} µm。<br>RMS是位移轨迹的均方根，不是PSF宽度或MTF。`;
      root.querySelector("[data-reading]").textContent =
        state.amplitude === 0
          ? "没有输入角摆动，所有位移均为零。"
          : state.delay === 0 && Math.abs(state.ois + state.ibis - 1) < 1e-9
            ? "两套机构的总补偿比例为1，且没有延迟；相对像移在整个周期内为零。"
            : state.delay === 0 && state.ois + state.ibis > 1
              ? "总补偿超过了所需位移，残余轨迹会反向；两套机构各执行一次全量修正，会造成重复补偿。"
              : state.delay > 0
                ? "补偿信号落后于当前角摆动，即使比例合计为1，整段残余轨迹仍不为零。"
                : "补偿比例尚未覆盖全部像移。可以分别打开镜组或传感器，再比较各承担一半时的结果。";
    },
  });
}
