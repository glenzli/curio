export const NAMES = ["输入相机RGB", "白平衡后", "教学矩阵混合后"];
export function scatterFigure(m, k) {
  const cov = m.stages[k].covariance,
    a = cov[0][0],
    b = cov[0][2],
    d = cov[2][2],
    angle = 0.5 * Math.atan2(2 * b, a - d),
    D = Math.hypot(a - d, 2 * b),
    r1 = Math.sqrt((a + d + D) / 2),
    r2 = Math.sqrt(Math.max(0, (a + d - D) / 2)),
    extent =
      3.6 *
      Math.sqrt(
        Math.max(
          ...m.stages.flatMap((s) => [s.covariance[0][0], s.covariance[2][2]]),
        ),
      ),
    scale = 99 / extent,
    X = (x) => 155 + scale * x,
    Y = (y) => 145 - scale * y,
    ellipse = Array.from({ length: 73 }, (_, j) => {
      const t = (j / 72) * 2 * Math.PI,
        x =
          r1 * Math.cos(t) * Math.cos(angle) -
          r2 * Math.sin(t) * Math.sin(angle),
        y =
          r1 * Math.cos(t) * Math.sin(angle) +
          r2 * Math.sin(t) * Math.cos(angle);
      return `${X(x)},${Y(y)}`;
    }).join("L"),
    pts = m.samples[k]
      .slice(0, 128)
      .map(
        (x) =>
          `<circle cx="${X(x[0] - m.stages[k].mean[0])}" cy="${Y(x[2] - m.stages[k].mean[2])}" r="1.5" fill="#40879a" opacity=".35"/>`,
      )
      .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 310 300" role="img" aria-label="${NAMES[k]}的零均值R/B噪声、解析1σ椭圆和同一批观测" style="font:12px sans-serif"><text x="20" y="21">${NAMES[k]}</text><path d="M43 145H267M155 46V244" stroke="currentColor" opacity=".25"/><path d="M${ellipse}" fill="none" stroke="#bb7946" stroke-width="1.6"/>${pts}${[-extent, 0, extent].map((v) => `<text x="${X(v)}" y="268" text-anchor="middle">${v.toFixed(0)}</text><text x="39" y="${Y(v) + 4}" text-anchor="end">${v.toFixed(0)}</text>`).join("")}<text x="260" y="292" text-anchor="end">Δ${k === 2 ? "Y₁" : "R"} / e_ref</text><text x="18" y="73">Δ${k === 2 ? "Y₃" : "B"}</text></svg>`;
}
export function covarianceTable(m, k = 2) {
  const t = m.truth[k].covariance,
    s = m.measured[k].covariance;
  return `<table><caption>${NAMES[k]}协方差 / e_ref²：解析值 / 样本值</caption><thead><tr><th></th>${[1, 2, 3].map((i) => `<th>Y${i}</th>`).join("")}</tr></thead><tbody>${t.map((row, i) => `<tr><th>Y${i + 1}</th>${row.map((v, j) => `<td>${v.toFixed(1)} / ${s[i][j].toFixed(1)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
