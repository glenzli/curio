import { number } from "../common/lesson-view.js";
export function thermalPositions(m) {
  const focus = (m.exact - 100) * 1000,
    sensor = (m.sensor - 100) * 1000,
    range = Math.max(1, Math.abs(focus), Math.abs(sensor)) * 1.25,
    x = (v) => 365 + (v / range) * 215;
  const rows = [
    ["基准位置", 0, "#858e96"],
    ["玻璃后的焦点", focus, "#be7a3d"],
    ["传感器位置", sensor, "#397f9f"],
  ];
  return `<svg class="drawing" viewBox="0 0 640 235" role="img" aria-label="相对100毫米基准的焦点和传感器位移，以及两者的差"><text x="18" y="20" style="font-size:14px">相对100 mm基准的位置 · 局部放大</text><path d="M${x(0)} 36V168" stroke="currentColor" stroke-dasharray="3 4" opacity=".25"/>${rows
    .map(([label, value, color], i) => {
      const y = 57 + i * 43;
      return `<text x="18" y="${y + 4}" style="font-size:13px">${label}</text><path d="M150 ${y}H590" stroke="currentColor" opacity=".12"/><path d="M${x(value)} ${y - 11}V${y + 11}" stroke="${color}" stroke-width="3"/><text x="${x(value)}" y="${y + 27}" text-anchor="middle" style="font-size:12px">${number(value, 2)} μm</text>`;
    })
    .join(
      "",
    )}<path d="M${x(sensor)} 190H${x(focus)}M${x(sensor)} 185V195M${x(focus)} 185V195" stroke="#8e76ac" stroke-width="1.6"/><text x="365" y="224" text-anchor="middle" style="font-size:13px">剩余离焦 = 焦点位置 − 传感器位置 = ${number(m.residual, 3)} μm</text></svg>`;
}
