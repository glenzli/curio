import { experiment } from "../common/ui.js";
import { lensSystem } from "./model.js";
const blue = "#448b98", gold = "#b47b43", purple = "#8b78aa";
const mm = (x) => x === null ? "无有限值" : `${(Math.abs(x) < 1e-9 ? 0 : x).toFixed(3)} mm`;
function diagram(p, m) {
  const imageX = m.imageDistance === null ? null : p.gap + m.imageDistance;
  const candidates = [imageX, m.H1, m.H2].filter((x) => x !== null && x >= -300 && x <= 750);
  const min = Math.min(-120, ...candidates.map((v) => v - 25));
  const max = Math.max(320, p.gap + 90, p.sensor + 35, ...candidates.map((v) => v + 35));
  const x = (z) => 40 + (z - min) / (max - min) * 440;
  const values = m.rays.flatMap((r) => [r.height + min * r.angle, r.height, r.height2, r.height2 + (max - p.gap) * r.after2]);
  const bound = Math.max(0.75, ...values.map(Math.abs));
  const y = (v) => 160 - v / bound * 65;
  let drawing = `<defs><clipPath id="ray-window"><rect x="39" y="86" width="442" height="150"/></clipPath></defs><text x="40" y="20">光从左向右；横、纵坐标比例不同</text><path d="M40 160H480" stroke="currentColor" opacity=".25"/>`;
  for (const [value, row, label] of [[m.H1, 257, "H"], [m.H2, 278, "H′"]]) {
    if (value !== null && value >= min && value <= max)
      drawing += `<path d="M${x(value)} 86V235" stroke="${purple}" stroke-dasharray="4 5" opacity=".75"/><text x="${x(value)}" y="${row}" text-anchor="middle" fill="${purple}">${label}</text>`;
  }
  drawing += `<path d="M${x(p.sensor)} 89V235" stroke="${purple}" stroke-width="3" opacity=".65"/><text x="${x(p.sensor)}" y="78" text-anchor="middle">像面</text>`;
  drawing += `<g clip-path="url(#ray-window)">`;
  m.rays.forEach((r, i) => {
    const color = [blue, gold, "currentColor", gold, blue][i];
    drawing += `<path d="M${x(min)} ${y(r.height + min * r.angle)}L${x(0)} ${y(r.height)}L${x(p.gap)} ${y(r.height2)}L${x(max)} ${y(r.height2 + (max - p.gap) * r.after2)}" stroke="${color}" fill="none" stroke-width="${i === 2 ? 1 : 1.6}" opacity="${i === 2 ? 0.35 : 0.85}"/>`;
    if (m.imageDistance !== null && m.imageDistance < 0) {
      const z = Math.max(min, imageX);
      drawing += `<path d="M${x(p.gap)} ${y(r.height2)}L${x(z)} ${y(r.height2 + (z - p.gap) * r.after2)}" stroke="${color}" stroke-dasharray="3 4" opacity=".55" fill="none"/>`;
    }
  });
  drawing += `</g>`;
  for (const [z, power, color, label] of [[0, p.power1, blue, "前组"], [p.gap, p.power2, gold, "后组"]])
    drawing += `<path d="M${x(z)} 106V214" stroke="${color}" stroke-width="3"/><text x="${x(z)}" y="${label === "前组" ? 43 : 61}" text-anchor="middle">${label} ${power > 0 ? "+" : ""}${power.toFixed(1)} D</text>`;
  if (imageX !== null && imageX >= min && imageX <= max) {
    drawing += `<circle cx="${x(imageX)}" cy="${y(m.imageHeight)}" r="3.6" fill="${gold}"/><path d="M${x(imageX)} 234V290" stroke="${gold}" stroke-dasharray="2 3"/><text x="${x(imageX)}" y="299" text-anchor="middle">${m.imageDistance < 0 ? "虚像" : p.finite ? "实像" : "后焦点"}</text>`;
  }
  const tickStep = (max - min) > 650 ? 200 : (max - min) > 350 ? 100 : 50;
  for (let z = Math.ceil(min / tickStep) * tickStep; z <= max; z += tickStep) {
    drawing += `<text x="${x(z)}" y="324" text-anchor="middle">${z.toFixed(0)}</text>`;
  }
  drawing += `<text x="260" y="347" text-anchor="middle">轴向位置 z / mm · 前组位于 0</text>`;
  const ruler = !p.finite && m.bfd !== null && [m.H2, p.gap + m.bfd].every((v) => v >= min && v <= max);
  if (ruler) {
    const end = x(p.gap + m.bfd);
    for (const [start, row, label] of [[x(m.H2), 380, `f = ${m.focalLength.toFixed(1)} mm`], [x(p.gap), 412, `BFD = ${m.bfd.toFixed(1)} mm`]])
      drawing += `<path d="M${start} ${row - 4}V${row + 4}M${start} ${row}H${end}M${end} ${row - 4}V${row + 4}" stroke="${purple}" fill="none"/><text x="${(start + end) / 2}" y="${row - 10}" text-anchor="middle">${label}</text>`;
  }
  return { markup: `<svg role="img" aria-label="两薄镜组的近轴光线、主平面、像面和实虚交点" viewBox="0 0 520 ${ruler ? 430 : 355}">${drawing}</svg>`, offscreen: imageX !== null && (imageX < min || imageX > max) };
}

