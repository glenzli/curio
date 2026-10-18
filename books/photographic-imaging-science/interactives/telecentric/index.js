import { thinGroup } from "../common/optics-drawing.js";
import { experiment, plot, legend } from "../common/ui.js";
import { relaySystem, relayTruth, F1, F2, STOP_RADIUS } from "./model.js";
const blue = "#448b98",
  gold = "#b47b43",
  purple = "#8b78aa";
const fixed = (v, n = 3) => (Math.abs(v) < 1e-10 ? 0 : v).toFixed(n);
const pupil = (v) => (v === null ? "无穷远" : `z=${fixed(v)} mm`);
export function diagram(p, m) {
  const s = F1 + p.objectOffset,
    v = F2 + p.imageOffset;
  const left = -s - 12,
    right = p.gap + v + 15,
    x = (z) => 35 + ((z - left) / (right - left)) * 450;
  const bound = Math.max(
    1,
    ...m.rays.flatMap((r) => [
      Math.abs(p.height),
      Math.abs(r.y1),
      Math.abs(r.y2),
      Math.abs(r.image),
    ]),
  );
  const y = (h) => 150 - (h / bound) * 68;
  let out = `<text x="35" y="18">穿过光阑中心的是主光线；横、纵比例不同</text><path d="M35 150H485" stroke="currentColor" opacity=".2"/>`;
  m.rays.forEach((r, i) => {
    out += `<path d="M${x(-s)} ${y(p.height)}L${x(0)} ${y(r.y1)}L${x(p.stop)} ${y(r.atStop)}L${x(p.gap)} ${y(r.y2)}L${x(p.gap + v)} ${y(r.image)}" fill="none" stroke="${i === 1 ? blue : gold}" stroke-width="${i === 1 ? 2.3 : 1.3}" opacity="${i === 1 ? 1 : 0.65}"/>`;
  });
  out += thinGroup(x(0),153.5,71.5,1000/F1,blue)+thinGroup(x(p.gap),153.5,71.5,1000/F2,blue)+`<path d="M${x(p.stop)} 82V${y(STOP_RADIUS)}M${x(p.stop)} ${y(-STOP_RADIUS)}V225" stroke="${purple}" stroke-width="4"/><path d="M${x(p.gap + v)} 82V225" stroke="${purple}" stroke-width="2" opacity=".6"/><circle cx="${x(-s)}" cy="${y(p.height)}" r="3.5" fill="${blue}"/>`;
  for (const [z, label, row] of [
    [-s, "物点", 43],
    [0, "f₁=50 mm", 61],
    [p.stop, "光阑", 43],
    [p.gap, "f₂=75 mm", 61],
    [p.gap + v, "像面", 43],
  ])
    out += `<text x="${x(z)}" y="${row}" text-anchor="middle">${label}</text>`;
  for (const z of [0, p.stop, p.gap, p.gap + v])
    out += `<text x="${x(z)}" y="246" text-anchor="middle">${fixed(z, 0)}</text>`;
  out += `<text x="260" y="270" text-anchor="middle">轴向位置 z / mm · 第一组位于0</text>`;
  return `<svg role="img" aria-label="两透镜、光阑、主光线及边缘光线构成的远心光路" viewBox="0 0 520 280">${out}</svg>`;
}
export function mount({ element, signal, session }) {
  return experiment({
    element,
    signal,
    session,
    kicker: "远心光路 · 光阑与瞳",
    title: "移动光阑，分别观察两侧的主光线",
    intro:
      "选择物方、像方或双侧远心，再前后移动物面与像面。比较主光线倾角、光束中心高度和离焦跨度；曲线则分别只改变一个平面的位置。",
    controls: [
      {
        key: "stop",
        label: "光阑位置",
        min: 20,
        max: 100,
        step: 1,
        value: 50,
        format: (v) => `${v} mm`,
      },
      {
        key: "gap",
        label: "第二组位置",
        min: 105,
        max: 145,
        step: 1,
        value: 125,
        format: (v) => `${v} mm`,
      },
      {
        key: "objectOffset",
        label: "物面向物方偏移",
        min: -10,
        max: 10,
        step: 1,
        value: 0,
        format: (v) => `${v > 0 ? "+" : ""}${v} mm`,
      },
      {
        key: "imageOffset",
        label: "像面向像方偏移",
        min: -10,
        max: 10,
        step: 1,
        value: 0,
        format: (v) => `${v > 0 ? "+" : ""}${v} mm`,
      },
      {
        key: "height",
        label: "物点高度",
        min: 0,
        max: 2,
        step: 0.1,
        value: 2,
        format: (v) => `${v.toFixed(1)} mm`,
      },
    ],
    presets: [
      {
        label: "普通光路",
        values: { gap: 125, stop: 85, objectOffset: 0, imageOffset: 0 },
      },
      {
        label: "仅物方远心",
        values: { gap: 145, stop: 50, objectOffset: 0, imageOffset: 0 },
      },
      {
        label: "仅像方远心",
        values: { gap: 145, stop: 70, objectOffset: 0, imageOffset: 0 },
      },
      {
        label: "双侧远心",
        values: { gap: 125, stop: 50, objectOffset: 0, imageOffset: 0 },
      },
      { label: "物面远移10 mm", values: { objectOffset: 10 } },
      { label: "像面后移10 mm", values: { imageOffset: 10 } },
      { label: "复位两平面", values: { objectOffset: 0, imageOffset: 0 } },
    ],
    content: `<style>.actions button{font-size:11px;padding:4px 8px}.tele-ray svg,.tele-plot svg{display:block;width:100%;height:auto}.tele-ray text,.tele-plot text{fill:currentColor;font:11px ui-sans-serif,sans-serif}.tele-bottom{display:grid;grid-template-columns:1.15fr 1fr;gap:20px;align-items:start}.tele-bottom>div{min-width:0}.truth{font-size:11px;line-height:1.9;border:1px solid #9caea255;border-radius:6px;padding:12px 14px;margin:14px 0}.stats strong{font-size:20px}.tele-state{font-size:12px;line-height:1.85}.tele-pupils{font-size:11px;line-height:1.9;padding:14px 0}@media(max-width:650px){.tele-bottom{grid-template-columns:1fr}.stats{gap:6px}.stats strong{font-size:16px}.stats small,.stats em{font-size:9px}.tele-ray text{font-size:13px}}</style><p class="tele-state" data-mode></p><div class="stats" data-stats></div><div class="tele-ray" data-rays></div><p class="reading" data-reading aria-live="polite"></p><div class="tele-bottom"><div><div class="tele-plot" data-scan></div><div class="legend" data-key></div><p class="note">两条曲线各自只改变所示平面，另一平面的偏移固定为0；镜组、光阑及物点高度采用当前值。</p></div><div><div class="tele-pupils" data-pupils></div><div class="truth" data-truth></div></div></div>`,
    note: "空气中两薄透镜f₁=50 mm、f₂=75 mm。唯一孔径光阑位于两组之间，半径0.5 mm，无其他机械截光；物面z=−(50+Δs)，像面z=g+75+Δv。主光线穿过光阑中心，边缘光线穿过±0.5 mm。图中镜组竖线不表示实际镜片口径。中心高度比只描述这束对称近轴光线的几何尺度，离焦时不等于清晰图像的分辨率或测量精度；未计算像差、衍射、畸变和传感器角响应。",
    update(root, state) {
      const m = relaySystem(state),
        t = m.truth;
      const mode = t.objectTelecentric
        ? t.imageTelecentric
          ? "双侧远心"
          : "仅物方远心"
        : t.imageTelecentric
          ? "仅像方远心"
          : "两侧均非远心";
      root.querySelector("[data-mode]").textContent =
        `当前结构：${mode}。物方条件为光阑z=50 mm；像方条件为光阑z=g−75 mm=${state.gap - 75} mm。`;
      root.querySelector("[data-stats]").innerHTML = [
        [
          "物方主光线倾角",
          `${fixed(m.chief.angle * 1000)} mrad`,
          "相对物方光轴",
        ],
        ["像方主光线倾角", `${fixed(m.chief.u2 * 1000)} mrad`, "相对像方光轴"],
        [
          "当前像面光束跨度",
          `${fixed(m.span * 1000)} µm`,
          "边缘光线之间的距离",
        ],
      ]
        .map(
          ([a, b, c]) =>
            `<div><small>${a}</small><strong>${b}</strong><em>${c}</em></div>`,
        )
        .join("");
      root.querySelector("[data-rays]").innerHTML = diagram(state, m);
      root.querySelector("[data-pupils]").innerHTML =
        `入瞳：${pupil(t.entrance)}<br>出瞳：${pupil(t.exit)}<br>当前光束中心高度：${fixed(m.chief.image)} mm。<br>中心高度/物高：${m.ratio === null ? "轴上物点，高度比不定义" : fixed(m.ratio, 6)}。名义合焦倍率为−1.5。`;
      const scan = (key) =>
        Array.from({ length: 81 }, (_, i) => {
          const offset = -10 + i * 0.25;
          return [
            offset,
            relaySystem({
              ...state,
              objectOffset: 0,
              imageOffset: 0,
              [key]: offset,
            }).chief.image,
          ];
        });
      const curves = [
        { name: "仅改物距", color: blue, points: scan("objectOffset") },
        {
          name: "仅改像距",
          color: gold,
          dashed: true,
          points: scan("imageOffset"),
        },
      ];
      const values = curves.flatMap((c) => c.points.map((p) => p[1]));
      const min = Math.min(...values) - 0.1,
        max = Math.max(...values) + 0.1;
      root.querySelector("[data-scan]").innerHTML = plot({
        curves,
        samples: [-10, -5, 0, 5, 10].map((offset) => [
          offset,
          relayTruth({ ...state, objectOffset: offset, imageOffset: 0 }).image,
        ]),
        xMin: -10,
        xMax: 10,
        yMin: min,
        yMax: max,
        xLabel: "单个平面的轴向偏移 / mm",
        yLabel: "光束中心高度 / mm",
        title: "分别改变物距和像距时的光束中心高度",
        width: 432,
        leftPadding: 57,
        rightPadding: 24,
      });
      root.querySelector("[data-key]").innerHTML =
        legend(curves) +
        `<span><i style="border-color:#9b703c;border-top-style:dotted"></i>独立几何对照</span>`;
      root.querySelector("[data-truth]").innerHTML =
        `<strong>独立对照</strong><br>矩阵选取主光线后逐面追迹：y=${fixed(m.chief.image, 6)} mm。<br>由光阑中心条件单独解几何：y=${fixed(t.image, 6)} mm；差${Math.abs(m.chief.image - t.image).toExponential(2)} mm。<br>物面到像面矩阵B=${fixed(m.matrix[1], 6)} mm；合焦条件为B=0。AD−BC=${m.determinant.toFixed(9)}。`;
      root.querySelector("[data-reading]").textContent =
        state.height === 0
          ? "轴上主光线在普通结构中也沿光轴传播，不能据此判断远心性；上方分类由光阑与两组焦点的位置决定。"
          : `${mode}；主光线确定光束中心，边缘光线显示聚散。${m.span > 1e-8 ? "当前物面与像面已偏离合焦关系，光束在像面上有有限跨度。" : "当前物点的光束在像面上会聚。"} 移动物面时重点看物方主光线，移动像面时重点看像方主光线。`;
    },
  });
}
