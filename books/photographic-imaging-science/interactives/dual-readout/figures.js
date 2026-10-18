import { dualMetrics, dualMoments } from "./model.js";
function sequenceSteps(input, example, first) {
  const shared = input.mode !== "independent";
  const names = shared
    ? ["一次积分", "高增益读出", "低增益读出", "归一化与融合"]
    : ["第一次积分", "高增益读出", "再次积分与读出", "归一化与融合"];
  const details = [
    `S₁=${example.chargeH} e⁻`,
    `H=${first.high.toFixed(2)} e⁻`,
    shared
      ? `同一S₁；L=${first.low.toFixed(2)} e⁻`
      : `S₂=${example.chargeL} e⁻；L=${first.low.toFixed(2)} e⁻`,
    `融合=${first.fused.toFixed(2)} e⁻`,
  ];
  return names.map((name, i) => ({
    name,
    detail: details[i],
    start: [0, 30, 60, 85][i],
  }));
}
export function readoutCards(input, example, first, progress = 100) {
  const steps = sequenceSteps(input, example, first);
  const current = steps.findLastIndex((step) => progress >= step.start);
  return (
    '<h4>一组读出的步骤 · 第一组生成数据</h4><ol class="dual-steps">' +
    steps
      .map(
        (step, i) =>
          `<li aria-current="${i === current ? "step" : "false"}" data-ready="${progress >= step.start}"><span>${i + 1} ${step.name}</span><strong>${step.detail}</strong></li>`,
      )
      .join("") +
    '</ol><p class="dual-key">步骤间隔只作展示；电荷来自一次积分，或两次独立积分。</p>'
  );
}
export function readoutSequence(input = {}, example, first, progress = 100) {
  const steps = sequenceSteps(input, example, first);
  let body = '<text x="25" y="22">一组读出的步骤 · 第一组生成数据</text>';
  for (let i = 0; i < 4; i++) {
    const active = progress >= steps[i].start,
      x = 25 + i * 148;
    const lines = steps[i].detail.split("；");
    body += `<g opacity="${active ? 1 : 0.2}"><rect x="${x}" y="47" width="135" height="77" rx="5" fill="none" stroke="currentColor" opacity=".55"/><text x="${x + 8}" y="69">${i + 1} ${steps[i].name}</text>${lines.map((line, j) => `<text x="${x + 8}" y="${lines.length > 1 ? 90 + 21 * j : 97}">${line}</text>`).join("")}</g>`;
    if (i < 3) body += `<path d="M${x + 138} 85h7" stroke="currentColor"/>`;
  }
  body +=
    '<text x="25" y="151">步骤间隔只作展示；电子计数来自同一次积分，或两次独立积分。</text>';
  return `<svg viewBox="0 0 620 168" role="img" aria-label="积分、高低增益读数及归一化融合的分步展示">${body}</svg>`;
}
export function scatterFigure(input, records) {
  const m = dualMetrics(input),
    observed = dualMoments(records.samples),
    selected = records.samples.slice(0, 256),
    linear = !records.highClipped && !records.lowClipped;
  const bounds = (key) => {
    const values = selected.map((s) => s[key]),
      pad = Math.max(
        2,
        4 *
          Math.sqrt(
            key === "high" ? observed.highVariance : observed.lowVariance,
          ),
      );
    const center = observed.means[key];
    return [
      Math.min(...values, center - pad),
      Math.max(...values, center + pad),
    ];
  };
  const [xmin, xmax] = bounds("high"),
    [ymin, ymax] = bounds("low");
  const x = (v) => 66 + ((v - xmin) / (xmax - xmin)) * 500,
    y = (v) => 248 - ((v - ymin) / (ymax - ymin)) * 193;
  let body = '<text x="66" y="23">归一化后的成对观测 · 显示前256组</text>';
  for (let i = 0; i <= 4; i++) {
    const u = xmin + ((xmax - xmin) * i) / 4,
      v = ymin + ((ymax - ymin) * i) / 4;
    body += `<path d="M66 ${y(v)}H566" stroke="currentColor" opacity=".08"/><text x="${x(u)}" y="272" text-anchor="middle">${u.toFixed(1)}</text><text x="58" y="${y(v) + 4}" text-anchor="end">${v.toFixed(1)}</text>`;
  }
  for (const s of selected)
    body += `<circle cx="${x(s.high)}" cy="${y(s.low)}" r="2" fill="#5e8da3" opacity=".45"/>`;
  if (linear) {
    const a = Math.sqrt(m.cov[0][0]),
      b = a ? m.cov[0][1] / a : 0,
      d = Math.sqrt(Math.max(0, m.cov[1][1] - b * b));
    const points = Array.from({ length: 129 }, (_, i) => {
      const t = (i / 128) * 2 * Math.PI,
        dx = a * Math.cos(t),
        dy = b * Math.cos(t) + d * Math.sin(t);
      return `${i ? "L" : "M"}${x(m.p.mean + dx)} ${y(m.p.mean + dy)}`;
    }).join(" ");
    body += `<path d="${points}" fill="none" stroke="#b38349" stroke-width="2" stroke-dasharray="4 4"/>`;
  }
  body +=
    '<text x="66" y="42">L / e⁻</text><text x="316" y="301" text-anchor="middle">H / e⁻ · 两轴各自标刻度</text>';
  return `<svg viewBox="0 0 620 318" role="img" aria-label="高低增益读数散点及裁切前协方差的一倍标准差椭圆">${body}</svg>`;
}
