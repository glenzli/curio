import { experiment } from "../common/ui.js";
import { doublet, glasses, lines, defocusDiameter } from "./model.js";

const colors = { g: "#9575ad", F: "#448baf", d: "#54866a", C: "#c17a50" };
const fmt = (x, digits = 2) =>
  (Math.abs(x) < 0.5 * 10 ** -digits ? 0 : x).toLocaleString("zh-CN", {
    maximumFractionDigits: digits,
  });
const signed = (x) => `${x >= 0.005 ? "+" : ""}${fmt(x, 2)}`;
const svg = (label, content, height = 260) =>
  `<svg role="img" aria-label="${label}" viewBox="0 0 420 ${height}">${content}</svg>`;

function spectrum(m, planeOffset) {
  const data = Array.from({ length: 241 }, (_, i) => {
    const w = lines.g + ((700 - lines.g) * i) / 240;
    return [w, (m.focusAt(w) - m.focalLength) * 1000];
  });
  const values = data.map((p) => p[1]),
    low = Math.min(0, ...values),
    high = Math.max(0, ...values),
    pad = Math.max(20, (high - low) * 0.14);
  const yMin = low - pad,
    yMax = high + pad;
  const x = (w) => 52 + ((w - lines.g) / (700 - lines.g)) * 345,
    y = (v) => 209 - ((v - yMin) / (yMax - yMin)) * 170;
  let content = `<text x="52" y="16">焦点相对 d 线的位置 / µm</text>`;
  for (let i = 0; i <= 4; i++) {
    const v = yMin + ((yMax - yMin) * i) / 4;
    content += `<path d="M52 ${y(v)}H397" stroke="currentColor" opacity=".1"/><text x="46" y="${y(v) + 4}" text-anchor="end">${fmt(v, 0)}</text>`;
  }
  for (const w of [440, 500, 600, 700])
    content += `<text x="${x(w)}" y="230" text-anchor="middle">${w}</text>`;
  content += `<path d="${data.map(([w, v], i) => `${i ? "L" : "M"}${x(w)},${y(v)}`).join(" ")}" fill="none" stroke="currentColor" stroke-width="1.8" opacity=".75"/>`;
  for (const [line, w] of Object.entries(lines)) {
    const v = (m.focuses[line] - m.focalLength) * 1000;
    content += `<path d="M${x(w)} 36V209" stroke="${colors[line]}" opacity=".25" stroke-dasharray="2 4"/><circle cx="${x(w)}" cy="${y(v)}" r="4" fill="${colors[line]}"/><text x="${x(w)}" y="31" text-anchor="middle" fill="${colors[line]}">${line}</text>`;
  }
  if (planeOffset >= yMin && planeOffset <= yMax)
    content += `<path d="M52 ${y(planeOffset)}H397" stroke="currentColor" stroke-dasharray="5 4" opacity=".5"/>`;
  content += `<text x="225" y="254" text-anchor="middle">波长 / nm</text>`;
  return svg("目录色散计算的纵向色差与选定像面", content);
}

function focusRegion(m, plane) {
  const focuses = Object.values(m.focuses),
    lo = Math.min(...focuses, plane),
    hi = Math.max(...focuses, plane),
    pad = Math.max(0.04, (hi - lo) * 0.16);
  const left = lo - pad,
    right = hi + pad,
    x = (z) => 36 + ((z - left) / (right - left)) * 360;
  const radius = m.focalLength / 16; // f/8, fixed entrance diameter for this total focal length.
  const maxHeight = Math.max(
    ...Object.values(m.focuses).flatMap((f) => [
      Math.abs(radius * (1 - left / f)),
      Math.abs(radius * (1 - right / f)),
    ]),
    0.001,
  );
  const y = (h) => 94 - (h / maxHeight) * 58;
  let content = `<text x="36" y="16">焦点附近的近轴光束 · 纵向放大</text><path d="M36 94H396" stroke="currentColor" opacity=".2"/>`;
  for (const [line, f] of Object.entries(m.focuses)) {
    for (const sign of [-1, 1])
      content += `<path d="M${x(left)} ${y(sign * radius * (1 - left / f))}L${x(right)} ${y(sign * radius * (1 - right / f))}" fill="none" stroke="${colors[line]}" stroke-width="1.4" opacity=".7"/>`;
    content += `<circle cx="${x(f)}" cy="94" r="3" fill="${colors[line]}"/>`;
  }
  content += `<path d="M${x(plane)} 40V162" stroke="currentColor" stroke-dasharray="4 3"/><text x="${x(plane)}" y="33" text-anchor="middle">像面</text><path d="M36 166H396" stroke="currentColor" opacity=".2"/>`;
  for (const z of [left, (left + right) / 2, right])
    content += `<text x="${x(z)}" y="185" text-anchor="middle">${fmt((z - m.focalLength) * 1000, 0)}</text>`;
  content += `<text x="216" y="210" text-anchor="middle">沿光轴位置，相对 d 线焦点 / µm</text>`;
  return svg("四条谱线的光束交点及像面位置", content, 224);
}

