import { number } from "../common/lesson-view.js";
export const spectralColors = ["#3c78b1", "#3c9167", "#c56858"];
export function focusPlanes(s, m) {
  const x = (z) => 165 + ((z + 80) / 160) * 425;
  let body = `<text x="18" y="21" style="font-size:14px">各谱线焦面 · 相对绿光焦面的位置</text><path d="M${x(s.focus)} 40V174" stroke="currentColor" stroke-width="1.6" stroke-dasharray="4 4"/>`;
  m.lines.forEach((l, i) => {
    const y = 64 + i * 43,
      c = spectralColors[i];
    body += `<g opacity="${l.weight > 0 ? 1 : 0.3}"><text x="20" y="${y + 4}" style="font-size:13px" fill="${c}">${l.nm} nm · ${number(l.weight * 100, 0)}%</text><path d="M165 ${y}H590" stroke="currentColor" opacity=".16"/><path d="M${x(l.focus)} ${y - 13}V${y + 13}" stroke="${c}" stroke-width="3"/><circle cx="${x(l.focus)}" cy="${y}" r="4" fill="${c}"/></g>`;
  });
  for (const z of [-80, -40, 0, 40, 80])
    body += `<text x="${x(z)}" y="198" text-anchor="middle" style="font-size:12px">${z}</text>`;
  return `<svg class="drawing" viewBox="0 0 640 240" role="img" aria-label="450、550、650纳米的指定焦面与当前检测面，百分数为检测信号权重">${body}<text x="378" y="224" text-anchor="middle" style="font-size:12px">像面位置 / μm · 虚线：当前 ${number(s.focus, 0)} μm</text></svg>`;
}