export function mount({ element, signal }) {
  return experiment({
    element, signal, kicker: "近轴镜组 · ABCD 与逐面追迹", title: "焦距从主平面量起，后焦距从后组量起",
    intro: "用正、负两组拼出望远型或反望远型。改变组间距后，观察主平面和交点怎样移动，再调节像面位置。",
    controls: [
      { key: "power1", label: "前组光焦度", min: -20, max: 20, step: 0.5, value: 10, format: (x) => `${x.toFixed(1)} D` },
      { key: "power2", label: "后组光焦度", min: -20, max: 20, step: 0.5, value: -10, format: (x) => `${x.toFixed(1)} D` },
      { key: "gap", label: "组间距", min: 0, max: 250, step: 1, value: 50, format: (x) => `${x} mm` },
      { key: "objectDistance", label: "有限物距 · 从前组量起", min: 100, max: 2000, step: 10, value: 1000, format: (x) => `${x} mm` },
      { key: "rearDistance", label: "像面距后组", min: 0, max: 400, step: 1, value: 100, format: (x) => `${x} mm` },
    ],
    presets: [
      { label: "望远型 · 课本例子", values: { power1: 10, power2: -10, gap: 50, rearDistance: 100, finite: false } },
      { label: "间距 40 mm · 像面不动", values: { power1: 10, power2: -10, gap: 40, rearDistance: 110, finite: false } },
      { label: "反望远型", values: { power1: -10, power2: 15, gap: 50, rearDistance: 120, finite: false } },
      { label: "无焦组合", values: { power1: 10, power2: 10, gap: 200, rearDistance: 100, finite: false } },
      { label: "有限物距", values: (s) => ({ finite: !s.finite }) },
      { label: "两组重合", values: { gap: 0 } },
    ],
    content: `<style>.actions button{font-size:11px;padding:4px 8px}.ray-view svg{display:block;width:100%;height:auto}.ray-view text{fill:currentColor;font:11px ui-sans-serif,sans-serif}.ray-details{display:grid;grid-template-columns:1fr 1.2fr;gap:18px}.ray-details>section{min-width:0}.ray-details h4{font-size:12px;font-weight:500;margin:12px 0 8px}.matrix{display:grid;grid-template-columns:1fr 1fr;gap:8px;border-inline:1px solid #9caea2;padding:7px 12px;font-size:13px;font-variant-numeric:tabular-nums}.matrix small{font-size:10px;opacity:.65}.truth{font-size:11px;line-height:1.9;border:1px solid #9caea255;border-radius:6px;padding:12px 14px;margin:14px 0;overflow-wrap:anywhere}.cardinal{font-size:11px;line-height:1.9}.stats strong{font-size:20px}@media(max-width:650px){.ray-details{grid-template-columns:1fr}.stats{gap:6px}.stats strong{font-size:16px}.stats small,.stats em{font-size:9px}.ray-view{margin-inline:-8px}.ray-view text{font-size:13px}}</style><p class="reading" data-mode></p><div class="stats" data-stats></div><div class="ray-view" data-diagram></div><p class="reading" data-reading aria-live="polite"></p><div class="ray-details"><section><h4>前组入射面 → 后组出射面的矩阵</h4><div class="matrix" data-matrix></div><p class="note">A、D 无量纲；B 为 mm；C 为 mm⁻¹。主平面虚线只标位置，不是镜片。</p></section><section><h4>主平面与像面</h4><div class="cardinal" data-cardinal></div></section></div><div class="truth" data-truth></div>`,
    note: "空气中的两薄镜组，轴对称、小角度、无像差；D = m⁻¹，换算到 mm⁻¹ 后作矩阵运算。前组截面取 y = −0.5…0.5 mm 的五条光线，有限物点高度为 0.25 mm。竖线仅标镜组位置，不代表真实口径、光阑或机械截光。图中虚像由出射线反向延长得到；视窗外的交点和主平面仍在读数中报告。本例不计算色差、衍射、瞳或实际镜头处方。",
    update(root, state) {
      const p = { ...state, sensor: state.gap + state.rearDistance };
      const m = lensSystem(p), d = diagram(p, m);
      const [A, B, C, D] = m.matrix;
      root.querySelector("[data-mode]").textContent = state.finite ? `有限物点：z = −${state.objectDistance} mm，y = 0.25 mm。` : "轴上平行入射；有限物距滑块暂不参与计算。";
      root.querySelector('input[aria-label="有限物距 · 从前组量起"]').disabled = !state.finite;
      root.querySelector("[data-stats]").innerHTML = [
        ["有效焦距 f", mm(m.focalLength), m.afocal ? "无焦系统，C = 0" : "从像方主平面 H′ 量起"],
        ["后焦距 BFD", mm(m.bfd), "轴上平行光 · 从后组量起"],
        [state.finite ? "当前物点的像距" : "当前光束的交距", mm(m.imageDistance), "从后组量起 · 负值为反向交点"],
      ].map(([a,b,c]) => `<div><small>${a}</small><strong>${b}</strong><em>${c}</em></div>`).join("");
      root.querySelector("[data-diagram]").innerHTML = d.markup;
      root.querySelector("[data-matrix]").innerHTML = [["A", A, ""], ["B", B, "mm"], ["C", C, "mm⁻¹"], ["D", D, ""]].map(([name,v,u]) => `<span><small>${name}</small> ${v.toFixed(name === "C" ? 6 : 4)} <small>${u}</small></span>`).join("");
      root.querySelector("[data-cardinal]").innerHTML = `H 的 z 坐标：${mm(m.H1)}<br>H′ 的 z 坐标：${mm(m.H2)}<br>像面 z = ${mm(p.sensor)}；五条光线在像面上的高度跨度 = ${(m.sensorSpread * 1000).toFixed(3)} µm。<br>${m.magnification === null ? "" : `横向放大率 m = ${m.magnification.toFixed(6)}。`} 最大光线倾角 ${m.maxAngle.toFixed(4)} rad。`;
      root.querySelector("[data-reading]").textContent = (m.afocal ? "这组系统的总光焦度为零，有限焦距与主平面分解不再适用。" : `两组的总光焦度为 ${m.matrixPower.toFixed(4)} D；${m.bfd < 0 ? "后焦点位于后组之前。" : "后焦距与有效焦距的差值来自主平面的位置。"}`)
        + (m.imageDistance === null ? " 当前光束平行出射，没有有限交点。" : m.imageDistance < 0 ? " 当前出射光束的反向延长线相交，虚线部分不是真实反向传播。" : " 当前光束在后组右侧会聚。")
        + (d.offscreen ? " 交点位于绘图窗口之外，保留数值读数。" : "")
        + (m.maxAngle > 0.1 ? " 当前角度偏大，应重新评估近轴近似。" : "");
      const delta = m.imageDistance === null || m.tracedDistance === null ? "两条路径均无有限交点" : `交距差 = ${Math.abs(m.imageDistance - m.tracedDistance).toExponential(2)} mm`;
      root.querySelector("[data-truth]").innerHTML = `<strong>独立对照</strong><br>矩阵成像条件：q = ${mm(m.imageDistance)}；逐面改变倾角并求交：q = ${mm(m.tracedDistance)}。${delta}。<br>解析光焦度 Φ₁ + Φ₂ − dΦ₁Φ₂ = ${m.analyticPower.toFixed(6)} D；矩阵 −C = ${m.matrixPower.toFixed(6)} D。<br>AD − BC = ${m.determinant.toFixed(9)}。逐面追迹未读取总矩阵；二者都使用同一近轴物理假设，吻合不代表已校正真实镜头的像差。`;
      [...root.querySelectorAll(".actions button")][4].textContent = state.finite ? "还原平行入射" : "有限物距";
    },
  });
}