export function mount({ element, signal, session }) {
  const initial = doublet(),
    solution = initial.solutionRatio;
  return experiment({
    element,
    signal,
    session,
    kicker: "材料色散 · 接触薄透镜",
    title: "两片镜怎样让 F、C 两线同焦",
    intro:
      "总焦距保持不变，改变正、负两片分担的光焦度。先比较单片与消色差配比，再移动像面，查看各条谱线的焦点和几何离焦斑。",
    controls: [
      {
        key: "focalLength",
        label: "d 线总焦距",
        min: 50,
        max: 200,
        step: 5,
        value: 100,
        format: (x) => `${x} mm`,
      },
      {
        key: "ratio",
        label: "正片光焦度 / 总光焦度",
        min: 1,
        max: 4,
        step: "any",
        value: solution,
        format: (x) => `${fmt(x, 4)} 倍`,
      },
      {
        key: "planeOffset",
        label: "像面相对 d 线焦点",
        min: -2500,
        max: 2500,
        step: 5,
        value: 0,
        format: (x) => `${signed(x)} µm`,
      },
    ],
    presets: [
      {
        label: "单片基准",
        values: { ratio: 1, sameGlass: false, planeOffset: 0 },
      },
      {
        label: "N-BK7 + N-F2",
        values: { ratio: solution, sameGlass: false, planeOffset: 0 },
      },
      {
        label: "配比偏离",
        values: { ratio: 1.6, sameGlass: false, planeOffset: 0 },
      },
      {
        label: "两片相同玻璃",
        values: { ratio: 2, sameGlass: true, planeOffset: 0 },
      },
    ],
    content: `<style>
      .actions button{font-size:11px;padding:4px 8px}.actions button:disabled{opacity:.4;cursor:default}.glass-pair{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0}.glass-card{border:1px solid #9caea255;border-radius:6px;padding:12px;min-width:0}.glass-card small{display:block;opacity:.65;font-size:10px}.glass-card h4{margin:3px 0;font-size:15px;font-weight:500}.glass-card strong{font-size:19px;font-variant-numeric:tabular-nums}.glass-card .unit{font-size:11px}.power-track{height:5px;background:#9caea219;margin-top:10px}.power-track i{display:block;height:100%}.optics-plot{margin:20px 0}.optics-plot svg{display:block;width:100%;height:auto;overflow:visible}.optics-plot text{fill:currentColor;font:12px ui-sans-serif,sans-serif}.optics-status{font-size:12px;border-left:2px solid #9caea288;padding-left:12px;margin:16px 0;min-height:3.4em}.optics-status[data-degenerate=true]{border-color:#b47b43}.optics-numbers{display:grid;grid-template-columns:1fr 1fr;gap:12px;border-block:1px solid #9caea244;padding:12px 0}.optics-numbers small{font-size:10px;opacity:.65;display:block}.optics-numbers strong{font-size:21px;font-weight:500;display:block;font-variant-numeric:tabular-nums}.optics-key{display:flex;gap:8px 16px;flex-wrap:wrap;font-size:11px}.optics-key i{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px}.focus-table{width:100%;border-collapse:collapse;font-size:11px;font-variant-numeric:tabular-nums;margin:12px 0}.focus-table th,.focus-table td{text-align:right;border-bottom:1px solid #9caea233;padding:7px 3px;font-weight:400}.focus-table th:first-child,.focus-table td:first-child{text-align:left}.focus-table th{opacity:.65;font-size:10px}.focus-table .line-mark{display:inline-block;width:3px;height:12px;margin-right:5px;vertical-align:middle}.small-reading{font-size:11px}
      @media(max-width:550px){.glass-pair{gap:8px}.glass-card{padding:10px}.glass-card h4{font-size:13px}.glass-card strong{font-size:16px}.optics-numbers strong{font-size:18px}.focus-table{font-size:10px}.focus-table th{font-size:9px}.optics-status{min-height:6.8em}}
    </style><div class="glass-pair" data-powers></div><p class="optics-status" data-status aria-live="polite"></p><div class="optics-numbers" data-numbers></div><div class="optics-plot" data-spectrum></div><div class="optics-key">${Object.entries(
      lines,
    )
      .map(
        ([line, w]) =>
          `<span><i style="background:${colors[line]}"></i>${line} · ${fmt(w, 2)} nm</span>`,
      )
      .join(
        "",
      )}</div><p class="small-reading" data-plane></p><div class="optics-plot" data-focus></div><table class="focus-table"><thead><tr><th>谱线</th><th>焦距 / mm</th><th>相对 d / µm</th><th>离焦斑直径 / µm</th></tr></thead><tbody data-focus-table></tbody></table>`,
    note: "N-BK7 与 N-F2 的折射率来自 SCHOTT 目录 Sellmeier 系数，计算范围 435.83–700 nm；系数和单位随模型保存在书中。两片为在空气中接触的薄透镜，光焦度按 n(λ)−1 缩放，未计厚度、间隔、球差与制造误差。光束图只放大焦点附近的纵向范围，纵横比例不同；几何离焦斑使用 d 线 f/8 入瞳，不含衍射，零值不表示真实点像直径为零。F/C 同焦不保证 d、g 或全谱同焦。",
    update(root, state) {
      const m = doublet(state),
        plane = m.focalLength + state.planeOffset / 1000;
      root.querySelector("[data-powers]").innerHTML = [
        ["正片", m.first, m.a, m.phi1, "#54866a"],
        ["负片", m.second, m.b, m.phi2, "#b47b43"],
      ]
        .map(
          ([name, glass, d, power, color]) =>
            `<div class="glass-card"><small>${name} · ${glasses[glass].name}</small><h4>Vᵈ = ${fmt(d.abbe)} · Pᵍᶠ = ${fmt(d.partial, 4)}</h4><strong>${power >= 0 ? "+" : ""}${power.toFixed(5)}</strong> <span class="unit">mm⁻¹</span><div class="power-track"><i style="width:${(Math.abs(power / m.total) / 4) * 100}%;background:${color}"></i></div></div>`,
        )
        .join("");
      const status = root.querySelector("[data-status]");
      status.dataset.degenerate = String(m.solutionRatio === null);
      const separation = (m.focuses.C - m.focuses.F) * 1000;
      status.textContent =
        m.solutionRatio === null
          ? "两片都是 N-BK7，Abbe 数相同。正负光焦度怎样分配，都不能在保留非零总光焦度的同时消除 F–C 色差；自动配比在这里无解。"
          : Math.abs(separation) < 0.001
            ? "F、C 两线已同焦。曲线仍有弯曲：d 线与 g 线的焦点没有随之重合，这部分残差需要其他材料或更多设计自由度。"
            : "目前 F、C 焦点尚未重合。正片与负片的色散贡献没有抵消；点击“F/C 自动配比”可求出本组材料的一级消色差配比。";
      root.querySelector("[data-numbers]").innerHTML =
        `<div><small>F → C 焦点间隔</small><strong>${signed(separation)} µm</strong></div><div><small>g 相对 F 的焦移</small><strong>${signed((m.focuses.g - m.focuses.F) * 1000)} µm</strong></div>`;
      root.querySelector("[data-spectrum]").innerHTML = spectrum(
        m,
        state.planeOffset,
      );
      root.querySelector("[data-plane]").textContent =
        `选定像面 ${fmt(plane, 4)} mm（相对 d 线 ${signed(state.planeOffset)} µm），在曲线范围内时以虚线表示。下图光束及表中离焦斑使用这一位置。`;
      root.querySelector("[data-focus]").innerHTML = focusRegion(m, plane);
      root.querySelector("[data-focus-table]").innerHTML = Object.entries(lines)
        .map(
          ([line]) =>
            `<tr><td><i class="line-mark" style="background:${colors[line]}"></i>${line}</td><td>${m.focuses[line].toFixed(5)}</td><td>${signed((m.focuses[line] - m.focalLength) * 1000)}</td><td>${fmt(defocusDiameter(m.focuses[line], plane, m.focalLength / 8) * 1000, 2)}</td></tr>`,
        )
        .join("");
      const solve = root.querySelector("[data-solve]");
      if (solve) solve.disabled = m.solutionRatio === null;
    },
    setup({ root, state, render }) {
      const button = document.createElement("button");
      button.textContent = "F/C 自动配比";
      button.dataset.solve = "";
      root.querySelector(".actions").prepend(button);
      button.addEventListener(
        "click",
        () => {
          const m = doublet(state);
          if (m.solutionRatio !== null) {
            state.ratio = m.solutionRatio;
            render();
          }
        },
        { signal },
      );
      render();
    },
  });
}
