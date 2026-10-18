import { plot } from "../common/ui.js";
import { diskIntegral, diskTruth } from "./model.js";
export function geometryFigure(m, view = "combined") {
  const theta = (m.angle * Math.PI) / 180,
    c = Math.cos(theta),
    s = Math.sin(theta),
    x0 = 140,
    y0 = 305,
    x1 = 270,
    y1 = y0 - 130 * Math.tan(theta),
    r = 130 * m.radiusRatio;
  const side = `<path d="M60 ${y0}H330" stroke="currentColor" opacity=".25" stroke-dasharray="4 4"/><path d="M${x0} 25V350M${x1} 20V350" stroke="currentColor" opacity=".3"/><path d="M${x0} ${y0 - r}V${y0 + r}" stroke="#40879a" stroke-width="6"/><path d="M${x0} ${y0 - r}L${x1} ${y1}L${x0} ${y0 + r}" fill="#40879a" fill-opacity=".08" stroke="#40879a" opacity=".5"/><path d="M${x0} ${y0}L${x1} ${y1}" stroke="#bb7946" stroke-width="2"/><path d="M${x0 + 36} ${y0}A36 36 0 0 0 ${x0 + 36 * c} ${y0 - 36 * s}" fill="none" stroke="#bb7946"/><text x="${x0 + 50 * Math.cos(theta / 2)}" y="${y0 - 50 * Math.sin(theta / 2) - 4}">θ</text><path d="M${x1 - 55} ${y1}H${x1 + 18}" stroke="currentColor" stroke-dasharray="3 3" opacity=".5"/><circle cx="${x1}" cy="${y1}" r="4" fill="#bb7946"/><text x="${x1 + 12}" y="${y1 + 4}">P</text><text x="30" y="15">像点高度 h=${m.heightMm.toFixed(1)} mm</text><text x="60" y="${y0 - 12}">轴上</text><text x="164" y="355">z=60 mm</text><text x="82" y="376">圆形出瞳</text><text x="254" y="376">平面像面</text>`,
    projection = `<text x="365" y="28">固定视线方向的平行投影</text><circle cx="420" cy="90" r="34" fill="#40879a" fill-opacity=".12" stroke="#40879a"/><ellipse cx="550" cy="90" rx="${34 * c}" ry="34" fill="#bb7946" fill-opacity=".18" stroke="#bb7946"/><text x="420" y="146" text-anchor="middle">原面积 A</text><text x="550" y="146" text-anchor="middle">A cosθ</text><text x="365" y="192">出瞳投影：cosθ=${c.toFixed(4)}</text><text x="365" y="224">中心距离：r=z/cosθ</text><text x="365" y="249">z²/r²=${(c * c).toFixed(4)}</text><text x="365" y="283">接收面投影：cosθ=${c.toFixed(4)}</text><text x="365" y="321">cos⁴θ=${(c ** 4).toFixed(5)}</text><text x="365" y="354">有限瞳各面积元角度不同。</text>`;
  const content =
    view === "side"
      ? side
      : view === "projection"
        ? projection
        : side + projection;
  const label =
    view === "side"
      ? "平行出瞳与像面的离轴几何"
      : view === "projection"
        ? "小出瞳近似的投影、距离和接收面余弦"
        : "平行出瞳与像面的离轴几何，距离、两个余弦与投影面积";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view === "side" ? "0 0 350 380" : view === "projection" ? "350 0 290 380" : "0 0 640 380"}" style="font:12px sans-serif" role="img" aria-label="${label}">${content}</svg>`;
}
export function curveData(radiusRatio) {
  const axis = diskIntegral(radiusRatio, 0);
  return Array.from({ length: 66 }, (_, angle) => {
    const h = Math.tan((angle * Math.PI) / 180);
    return {
      angle,
      small: Math.cos((angle * Math.PI) / 180) ** 4,
      finite: diskIntegral(radiusRatio, h) / axis,
      truth: diskTruth(radiusRatio, h) / diskTruth(radiusRatio, 0),
    };
  });
}
export function illuminationFigure(data, angle = 45) {
  return plot({
    curves: [
      {
        name: "小瞳cos⁴θ",
        color: "#bb7946",
        dashed: true,
        points: data.map((p) => [p.angle, p.small]),
      },
      {
        name: "有限瞳积分",
        color: "#40879a",
        points: data.map((p) => [p.angle, p.finite]),
      },
    ],
    samples: data
      .filter((p) => p.angle % 10 === 0)
      .map((p) => [p.angle, p.truth]),
    xMax: 65,
    leftPadding: 72,
    rightPadding: 28,
    bottomPadding: 50,
    xLabel: "离轴角 θ / °",
    yLabel: "E(θ) / E(0)",
    title: "有限圆瞳积分、小瞳近似与独立解析真值",
    markers: [{ value: angle, label: angle.toFixed(1) + "°" }],
  });
}
