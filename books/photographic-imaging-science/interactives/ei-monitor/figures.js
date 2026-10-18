import { plot } from "../common/ui.js";
export function markerData(m) {
  const out = [{ value: m.probe, label: "探针", color: "#8b78aa" }];
  if (Math.abs(m.headroom - m.fileHeadroom) < 1e-9)
    out.push({ value: m.headroom, label: "传感器 / 文件上限", color: "#999" });
  else
    out.push(
      { value: m.headroom, label: "传感器上限", color: "#999" },
      { value: m.fileHeadroom, label: "文件上限", color: "#bb7946" },
    );
  return out;
}
export function monitorFigure(m) {
  return plot({
    curves: [
      {
        name: "有限位深监看码",
        color: "#40879a",
        points: m.curve.map((p) => [p.sceneEV, p.display]),
      },
      {
        name: "无量化的同链对照",
        color: "#bb7946",
        dashed: true,
        points: m.curve.map((p) => [p.sceneEV, p.idealDisplay]),
      },
    ],
    xMin: -6,
    xMax: 8,
    yMax: 1,
    xLabel: "场景相对中灰 / stop",
    yLabel: "教学Gamma监看码",
    title: "实际监看输出与保留相同截顶的无量化对照",
    markers: markerData(m).map((marker) => ({ ...marker, label: "" })),
    leftPadding: 72,
    rightPadding: 28,
    bottomPadding: 50,
    topPadding: 55,
    height: 290,
  });
}
export function allocationFigure(m) {
  const x = (s) => 85 + (s + 2) * 35;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 190" role="img" aria-label="固定传感器范围内中灰上下方档位与独立物理真值" style="font:13px sans-serif"><text x="20" y="23">容量/读噪刻度：4 e⁻为0 stop。</text><path d="M${x(0)} 80H${x(m.truth.total)}" stroke="currentColor" stroke-width="18" opacity=".16"/><path d="M${x(0)} 80H${x(m.shadow)}" stroke="#40879a" stroke-width="18"/><path d="M${x(m.shadow)} 80H${x(m.truth.total)}" stroke="#bb7946" stroke-width="18"/><path d="M${x(m.shadow)} 53V105" stroke="currentColor"/><text x="${x(m.shadow)}" y="128" text-anchor="middle">中灰 ${m.gray.mu.toFixed(1)} e⁻</text><text x="${x(0)}" y="57">4 e⁻</text><text x="${x(m.truth.total)}" y="57" text-anchor="end">32000 e⁻</text><text x="20" y="162">下方 ${m.shadow.toFixed(3)} stop + 上方 ${m.headroom.toFixed(3)} stop = ${m.truth.total.toFixed(3)} stop</text></svg>`;
}
export function patchesFigure(m) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 170" role="img" aria-label="五个场景曝光级的教学监看码和三处白点状态" style="font:12px sans-serif">${m.patches
    .map((p, j) => {
      const g = Math.round(p.display * 255);
      return `<rect x="${20 + j * 124}" y="15" width="104" height="64" fill="rgb(${g},${g},${g})" stroke="currentColor" stroke-opacity=".25"/><text x="${72 + j * 124}" y="101" text-anchor="middle">${p.sceneEV > 0 ? "+" : ""}${p.sceneEV} stop</text><text x="${72 + j * 124}" y="125" text-anchor="middle">码 ${p.display.toFixed(3)}</text><text x="${72 + j * 124}" y="149" text-anchor="middle">${p.sensorClipped ? "传感器白" : p.fileWhite ? "文件白" : p.monitorClipped ? "监看白" : "未到白点"}</text>`;
    })
    .join("")}</svg>`;
}
