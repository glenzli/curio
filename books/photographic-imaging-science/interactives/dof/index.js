import { experiment } from "../common/ui.js";
import { depthOfField, tracedBlur, numericalLimits } from "./model.js";
const distance = (w) => (w === 0 ? "∞" : `${(1 / w).toFixed(3)} m`),
  // Remove sub-nanometre root roundoff before rounding the displayed metres.
  mmToM = (x) =>
    x === null ? "∞" : `${Number((x / 1000).toPrecision(12)).toFixed(4)} m`;
const params = (s) => ({
  focalLength: s.focalLength,
  fNumber: 2 ** s.apertureEV,
  criterionUm: s.criterionUm,
  focusVergence: s.focusVergence,
  subjectVergence: s.subjectVergence,
});

function graph(m) {
  const p = m.p,
    delta = m.limits.nearVergence - p.focusVergence,
    lo = Math.max(0, p.focusVergence - 3 * delta),
    hi = p.focusVergence + 3 * delta;
  const x = (w) => 50 + ((w - lo) / (hi - lo)) * 470,
    y = (r) => 212 - r * 52;
  let body = `<path d="M50 ${y(1)}H520" stroke="#b47b43" stroke-dasharray="5 4"/><text x="55" y="18">弥散圈 / 容许直径</text>`;
  const left = Math.max(lo, m.limits.farVergence),
    right = Math.min(hi, m.limits.nearVergence);
  body += `<rect x="${x(left)}" y="48" width="${x(right) - x(left)}" height="164" fill="#448b98" opacity=".09"/>`;
  for (let i = 0; i <= 3; i++) {
    body += `<path d="M50 ${y(i)}H520" stroke="currentColor" opacity=".12"/><text x="40" y="${y(i) + 4}" text-anchor="end">${i}</text>`;
  }
  let path = "";
  for (let i = 0; i <= 120; i++) {
    const w = lo + ((hi - lo) * i) / 120,
      r = (tracedBlur(p, w).diameter * 1000) / p.criterionUm;
    path += `${i ? "L" : "M"}${x(w)} ${y(Math.min(3.1, r))}`;
  }
  body += `<path d="${path}" fill="none" stroke="#448b98" stroke-width="2.4"/>`;
  for (const [w, label, color] of [
    [
      p.focusVergence,
      p.focusVergence === 0 && m.limits.farVergence === 0
        ? "对焦 / 远界"
        : "对焦",
      "#8b78aa",
    ],
    [m.limits.nearVergence, "近界", "#448b98"],
    [
      m.limits.farVergence,
      p.focusVergence === m.limits.farVergence ? "" : "远界",
      "#448b98",
    ],
  ])
    if (label && w >= lo && w <= hi)
      body += `<path d="M${x(w)} 44V212" stroke="${color}" stroke-dasharray="3 4"/><text x="${x(w)}" y="34" text-anchor="${Math.abs(w - lo) < 1e-8 ? "start" : "middle"}">${label}</text>`;
  for (let i = 0; i <= 4; i++) {
    const w = lo + ((hi - lo) * i) / 4;
    body += `<text x="${x(w)}" y="235" text-anchor="middle">${distance(w)}</text>`;
  }
  if (
    p.subjectVergence >= lo &&
    p.subjectVergence <= hi &&
    (m.diameter * 1000) / p.criterionUm <= 3
  )
    body += `<circle cx="${x(p.subjectVergence)}" cy="${y((m.diameter * 1000) / p.criterionUm)}" r="4" fill="#b47b43"/>`;
  return `<svg role="img" aria-label="景深近远界与连续变化的弥散圈" viewBox="0 0 570 267">${body}<text x="285" y="261" text-anchor="middle">物距 · 按倒数距离均匀排布</text></svg>`;
}
export function mount({ element, signal, session }) {
  return experiment({
    element,
    signal,
    session,
    kicker: "景深 · 几何光线与输出判据",
    title: "改变容许弥散圈，景深边界随之改变",
    intro:
      "先保持镜头与对焦位置，只收紧容许直径；再移动物体，比较连续的弥散圈与标出的近、远界。曲线没有突然清晰或模糊的断点。",
    controls: [
      {
        key: "focalLength",
        label: "薄透镜焦距",
        min: 24,
        max: 100,
        step: 1,
        value: 35,
        format: (x) => `${x} mm`,
      },
      {
        key: "apertureEV",
        label: "景深光圈",
        min: 1,
        max: 5,
        step: 0.25,
        value: 2,
        format: (x) => `f/${(2 ** x).toFixed(2)}`,
      },
      {
        key: "criterionUm",
        label: "容许弥散圈直径",
        min: 5,
        max: 50,
        step: 1,
        value: 20,
        format: (x) => `${x} µm`,
      },
      {
        key: "focusVergence",
        label: "景深对焦距离",
        min: 0,
        max: 4,
        step: "any",
        value: 0.2,
        format: distance,
      },
      {
        key: "subjectVergence",
        label: "探测物体距离",
        min: 0,
        max: 8,
        step: "any",
        value: 0.25,
        format: distance,
      },
    ],
    presets: [
      {
        label: "35 mm 例子",
        values: {
          focalLength: 35,
          apertureEV: 2,
          criterionUm: 20,
          focusVergence: 0.2,
          subjectVergence: 0.25,
        },
      },
      { label: "收紧到 10 µm", values: { criterionUm: 10 } },
      {
        label: "对焦超焦距",
        values: (s) => ({
          focusVergence: 1000 / numericalLimits(params(s)).hyperfocal,
        }),
      },
      {
        label: "探测近界",
        values: (s) => ({
          subjectVergence: numericalLimits(params(s)).nearVergence,
        }),
      },
      {
        label: "探测远界",
        values: (s) => ({
          subjectVergence: numericalLimits(params(s)).farVergence,
        }),
      },
      { label: "物体在无穷远", values: { subjectVergence: 0 } },
      { label: "对焦无穷远", values: { focusVergence: 0 } },
    ],
    content: `<style>.actions button{font-size:11px;padding:4px 8px}.truth{font-size:11px;border:1px solid #9caea244;border-radius:6px;padding:12px;margin:14px 0}.stats strong{font-size:20px}.criterion{font-weight:400}.disc-row{display:flex;gap:16px;align-items:center;margin:16px 0}.disc-row svg{width:120px;max-width:35%;height:auto;flex-shrink:0}.disc-row p{font-size:12px}.chart text{font-size:11px}@media(max-width:550px){.chart text{font-size:17px}.stats{grid-template-columns:1fr}.stats>div{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.stats strong{font-size:18px}}</style><div class="stats" data-stats></div><div class="chart" data-chart></div><div class="disc-row" data-disc></div><p class="criterion" data-reading aria-live="polite"></p><div class="truth" data-truth></div>`,
    note: "空气中正薄透镜，光阑与透镜共面，物距从透镜量起。近远界和超焦距用两条孔径边缘光线的像面间距作二分求解，另与式(16.2a)—(16.4)解析值比较。∞采用零入射倾角的平行束边界。图横轴采用倒数距离，纵轴是弥散圈相对容许直径；探测物体可能位于局部曲线图外，数值仍完整报告。光斑仅为均匀几何圆盘，不含衍射、像差或锐化，容许值由读者指定。",
    update(root, s) {
      const m = depthOfField(params(s)),
        { limits: l, truth: t, p } = m;
      root.querySelector("[data-stats]").innerHTML = [
        ["景深近界", mmToM(l.near), "边缘光线二分求解"],
        ["景深远界", mmToM(l.far), "∞表示无限远仍满足判据"],
        ["超焦距 H", mmToM(l.hyperfocal), `包含 +f 的精确近轴式`],
      ]
        .map(
          ([a, b, c]) =>
            `<div><small>${a}</small><strong>${b}</strong><em>${c}</em></div>`,
        )
        .join("");
      root.querySelector("[data-chart]").innerHTML = graph(m);
      const extent = Math.max(p.criterionUm * 2, m.diameter * 1000 * 1.15),
        scale = 48 / extent;
      root.querySelector("[data-disc]").innerHTML =
        `<svg role="img" aria-label="弥散圈与容许直径的同尺度比较" viewBox="0 0 120 120"><circle cx="60" cy="60" r="${(m.diameter * 1000 * scale) / 2}" fill="#b47b43" fill-opacity=".32" stroke="#b47b43"/><circle cx="60" cy="60" r="${(p.criterionUm * scale) / 2}" fill="none" stroke="#448b98" stroke-dasharray="4 3"/><circle cx="60" cy="60" r="1" fill="currentColor"/></svg><p>物体 ${distance(p.subjectVergence)}：实际直径 <strong>${(m.diameter * 1000).toFixed(6)} µm</strong><br>虚线直径 ${p.criterionUm} µm；两个圆采用同一尺度。</p>`;
      root.querySelector("[data-reading]").textContent = m.acceptable
        ? `当前物体满足 ${p.criterionUm} µm 判据。传感器位置 ${m.sensor.toFixed(6)} mm。`
        : `当前物体超出 ${p.criterionUm} µm 判据。几何光束仍连续变化，传感器位置 ${m.sensor.toFixed(6)} mm。`;
      root.querySelector("[data-truth]").textContent =
        `独立解析对照：近界 ${mmToM(t.near)}，远界 ${mmToM(t.far)}，H=${mmToM(t.hyperfocal)}。近界数值差 ${Math.abs(l.near - t.near).toExponential(2)} mm；当前弥散圈解析值 ${(m.analyticBlur * 1000).toFixed(6)} µm，逐线值 ${(m.diameter * 1000).toFixed(6)} µm。对焦 H 时近界恰为 H/2、远界为∞；对焦∞时近界为 H−f。`;
    },
  });
}
