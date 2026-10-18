import { plot } from "../common/ui.js";
export function rampFigure(m) {
  const c = m.columns[m.column];
  return plot({
    curves: [
      {
        name: "实际斜坡",
        color: "#40879a",
        points: Array.from({ length: 101 }, (_, j) => {
          const t = j / 100;
          return [t * m.totalUs, t + m.curvature * t * (1 - t)];
        }),
      },
      {
        name: "理想线性斜坡",
        color: "#999999",
        dashed: true,
        points: [
          [0, 0],
          [m.totalUs, 1],
        ],
      },
      {
        name: "所选列的输入电压",
        color: "#bb7946",
        points: [
          [0, c.voltage],
          [m.totalUs, c.voltage],
        ],
      },
    ],
    xMax: m.totalUs,
    yMax: Math.max(1, c.voltage),
    xLabel: "转换时间 / µs",
    yLabel: "电压 / V",
    title: "固定时钟与非线性斜坡的交叉",
    markers: [
      { value: m.tau * m.totalUs, label: "当前" },
      ...(c.truth.fraction === null
        ? []
        : [
            {
              value: c.truth.fraction * m.totalUs,
              label: "交叉",
              color: "#bb7946",
            },
          ]),
    ],
    leftPadding: 72,
    rightPadding: 28,
    bottomPadding: 50,
  });
}
export function errorFigure(m, kind = "dnl") {
  const values = kind === "dnl" ? m.dnl : m.inl,
    truth = kind === "dnl" ? m.dnlTruth : m.inlTruth,
    extent = Math.max(0.05, ...values.map(Math.abs));
  return plot({
    curves: [
      {
        name: kind.toUpperCase(),
        color: "#40879a",
        points: values.map((v, k) => [k, v]),
      },
    ],
    samples: truth.flatMap((v, k) =>
      k % Math.max(1, Math.floor(m.L / 8)) === 0 ? [[k, v]] : [],
    ),
    xMax: kind === "dnl" ? m.L - 1 : m.L,
    yMin: -extent * 1.1,
    yMax: extent * 1.1,
    xLabel: kind === "dnl" ? "码区间 k" : "阈值序号 k",
    yLabel: kind.toUpperCase() + " / 理想LSB",
    title:
      kind === "dnl"
        ? "码宽偏差与解析真值"
        : "相对固定零点/满量程直线的阈值偏差",
    leftPadding: 85,
    rightPadding: 28,
    bottomPadding: 50,
  });
}
export function columnFigure(m) {
  const shade = (e) => Math.max(30, Math.min(225, 128 + e * 22));
  const row = (key, y, title) =>
    `<text x="18" y="${y + 20}">${title}</text>${m.columns
      .map((c, j) => {
        const g = Math.round(shade(key === "ideal" ? 0 : c[key]));
        return `<rect x="${170 + j * 36}" y="${y}" width="34" height="44" fill="rgb(${g},${g},${g})" stroke="currentColor" stroke-opacity=".12"/>${c.clipped ? `<text x="${187 + j * 36}" y="${y + 28}" fill="white" text-anchor="middle">×</text>` : ""}`;
      })
      .join("")}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 230" role="img" aria-label="列电压偏置、减暗场码与已知电压偏置归零的列纹对照" style="font:13px sans-serif"><text x="18" y="20">均匀输入；灰度表示列间DN差，非图像亮度。</text>${row("rawError", 40, "原始列间偏差")}${row("darkError", 99, "减暗场码后")}${row("ideal", 158, "电压偏置归零")}${m.columns.map((_, j) => `<text x="${187 + j * 36}" y="221" text-anchor="middle">${j}</text>`).join("")}</svg>`;
}
