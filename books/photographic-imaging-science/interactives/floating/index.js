import { thinGroup } from "../common/optics-drawing.js";
import { experiment, plot, legend } from "../common/ui.js";
import { replay } from "../common/replay.js";
import { focusSystem, floatingTruth } from "./model.js";
const blue = "#448b98",
  gold = "#b47b43",
  purple = "#8b78aa";
const distance = (w) => (w === 0 ? "∞" : `${(1 / w).toFixed(3)} m`);
const percent = (v) => (Math.abs(v) < 0.005 ? 0 : v).toFixed(2);
const mm = (x) => `${x.toFixed(3)} mm`;

export function diagram(m) {
  const { v, c } = m.active,
    x = (z) => 44 + z * 2.1;
  const extent = Math.max(
      0.6,
      ...m.rays.flatMap((r) => [
        Math.abs(r.height),
        Math.abs(r.y2),
        Math.abs(r.y3),
        Math.abs(r.detector),
      ]),
    ),
    y = (h) => 140 - (h * 58) / extent;
  let s =
    '<text x="44" y="17">轴上物点的五条光线；横纵比例不同</text><path d="M44 140H464" stroke="currentColor" opacity=".2"/>';
  for (const [i, r] of m.rays.entries())
    s += `<path d="M${x(0)} ${y(r.height)}L${x(v)} ${y(r.y2)}L${x(c)} ${y(r.y3)}L${x(200)} ${y(r.detector)}" stroke="${i % 2 ? gold : blue}" fill="none" stroke-width="1.4"/>`;
  for (const [z, label, color, row] of [
    [0, "前组 / 光阑", blue, 43],
    [v, "组 2 −20 D", gold, 65],
    [c, "组 3 +20 D", blue, 43],
    [200, "固定像面", purple, 65],
  ])
    s += (z===200?`<path d="M${x(z)} 85V208" stroke="${color}" stroke-width="3"/>`:thinGroup(x(z),146.5,61.5,z===0?10:z===v?-20:20,color))+`<text x="${x(z)}" y="${row}" text-anchor="${z === 0 ? "start" : z === 200 ? "end" : "middle"}">${label}</text>`;
  for (const z of [0, 50, 100, 150, 200])
    s += `<text x="${x(z)}" y="232" text-anchor="middle">${z}</text>`;
  return `<svg role="img" aria-label="浮动对焦的镜组位置和固定像面" viewBox="0 0 510 259">${s}<text x="255" y="254" text-anchor="middle">z / mm</text></svg>`;
}
function background(m, label) {
  if (!m.solved)
    return `<div class="background"><h4>${label}</h4><p>行程内没有双约束解，停止显示补偿后的标尺。</p></div>`;
  let s = "";
  for (let i = -3; i <= 3; i++) {
    const reference = 150 + i * 35,
      actual = 150 + (i * 35 * m.scale) / 100;
    s += `<path d="M${reference} 20V82" stroke="currentColor" opacity=".3" stroke-dasharray="3 4"/><path d="M${actual} 30V72" stroke="${blue}" stroke-width="3"/>`;
  }
  return `<div class="background"><h4>${label}</h4><svg role="img" aria-label="${label}时固定远景方向的像面标尺" viewBox="0 0 300 100">${s}</svg><p>角尺度 ${mm(m.scale)} / rad<br>相对无穷远 ${percent(m.breathingPercent)}%</p></div>`;
}
export function mount({ element, signal, session }) {
  const trajectory = Array.from({ length: 126 }, (_, i) => {
    const w = i * 0.02,
      p = floatingTruth(w)[0];
    return [w, p];
  });
  return experiment({
    element,
    signal,
    session,
    kicker: "对焦 · 两个移动组与远景尺度",
    title: "浮动对焦与画面尺度补偿",
    intro:
      "从无穷远拉焦到近处，比较只移动后组与两组协同。下方标尺始终代表同一组远景方向，虚线保留无穷远时的位置。",
    controls: [
      {
        key: "vergence",
        label: "目标对焦距离",
        min: 0,
        max: 2.5,
        step: "any",
        value: 1,
        format: distance,
        numeric: { toInput: (v) => 1 / v, fromInput: (v) => 1 / v, infinity: 0, step: "any", unit: "m" },
      },
      {
        key: "manualV",
        label: "手动组 2 位置",
        min: 10,
        max: 70,
        step: 0.25,
        value: 50,
        format: mm,
        enabled: (s) => (s.mode ?? "rear") === "manual",
      },
      {
        key: "manualC",
        label: "手动组 3 位置",
        min: 90,
        max: 190,
        step: 0.25,
        value: 150,
        format: mm,
        enabled: (s) => (s.mode ?? "rear") === "manual",
      },
      {
        key: "directionMrad",
        label: "固定远景方向",
        min: -15,
        max: 15,
        step: 0.5,
        value: 5,
        format: (v) => `${v.toFixed(1)} mrad`,
      },
    ],
    presets: [
      { label: "仅后组对焦", values: { mode: "rear" } },
      { label: "两组协同", values: { mode: "floating" } },
      { label: "手动镜组", values: { mode: "manual" } },
      { label: "无穷远", values: { vergence: 0 } },
      { label: "对焦 1 m", values: { vergence: 1 } },
      { label: "对焦 0.5 m", values: { vergence: 2 } },
      {
        label: "协同行程末端",
        values: { vergence: 2.34754650589867, mode: "floating" },
      },
      { label: "协同行程不足", values: { vergence: 2.5, mode: "floating" } },
    ],
    content: `<style>.actions button{font-size:11px;padding:4px 8px}.actions button[aria-pressed="true"]{background:#448b981c;border-color:#448b98}.controls{grid-template-columns:1fr 1fr}.optics svg{display:block;width:100%;height:auto}.optics text{fill:currentColor;font:11px ui-sans-serif,sans-serif}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}.background{border:1px solid #9caea244;border-radius:6px;padding:12px;min-width:0}.background h4{font-size:12px;margin:0}.background p{font-size:11px}.truth{font-size:11px;border:1px solid #9caea244;border-radius:6px;padding:12px;margin:14px 0}.stats strong{font-size:19px}.status{font-size:12px}@media(max-width:600px){.pair,.controls{grid-template-columns:1fr}.stats{grid-template-columns:1fr}.stats>div{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.stats strong{font-size:18px}.optics text{font-size:16px}.chart text{font-size:18px}.chart svg>text:nth-last-of-type(2){transform:translateY(6px)}.chart svg>text:last-of-type{transform:translateY(-6px)}}</style><p class="status" data-mode aria-live="polite"></p><div class="stats" data-stats></div><div class="optics" data-rays></div><div class="pair optics" data-background></div><p class="reading" data-reading></p><div class="chart" data-trajectory></div><div class="legend" data-key></div><div class="truth" data-truth></div>`,
    note: "三薄组空气模型，光焦度 +10、−20、+20 D；前组与光阑固定在 z=0，传感器固定在200 mm。组2行程10…70 mm，组3行程90…190 mm。物距从固定前组量起。协同模式同时求有限物点合焦与远景角尺度100 mm/rad，两者均从逐面追迹求解；这只是浮动运动的两个一阶约束，不模拟球差、场曲或实际近摄校正。固定远景在近对焦时会离焦，标尺只画其点像中心，不代表清晰细节。播放仅演示组位置变化，约8秒走完倒数距离刻度，离开视区暂停。",
    update(root, state) {
      const m = focusSystem(state),
        rear = focusSystem({ ...state, mode: "rear" }),
        dual = focusSystem({ ...state, mode: "floating" }),
        manual = (state.mode ?? "rear") === "manual";
      for (const label of ["手动组 2 位置", "手动组 3 位置"])
        root.querySelector(`input[aria-label="${label}"]`).disabled = !manual;
      const modes = {
        仅后组对焦: "rear",
        两组协同: "floating",
        手动镜组: "manual",
      };
      for (const b of root.querySelectorAll(".actions button"))
        if (modes[b.textContent])
          b.setAttribute(
            "aria-pressed",
            String((state.mode ?? "rear") === modes[b.textContent]),
          );
      root.querySelector("[data-mode]").textContent = manual
        ? `手动位置：组2 ${mm(m.active.v)}，组3 ${mm(m.active.c)}；下方保留实际离焦。`
        : m.solved
          ? `${m.mode === "rear" ? "仅后组对焦" : "两组协同"}：组2 ${mm(m.active.v)}，组3 ${mm(m.active.c)}。`
          : `给定行程内无解，自动运动停止。光路回到手动位置，未沿用上次求解结果。`;
      root.querySelector("[data-stats]").innerHTML = [
        ["当前有效焦距", mm(m.focalLength), "从主平面量起"],
        [
          "固定远景点像中心",
          mm(m.chief.detector),
          `${state.directionMrad.toFixed(1)} mrad 方向`,
        ],
        [
          "轴上合焦光束跨度",
          `${(m.spread * 1000).toFixed(6)} µm`,
          "固定像面 z=200 mm",
        ],
      ]
        .map(
          ([a, b, c]) =>
            `<div><small>${a}</small><strong>${b}</strong><em>${c}</em></div>`,
        )
        .join("");
      root.querySelector("[data-rays]").innerHTML = diagram(m);
      root.querySelector("[data-background]").innerHTML =
        background(rear, "仅后组对焦") + background(dual, "两组协同");
      root.querySelector("[data-reading]").textContent =
        `当前角尺度 ${mm(m.scale)} / rad，相对基准 ${percent(m.breathingPercent)}%。焦距、合焦与远景尺度分别读数；两组协同时，即使尺度保持，有效焦距仍会变化。`;
      const curves = [
        {
          name: "解析组2位置",
          color: gold,
          points: trajectory.filter((p) => p[1]).map(([w, p]) => [w, p.v]),
        },
        {
          name: "解析组3位置",
          color: blue,
          points: trajectory.filter((p) => p[1]).map(([w, p]) => [w, p.c]),
        },
      ];
      root.querySelector("[data-trajectory]").innerHTML = plot({
        curves,
        xMax: 2.5,
        leftPadding: 70,
        height: 285,
        topPadding: 44,
        bottomPadding: 60,
        yMax: 190,
        xLabel: "物距倒数 / D（0为∞，2为0.5m，2.5为0.4m）",
        yLabel: "z / mm",
        markers: [
          {
            value: state.vergence,
            label: distance(state.vergence),
            color: purple,
          },
        ],
        samples:
          m.mode === "floating" && m.solved
            ? [
                [state.vergence, m.active.v],
                [state.vergence, m.active.c],
              ]
            : [],
        title: "两移动组的协同轨迹与逐面求解点",
      });
      root.querySelector("[data-key]").innerHTML = legend(curves);
      const t = m.truth[0];
      root.querySelector("[data-truth]").textContent =
        `独立对照：矩阵给出 A+B/s=${(m.detector[0] + (m.detector[1] * state.vergence) / 1000).toExponential(3)}，逐面单位高度光线给出 ${m.focusResidual.toExponential(3)}。矩阵B=${m.detector[1].toFixed(9)} mm，逐面角尺度=${m.scale.toFixed(9)} mm/rad。${t ? `双约束的独立二次方程解：组2 ${mm(t.v)}，组3 ${mm(t.c)}。${m.mode === "floating" && m.solved ? `位置差 ${Math.hypot(t.v - m.active.v, t.c - m.active.c).toExponential(2)} mm。` : ""}` : "独立消元也未找到行程内的双约束解。"} AD−BC=${m.determinant.toFixed(9)}。`;
    },
    setup: (context) =>
      replay({
        ...context,
        element,
        signal,
        key: "vergence",
        start: 0,
        end: 2,
        label: "播放拉焦",
        enabled: (state) => (state.mode ?? "rear") !== "manual",
      }),
  });
}
