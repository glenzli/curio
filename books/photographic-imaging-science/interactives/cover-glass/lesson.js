import { plateExperiment, rayAt, FOCUS, PLATE_FRONT, MODES } from "./model.js";
import { control, curve, number, grid } from "../common/lesson-view.js";

const base = { thickness: 2, index: 1.52, fNumber: 1.4, focusMode: 0, sensorShift: 0 };
const teal = "#287e92", amber = "#ad6c2d", purple = "#8a659c";

function diagram(m) {
  const x = (z) => 60 + (630 * z) / 54,
    y = (h) => 210 - (120 * h) / 22,
    front = x(PLATE_FRONT), back = x(PLATE_FRONT + m.p.thickness),
    sensor = x(FOCUS + m.sensorShift);
  let body = `<path d="M60 210H690" stroke="currentColor" opacity=".25"/>${m.p.thickness > 0 ? `<rect x="${front}" y="78" width="${back - front}" height="264" fill="#78aab8" fill-opacity=".2" stroke="#478999"/>` : ""}<path d="M${x(FOCUS)} 88V342" stroke="#777" stroke-dasharray="5 4"/><path d="M${sensor} 88V342" stroke="${purple}" stroke-width="3"/>`;
  for (const k of [-1, -0.5, 0, 0.5, 1]) {
    const r = rayAt(k * m.radius, m.p),
      color = Math.abs(k) === 1 ? teal : Math.abs(k) === 0.5 ? amber : "#777";
    body += `<path d="M${x(0)} ${y(r.height)}L${front} ${y(r.atFront)}L${back} ${y(r.atBack)}L${x(54)} ${y(r.at(54))}" fill="none" stroke="${color}" stroke-width="2"/>`;
  }
  body += `<path d="M60 ${y(m.radius)}V${y(-m.radius)}" stroke="currentColor" stroke-width="3"/><text x="60" y="48">给定会聚光束</text><text x="${front}" y="48" text-anchor="middle">${m.p.thickness > 0 ? "平行平板" : "平板已移除"}</text><text x="690" y="73" text-anchor="end" fill="${purple}">当前像面</text><text x="60" y="370">参考瞳面 z=0</text><text x="690" y="370" text-anchor="end">无板焦点 z=50 mm（灰虚线）</text><text x="370" y="405" text-anchor="middle">z / mm：0 → 54；y / mm：−22 → +22；横纵比例不同</text><text x="370" y="436" text-anchor="middle">颜色区分瞳高；所有实线均为同一单色光的实际传播</text>`;
  return `<svg class="drawing" role="img" aria-label="理想会聚光束通过法向平行平板后到达像面" viewBox="0 0 740 460"><style>text{font-family:inherit;fill:currentColor}</style>${body}</svg>`;
}

