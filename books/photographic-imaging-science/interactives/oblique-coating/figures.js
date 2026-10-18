import { plot } from "../common/ui.js";
import { obliqueMatrix, fresnelRecursion } from "./model.js";
export const names = {
  bare: "未镀膜界面",
  single: "单层膜",
  pair: "双层 L → H",
  reverse: "双层 H → L",
  six: "六层 L → H",
};
export function incidenceFigure(m, view = "combined") {
  const theta = (m.currentAngle * Math.PI) / 180,
    s = Math.sin(theta),
    c = Math.cos(theta),
    ox = 245,
    oy = 105,
    bottom = oy + 18 * m.layers.length,
    ray = [[ox, oy]];
  let x = ox,
    y = oy;
  for (const layer of m.layers) {
    const t = Math.asin(s / layer.n);
    x += 18 * Math.tan(t);
    y += 18;
    ray.push([x, y]);
  }
  const substrate = Math.asin(s / 1.52);
  ray.push([x + 75 * Math.sin(substrate), y + 75 * Math.cos(substrate)]);
  const px = ox - 45 * s,
    py = oy - 45 * c;
  const rays = `<rect x="70" y="${bottom}" width="375" height="${290 - bottom}" fill="#40879a" fill-opacity=".08"/><path d="M70 ${bottom}H445" stroke="#40879a"/>${m.layers.map((l, j) => `<rect x="70" y="${oy + j * 18}" width="375" height="18" fill="${j % 2 ? "#bb7946" : "#40879a"}" fill-opacity=".18" stroke="currentColor" stroke-opacity=".15"/>`).join("")}<path d="M245 10V295" stroke="currentColor" stroke-dasharray="4 4" opacity=".3"/><text x="253" y="25">法线</text><path d="M${ox - 90 * s} ${oy - 90 * c}L${ox} ${oy}" stroke="currentColor" stroke-width="2"/><path d="M${ox} ${oy}L${ox + 90 * s} ${oy - 90 * c}" stroke="#bb7946" stroke-width="2"/><path d="M${ray.map((p) => p.join(",")).join("L")}" stroke="#40879a" stroke-width="2" fill="none"/><path d="M${px - 15 * c} ${py + 15 * s}L${px + 15 * c} ${py - 15 * s}" stroke="#a76568" stroke-width="3"/><circle cx="${px}" cy="${py}" r="6" stroke="#a76568" fill="none"/><circle cx="${px}" cy="${py}" r="1.5" fill="#a76568"/>`,
    legend = `<text x="455" y="52">s：电场垂直纸面 ⊙</text><text x="455" y="82">p：电场在纸面内</text><text x="455" y="125">θ₀=${m.currentAngle.toFixed(2)}°</text><text x="455" y="157">空气 n₀=1</text><text x="455" y="195">基底 nₛ=1.52</text><text x="455" y="238">透射方向 ${((substrate * 180) / Math.PI).toFixed(2)}°</text>`,
    caption = `<text x="70" y="310">入射面为纸面；层厚示意，折射方向按Snell计算。</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view === "rays" ? "60 0 395 300" : "0 0 640 315"}" style="font:12px sans-serif" role="img" aria-label="斜入射、Snell折射方向及s/p偏振的定义">${rays}${view === "rays" ? "" : legend + caption}</svg>`;
}
export function sweepData(m, axis = "angle") {
  return Array.from({ length: 76 }, (_, j) => {
    const value = axis === "angle" ? j : 400 + j * 4,
      input = {
        layers: m.layers,
        wavelength: axis === "angle" ? m.wavelength : value,
        angle: axis === "angle" ? value : m.currentAngle,
      },
      s = obliqueMatrix(input, "s"),
      p = obliqueMatrix(input, "p");
    return {
      value,
      s: s.R,
      p: p.R,
      mix: (1 - m.pFraction) * s.R + m.pFraction * p.R,
      truthS: j % 15 === 0 ? fresnelRecursion(input, "s").R : null,
      truthP: j % 15 === 0 ? fresnelRecursion(input, "p").R : null,
    };
  });
}
export function reflectanceFigure(data, m, axis = "angle") {
  const angular = axis === "angle",
    max = Math.max(...data.flatMap((p) => [p.s, p.p])) * 100,
    markers = [
      {
        value: angular ? m.currentAngle : m.wavelength,
        label: angular
          ? m.currentAngle.toFixed(1) + "°"
          : m.wavelength.toFixed(0) + " nm",
      },
    ];
  if (angular && m.mode === "bare")
    markers.push({
      value: m.bare.brewster,
      label: "裸界面 θB",
      color: "#a0a6a2",
    });
  if (!angular && m.mode === "single")
    markers.push({ value: m.quarterPhase, label: "δ=π/2", color: "#a0a6a2" });
  return plot({
    curves: [
      {
        name: "s",
        color: "#40879a",
        points: data.map((p) => [p.value, p.s * 100]),
      },
      {
        name: "p",
        color: "#bb7946",
        points: data.map((p) => [p.value, p.p * 100]),
      },
      {
        name: "按能流权重合成",
        color: "#8b78aa",
        dashed: true,
        points: data.map((p) => [p.value, p.mix * 100]),
      },
    ],
    samples: data.flatMap((p) =>
      p.truthS === null
        ? []
        : [
            [p.value, p.truthS * 100],
            [p.value, p.truthP * 100],
          ],
    ),
    xMin: angular ? 0 : 400,
    xMax: angular ? 75 : 700,
    yMax: Math.max(5, Math.ceil(max / 5) * 5),
    xLabel: angular ? "入射角 θ₀ / °" : "真空波长 / nm",
    yLabel: "反射率 / %",
    title: angular
      ? "s/p反射率随入射角变化及独立递推对照"
      : "当前入射角下s/p反射谱与四分之一波相位条件",
    markers,
    leftPadding: 72,
    rightPadding: 28,
    bottomPadding: 50,
    topPadding: 48,
    topLabelY: 12,
    height: 280,
  });
}
