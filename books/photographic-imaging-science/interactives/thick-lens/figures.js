import { rayArrow } from "../common/optics-drawing.js";
import { number } from "../common/lesson-view.js";
export function thickFigure(s, m) {
  const end = s.thickness + m.bfd,
    max = Math.max(70, end + 10),
    x = (z) => 52 + ((z + 8) / (max + 8)) * 550,
    y = (h) => 135 - h * 46;
  let body = `<text x="20" y="20" style="font-size:14px">蓝色区间为玻璃；紫色虚线为主平面</text><path d="M40 135H608" stroke="currentColor" opacity=".18"/><rect x="${x(0)}" y="69" width="${x(s.thickness) - x(0)}" height="132" fill="#528da8" fill-opacity=".14"/><path d="M${x(0)} 69V201M${x(s.thickness)} 69V201" stroke="#528da8" stroke-width="2"/><path d="M${x(m.h1)} 64V202M${x(m.h2)} 64V202" stroke="#8e76ac" stroke-dasharray="4 4" stroke-width="1.5"/><text x="${x(0) - 8}" y="55" text-anchor="end" style="font-size:13px">前顶点 V₁</text><text x="${x(s.thickness) + 8}" y="55" style="font-size:13px">V₂ 后顶点</text><text x="${x(m.h1) - 4}" y="218" text-anchor="end" style="font-size:12px">H</text><text x="${x(m.h2) + 4}" y="218" style="font-size:12px">H′</text>`;
  for (const h of [-1, -0.5, 0.5, 1]) {
    const pts = [[-8, h], ...m.trace(h).points],
      color = Math.abs(h) === 1 ? "#397f9f" : "#85b6c5";
    body +=
      `<path d="${pts.map(([z, v], i) => `${i ? "L" : "M"}${x(z)} ${y(v)}`).join(" ")}" fill="none" stroke="${color}" stroke-width="1.6"/>` +
      rayArrow([x(s.thickness), y(pts[2][1])], [x(end), y(0)], color);
  }
  body += `<circle cx="${x(end)}" cy="135" r="3.5" fill="#be7a3d"/><text x="${x(end) + 5}" y="123" style="font-size:13px">F′</text><text x="20" y="245" style="font-size:12px">n=${number(s.index, 2)} · 高度 ±1 mm</text><text x="20" y="266" style="font-size:11px">横纵比例不同；折射在顶点参考面计算</text>`;
  for (const [start, row, label, color] of [
    [m.h2, 241, `f=${number(m.f, 2)} mm`, "#8e76ac"],
    [s.thickness, 280, `BFD=${number(m.bfd, 2)} mm`, "#be7a3d"],
  ])
    body += `<path d="M${x(start)} ${row - 5}V${row + 5}M${x(start)} ${row}H${x(end)}M${x(end)} ${row - 5}V${row + 5}" stroke="${color}"/><text x="${(x(start) + x(end)) / 2}" y="${row - 9}" text-anchor="middle" style="font-size:12px">${label}</text>`;
  return `<svg class="drawing" viewBox="0 0 640 295" role="img" aria-label="厚透镜玻璃区间、顶点参考面、主平面与f和BFD的测量起点">${body}</svg>`;
}