function focusWindow(m) {
  // The whole permitted plate range fits in this fixed air-space viewport.
  // In particular, neither the horizontal nor vertical scale follows refocus.
  const x = (z) => 60 + (630 * (z - 49.8)) / 2.8,
    y = (height) => 220 - 140 * height;
  let rays = "";
  for (const k of [-1, -0.5, 0, 0.5, 1]) {
    const r = rayAt(k * m.radius, m.p),
      color = Math.abs(k) === 1 ? teal : Math.abs(k) === 0.5 ? amber : "#777";
    if (Math.abs(k) === 1)
      rays += `<path d="M${x(49.8)} ${y(r.slope * (49.8 - FOCUS))}L${x(52.6)} ${y(r.slope * (52.6 - FOCUS))}" fill="none" stroke="#aaa" stroke-width="1.3" stroke-dasharray="5 4"/>`;
    rays += `<path d="M${x(49.8)} ${y(r.at(49.8))}L${x(52.6)} ${y(r.at(52.6))}" fill="none" stroke="${color}" stroke-width="2"/>`;
    if (k !== 0)
      rays += `<circle cx="${x(r.focus)}" cy="220" r="3" fill="${color}"/>`;
  }
  const frame = `<rect x="60" y="80" width="630" height="280" fill="none" stroke="currentColor" opacity=".18"/><path d="M60 220H690" stroke="currentColor" opacity=".18"/><path d="M${x(FOCUS)} 80V360" stroke="#777" stroke-dasharray="5 4"/><path d="M${x(FOCUS + m.sensorShift)} 80V360" stroke="${purple}" stroke-width="3"/>`;
  const ticks = [50, 50.7, 51.4, 52, 52.6].map((z, j, all) =>
    `<path d="M${x(z)} 360v6" stroke="currentColor"/><text x="${x(z)}" y="386" text-anchor="${j === all.length - 1 ? "end" : "middle"}" font-size="15">${z}</text>`,
  ).join("");
  return `<svg class="drawing" role="img" aria-label="固定尺度焦点局部放大：无板焦点、当前像面和各瞳高交轴点" viewBox="0 0 740 470"><style>text{font-family:inherit;fill:currentColor}</style><text x="30" y="28">焦点附近放大 · 固定坐标</text><text x="${x(FOCUS)}" y="61" text-anchor="middle" font-size="16">无板焦点</text><text x="690" y="61" text-anchor="end" font-size="16">紫线：当前像面 z=${number(FOCUS + m.sensorShift, 3)} mm</text>${frame}<svg x="60" y="80" width="630" height="280" viewBox="60 80 630 280" overflow="hidden">${rays}</svg>${ticks}<text x="48" y="86" text-anchor="end" font-size="13">+1000</text><text x="48" y="225" text-anchor="end" font-size="13">0</text><text x="48" y="361" text-anchor="end" font-size="13">−1000</text><text x="370" y="418" text-anchor="middle" font-size="16">z / mm：49.8 → 52.6；y / μm：−1000 → +1000</text><text x="370" y="447" text-anchor="middle" font-size="16">横纵比例不同；圆点为非轴上光线的交轴位置，灰虚线为无板参照</text></svg>`;
}

