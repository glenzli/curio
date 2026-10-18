import { IMAGE_Z } from "./model.js";
const colors = ["#40879a", "#bb7946", "#8b78aa"];
export function rayFigure(m, progress = 100) {
  const X = (z) => 55 + ((z + 10) / (IMAGE_Z + 10)) * 550,
    Y = (h) => 170 - 27 * h,
    limit = -10 + ((IMAGE_Z + 10) * progress) / 100;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 660 355" style="font:12px sans-serif" role="img" aria-label="两薄镜组与三个真实圆孔的逐面截光，光线在首个遮挡处结束"><defs><clipPath id="aperture-scan"><rect x="0" y="0" width="${X(limit)}" height="355"/></clipPath></defs><path d="M40 170H625" stroke="currentColor" opacity=".3" stroke-dasharray="4 4"/><text x="14" y="22">子午截面 hₓ / mm</text>${[
    0, 25, 60,
  ]
    .map((z, i) => {
      const r = [m.frontRadius, m.middleRadius, m.rearRadius][i],
        x = X(z);
      return `<path d="M${x} 35V${Y(r)}M${x} ${Y(-r)}V310" stroke="${colors[i]}" stroke-width="6"/><path d="M${x} ${Y(r)}V${Y(-r)}" stroke="${colors[i]}" opacity=".25"/><text x="${x}" y="330" text-anchor="middle">${["前组", "中间孔径", "后组"][i]}</text><text x="${x}" y="350" text-anchor="middle">z=${z} mm</text>`;
    })
    .join(
      "",
    )}<path d="M${X(IMAGE_Z)} 30V310" stroke="currentColor" opacity=".5"/><text x="${X(IMAGE_Z)}" y="330" text-anchor="middle">近轴像面</text><g clip-path="url(#aperture-scan)">${m.rays
    .map((r) => {
      const last = r.route.at(-1);
      return `<path d="M${r.route.map(([z, h]) => `${X(z)},${Y(h)}`).join("L")}" stroke="${r.passed ? "#40879a" : "#bb7946"}" opacity="${r.passed ? 0.7 : 0.32}" fill="none" stroke-width="1.3"/>${r.blocked ? `<path d="M${X(last[0]) - 4} ${Y(last[1]) - 4}l8 8m-8 0l8-8" stroke="#bb7946"/>` : ""}`;
    })
    .join("")}</g></svg>`;
}
export function maskFigure(m) {
  const scale = 125 / m.frontRadius,
    X = (y) => 205 + y * scale,
    Y = (x) => 160 - x * scale,
    circles = m.disks.map(
      (c, i) =>
        `<circle cx="205" cy="${Y(c.center)}" r="${c.radius * scale}" fill="none" stroke="${colors[i]}" stroke-width="1.6"/>`,
    ),
    accepted =
      '<g clip-path="url(#aperture-disk-0)"><g clip-path="url(#aperture-disk-1)"><g clip-path="url(#aperture-disk-2)"><rect x="30" y="20" width="350" height="280" fill="#40879a" fill-opacity=".4"/></g></g></g>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 350" style="font:12px sans-serif" role="img" aria-label="三孔径独立投影到前组平面后的共同通光区域"><defs>${m.disks.map((c, i) => `<clipPath id="aperture-disk-${i}"><circle cx="205" cy="${Y(c.center)}" r="${c.radius * scale}"/></clipPath>`).join("")}<clipPath id="aperture-view"><rect x="45" y="20" width="320" height="280"/></clipPath></defs><text x="45" y="15">前组平面的通光区域</text><g clip-path="url(#aperture-view)">${accepted}${circles.join("")}<path d="M45 160H365M205 20V300" stroke="currentColor" opacity=".2" stroke-dasharray="3 4"/></g>${[-m.frontRadius, 0, m.frontRadius].map((v) => `<text x="${X(v)}" y="318" text-anchor="middle">${v.toFixed(1)}</text><text x="40" y="${Y(v) + 4}" text-anchor="end">${v.toFixed(1)}</text>`).join("")}<text x="365" y="343" text-anchor="end">hᵧ / mm →</text><text x="8" y="72">hₓ ↑</text></svg>`;
}
