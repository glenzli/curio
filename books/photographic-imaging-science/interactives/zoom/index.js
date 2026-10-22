import { thinGroup } from "../common/optics-drawing.js";
import { experiment, plot, legend } from "../common/ui.js";
import { zoomSystem, compensationTruth, SENSOR } from "./model.js";
const blue = "#448b98",
  gold = "#b47b43",
  purple = "#8b78aa";
const mm = (v) => (v === null ? "无有限值" : `${v.toFixed(3)} mm`);
export function rayDiagram(m) {
  const p = m.active,
    x = (z) => 40 + ((z + 15) / 230) * 440;
  const bound = Math.max(
    0.75,
    ...m.rays.flatMap((r) => [
      Math.abs(r.height),
      Math.abs(r.y2),
      Math.abs(r.y3),
      Math.abs(r.detector),
    ]),
  );
  const y = (h) => 145 - (h / bound) * 65;
  let out = `<text x="40" y="18">平行入射；横、纵坐标比例不同</text><path d="M40 145H480" stroke="currentColor" opacity=".2"/>`;
  m.rays.forEach((r, i) => {
    out += `<path d="M${x(-15)} ${y(r.height)}L${x(0)} ${y(r.height)}L${x(p.variator)} ${y(r.y2)}L${x(p.compensator)} ${y(r.y3)}L${x(SENSOR)} ${y(r.detector)}" fill="none" stroke="${i % 2 ? gold : blue}" stroke-width="1.5" opacity="${i === 2 ? 0.3 : 0.85}"/>`;
  });
  for (const [z, label, color, row] of [
    [0, "固定前组 +10 D", blue, 44],
    [p.variator, "变倍组 −20 D", gold, 64],
    [p.compensator, "补偿组 +20 D", blue, 44],
    [SENSOR, "固定像面", purple, 64],
  ])
    out += (z===SENSOR?`<path d="M${x(z)} 88V220" stroke="${color}" stroke-width="3"/>`:thinGroup(x(z),154,66,z===0?10:z===p.variator?-20:20,color))+`<text x="${x(z)}" y="${row}" text-anchor="${z === 0 ? "start" : z === SENSOR ? "end" : "middle"}">${label}</text>`;
  for (const z of [0, 50, 100, 150, 200])
    out += `<text x="${x(z)}" y="243" text-anchor="middle">${z}</text>`;
  out += `<text x="260" y="267" text-anchor="middle">轴向位置 z / mm</text>`;
  return `<svg role="img" aria-label="三组变焦光线与固定在200毫米的像面" viewBox="0 0 520 275">${out}</svg>`;
}
export function mount({ element, signal, session }) {
  const design = Array.from({ length: 121 }, (_, i) => {
    const v = 10 + i * 0.5;
    return [v, compensationTruth(v)[0]];
  }).filter((p) => p[1] !== undefined);
  return experiment({
    element,
    signal,
    session,
    kicker: "变焦 · 固定像面与移动镜组",
    title: "改变焦距后，把光线重新聚到原来的像面",
    intro:
      "先锁住补偿组，只移动变倍组；再打开自动补偿，比较第三组的轨迹、总焦距和像面上的光束跨度。前组与像面始终固定。",
    controls: [
      {
        key: "variator",
        label: "变倍组位置",
        min: 10,
        max: 70,
        step: 0.5,
        value: 20,
        format: (v) => `${v.toFixed(1)} mm`,
      },
      {
        key: "compensator",
        label: "手动补偿组位置",
        min: 90,
        max: 190,
        step: "any",
        value: 150,
        format: (v) => `${v.toFixed(3)} mm`,
      },
    ],
    presets: [
      {
        label: "自动补偿",
        values: (s) =>
          s.auto
            ? { auto: false, compensator: zoomSystem(s).active.compensator }
            : { auto: true },
      },
      { label: "变倍组 20 mm", values: { variator: 20 } },
      { label: "变倍组 50 mm", values: { variator: 50 } },
      { label: "变倍组 60 mm", values: { variator: 60 } },
      { label: "行程内无解", values: { variator: 70, auto: true } },
    ],
    content: `<style>.actions button{font-size:11px;padding:4px 8px}.controls{grid-template-columns:1fr 1fr}.zoom-ray svg,.zoom-plot svg{width:100%;height:auto;display:block}.zoom-ray text,.zoom-plot text{fill:currentColor;font:11px ui-sans-serif,sans-serif}.zoom-bottom{display:grid;grid-template-columns:1.1fr 1fr;gap:20px;align-items:start}.zoom-bottom>div{min-width:0}.truth{font-size:11px;line-height:1.9;border:1px solid #9caea255;border-radius:6px;padding:12px 14px;margin:14px 0}.stats strong{font-size:20px}.status{font-size:12px;line-height:1.85}@media(max-width:650px){.zoom-bottom{grid-template-columns:1fr}.controls{grid-template-columns:1fr}.stats{gap:6px}.stats strong{font-size:16px}.stats small,.stats em{font-size:9px}.zoom-ray text{font-size:13px}}</style><p class="status" data-mode></p><div class="stats" data-stats></div><div class="zoom-ray" data-rays></div><p class="reading" data-reading aria-live="polite"></p><div class="zoom-bottom"><div><div class="zoom-plot" data-trajectory></div><div class="legend" data-key></div></div><div class="truth" data-truth></div></div>`,
    note: "三薄组空气模型，光焦度固定为 +10、−20、+20 D；前组 z=0，像面 z=200 mm。变倍组行程10…70 mm，补偿组90…190 mm。自动模式只在该行程内用逐面追迹的像面高度求根；找不到根时显示手动位置，明确停止自动补偿。五条轴上平行光线在前组取高度±0.5 mm；跨度只表示几何离焦，不包含衍射、像差、光阑、机械截光或真实凸轮机构。",
    update(root, state) {
      const m = zoomSystem(state),
        p = m.active;
      root.querySelector('input[aria-label="手动补偿组位置"]').disabled =
        !!state.auto;
      [...root.querySelectorAll(".actions button")][0].textContent = state.auto
        ? "锁住补偿组"
        : "自动补偿";
      root.querySelector("[data-mode]").textContent = state.auto
        ? m.compensated
          ? `自动补偿：第三组 z=${mm(p.compensator)}；手动滑块暂不参与。`
          : `行程内没有合焦解；自动补偿停止。光路按手动位置 z=${mm(p.compensator)} 显示，离焦读数保留。`
        : `手动模式：补偿组 z=${mm(p.compensator)}。`;
      root.querySelector("[data-stats]").innerHTML = [
        ["当前有效焦距", mm(m.focalLength), "从主平面量起"],
        [
          m.imageZ !== null && m.imageZ < p.compensator ? "出射束虚交点 z" : "平行光近轴像面 z",
          mm(m.imageZ),
          m.imageZ !== null && m.imageZ < p.compensator ? "仅反向延长交点；固定像面在200 mm" : "固定像面始终位于200 mm",
        ],
        [
          "固定像面光束跨度",
          `${(m.spread * 1000).toFixed(3)} µm`,
          "同一束五条几何光线",
        ],
      ]
        .map(
          ([a, b, c]) =>
            `<div><small>${a}</small><strong>${b}</strong><em>${c}</em></div>`,
        )
        .join("");
      root.querySelector("[data-rays]").innerHTML = rayDiagram(m);
      const curves = [
        { name: "解析补偿轨迹", color: blue, points: design },
        {
          name: "当前补偿组位置",
          color: gold,
          dashed: true,
          points: [
            [10, p.compensator],
            [70, p.compensator],
          ],
        },
      ];
      root.querySelector("[data-trajectory]").innerHTML = plot({
        curves,
        samples: m.solved === null ? [] : [[state.variator, m.solved]],
        markers: [
          {
            value: state.variator,
            label: `v=${state.variator}`,
            color: purple,
          },
        ],
        xMin: 10,
        xMax: 70,
        yMin: 90,
        yMax: 190,
        xLabel: "变倍组位置 / mm",
        yLabel: "补偿组位置 / mm",
        title: "解析补偿轨迹与逐面求根的当前位置",
        width: 432,
        leftPadding: 46,
        rightPadding: 24,
      });
      root.querySelector("[data-key]").innerHTML =
        legend(curves) +
        `<span><i style="border-color:#9b703c;border-top-style:dotted"></i>逐面求根</span>`;
      root.querySelector("[data-reading]").textContent = (m.imageZ !== null && m.imageZ < p.compensator
        ? "当前出射束发散，所列虚交点来自反向延长，不是光线实际会聚的像面。"
        : "") + (m.compensated
        ? "补偿组沿非直线轨迹移动，把最佳像面留在200 mm。焦距仍在变化，补偿的是像面位置。"
        : m.solved === null
          ? "这组光焦度与行程不能覆盖当前变倍组位置。扩大变焦范围需要重新选择结构或运动范围。"
          : "当前没有自动移动第三组。对照曲线上的求解点，可以看到还需要怎样调整补偿组。");
      const truth = m.analytic[0] ?? null;
      root.querySelector("[data-truth]").innerHTML =
        `<strong>独立对照</strong><br>逐面追迹求根 c=${mm(m.solved)}；二次方程解析根 c=${mm(truth)}。${truth === null ? "两条路径均无行程内解。" : `位置差 ${Math.abs(m.solved - truth).toExponential(2)} mm。`}<br>当前总矩阵传播到固定像面的 A=${m.detectorMatrix[0].toFixed(9)}；轴上平行光合焦要求 A=0。<br>系统矩阵 AD−BC=${m.determinant.toFixed(9)}。中段 v=50 mm 时二次项退化，解析真值为 c=150 mm、f=100 mm。`;
    },
  });
}