export const spec = {
  title: "盖玻璃：焦点后移与残余球差",
  alt: "互动示意：平行平板的焦点后移、重新对焦与残余子午几何展宽",
  intro: "从2 mm、n=1.52、入射锥f/1.4开始。先移除平板，再恢复并选择近轴或最小子午RMS重新对焦。下方分别用固定尺度显示整体离焦和重新对焦后的剩余展宽。",
  staticCaption: "理想光束原在z=50 mm会聚；平板前表面z=42 mm，厚2 mm，n=1.52。81条等权子午光线，入射锥N=1.4；当前像面未移动。",
  note: "N=L/(2a)只定义此入射锥；未建模实际镜头。81个固定归一化瞳高等权，缩光圈时只缩放高度，RMS是子午落点标准差，不是二维PSF或衍射分辨率。忽略色散、反射与吸收。最小子午RMS由当前这些光线定义，不等于最小波前RMS或最大Strehl。",
  controls: [
    control("thickness", "平板厚度", 0, 4, 0.1, 2, " mm", 1),
    control("index", "平板折射率", 1, 1.9, 0.01, 1.52, "", 2),
    control("fNumber", "入射锥 N=L/(2a)", 1.2, 8, 0.1, 1.4, "", 1),
    { ...control("focusMode", "像面选择", 0, 3, 1, 0), format: (v) => MODES[Math.round(v)] },
    {
      ...control("sensorShift", "手动像面后移", -0.1, 2.5, 0.001, 0, " mm", 3),
      enabled: (s) => s.focusMode === 3,
      hint: (s) => s.focusMode === 3 ? "从无板焦点z=50 mm量起" : "选择“手动像面”后启用；当前像面由所选规则确定",
    },
  ],
  presets: [
    { label: "2 mm · 原像面", values: { ...base } },
    { label: "移除平板", values: { ...base, thickness: 0 } },
    { label: "1 mm · 与原例比较", values: { ...base, thickness: 1 } },
    { label: "f/5.6 · 与原例比较", values: { ...base, fNumber: 5.6 } },
    { label: "近轴重新对焦", values: { ...base, focusMode: 1 } },
    { label: "最小子午RMS", values: { ...base, focusMode: 2 } },
    { label: "n=1的边界", values: { ...base, index: 1 } },
  ],
  evaluate(s) {
    const m = plateExperiment(s),
      normalized = m.rays.map((r) => r.height / m.radius),
      fan = (heights) => heights.map((h, j) => [normalized[j], 1000 * h]);
    return {
      figure: `<svg class="drawing" role="img" aria-label="平行平板的全程光路与固定尺度焦点放大" viewBox="0 0 740 930">${diagram(m).replace("<svg ", '<svg x="0" y="0" width="740" height="460" ')}${focusWindow(m).replace("<svg ", '<svg x="0" y="460" width="740" height="470" ')}</svg>`,
      liveFigure: diagram(m) + focusWindow(m), figureHeight: 930, figureMinWidth: 620,
      panels: [
        {
          title: "当前像面：子午光线落点（固定±1000 μm）",
          xMin: -1, xMax: 1, yMin: -1000, yMax: 1000,
          xLabel: "归一化入射瞳高 y₀/a", yLabel: "几何落点 y / μm",
          curves: [curve("当前像面", fan(m.current.heights), 0)],
        },
        {
          title: "同一光束移到最小子午RMS面后（固定±40 μm）",
          xMin: -1, xMax: 1, yMin: -40, yMax: 40,
          xLabel: "归一化入射瞳高 y₀/a", yLabel: "剩余几何落点 y / μm",
          curves: [curve("只移动像面后的残差", fan(m.refocused.heights), 2)],
        },
        {
          title: "各瞳高的焦点相对近轴焦点再后移多少",
          xMin: 0, xMax: 1, yMin: 0, yMax: 160,
          xLabel: "归一化入射瞳高 |y₀|/a", yLabel: "Δ(i) − Δ₀ / μm",
          curves: [curve("精确Snell焦点差", grid(0, 1, (u) => 1000 * (rayAt(u * m.radius, s).shift - m.paraxialShift)), 1)],
        },
      ],
      stats: [
        ["近轴后移 Δ₀", `${number(1000 * m.paraxialShift, 2)} μm`, "t(1−1/n)"],
        ["边缘比近轴再后移", `${number(1000 * (m.marginalShift - m.paraxialShift), 2)} μm`, "固定入射锥下的纵向球差"],
        ["当前像面后移", `${number(1000 * m.sensorShift, 2)} μm`, MODES[s.focusMode]],
        ["当前子午RMS / 跨度", `${number(1000 * m.current.rms, 2)} / ${number(1000 * m.current.span, 2)} μm`, "81条固定等权光线的落点"],
        ["重新对焦后RMS / 跨度", `${number(1000 * m.refocused.rms, 2)} / ${number(1000 * m.refocused.span, 2)} μm`, `最小子午RMS面后移${number(1000 * m.bestShift, 2)} μm`],
        ["独立向量Snell落点差", `${m.referenceError.toExponential(2)} mm`, "两界面方向与坐标分别追迹"],
      ],
      reading: `${s.thickness === 0 ? "平板已移除，全部光线仍在原焦点z=50 mm会聚，没有新增焦移或球差。" : s.index === 1 ? "平板与周围空气折射率相同，光线方向和会聚位置保持，没有新增焦移或球差。" : `平板内折射角小于入射角，光线晚一些到达光轴。近轴光后移${number(1000 * m.paraxialShift, 2)} μm，边缘光后移${number(1000 * m.marginalShift, 2)} μm。移动像面可减小整体离焦，但各瞳高的焦点并不重合。`}两幅落点图纵轴范围不同，各自固定：第一幅±1000 μm，第二幅±40 μm；数值宽度始终以μm读取。厚度与光圈预设都回到原例后再改变所标条件，适合与“2 mm · 原像面”成对比较；保留自选参数时请直接拖动对应控件。真实相机须将整套滤镜、材料及镜头共同纳入设计。`,
    };
  },
};
