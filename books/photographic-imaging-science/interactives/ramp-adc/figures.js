import { rampState } from "./model.js";
export function rampFigure(input = {}) {
  const m = rampState(input),
    x = (f) => 60 + 520 * f,
    y = (v) => 222 - (v / m.p.fullScale) * 158;
  const colors = ["#5689a5", "#b38349", "#947aa4"];
  let body =
    '<text x="60" y="22">共同斜坡与三个保持不变的输入</text><path d="M60 222H580" stroke="currentColor" opacity=".25"/>';
  body += `<path d="M60 222L580 ${y(m.p.fullScale)}" fill="none" stroke="#56816a" stroke-width="2.4"/><path d="M${x(m.p.progress / 100)} 40V228" stroke="currentColor" stroke-dasharray="3 4"/>`;
  m.channels.forEach((c, i) => {
    body += `<path d="M60 ${y(c.voltage)}H580" stroke="${colors[i]}" stroke-width="1.5" stroke-dasharray="5 4"/><text x="584" y="${y(c.voltage) + 4}">${["A", "B", "C"][i]}</text>`;
    if (c.crossingUs !== null && !c.underRange && c.crossed)
      body += `<circle cx="${x(c.fraction)}" cy="${y(c.voltage)}" r="4" fill="${colors[i]}"/>`;
  });
  for (let i = 0; i <= 4; i++) {
    body += `<text x="${x(i / 4)}" y="249" text-anchor="middle">${((m.totalUs * i) / 4).toFixed(2)}</text><text x="50" y="${y((m.p.fullScale * i) / 4) + 4}" text-anchor="end">${((m.p.fullScale * i) / 4).toFixed(2)}</text>`;
  }
  body +=
    '<text x="60" y="42">V</text><text x="320" y="278" text-anchor="middle">真实扫描时间 / µs</text>';
  return `<svg viewBox="0 0 620 295" role="img" aria-label="上升斜坡、输入A/B/C、交叉时刻和扫描进度">${body}</svg>`;
}
export function clockFigure(input = {}) {
  const m = rampState(input),
    c = m.channels[0],
    center = Math.max(3, Math.min(m.levels - 4, c.code));
  const first = center - 3,
    last = center + 4,
    x = (tick) => 65 + ((tick - first) / (last - first)) * 510;
  let body = '<text x="65" y="21">A附近的时钟 · 放大至7个周期</text>';
  for (let k = first; k < last; k++) {
    const past = k <= m.clockCount;
    body += `<path d="M${x(k)} 70H${x(k + 0.5)}V42H${x(k + 1)}V70" stroke="currentColor" fill="none" opacity="${past ? 0.7 : 0.16}"/><text x="${x(k + 0.5)}" y="97" text-anchor="middle">${k}</text>`;
  }
  const crossing = c.fraction * m.levels;
  if (crossing >= first && crossing <= last)
    body += `<path d="M${x(crossing)} 31V104" stroke="#5689a5" stroke-width="2"/><text x="${x(crossing)}" y="129" text-anchor="middle">交叉时刻 ${(c.crossingUs ?? 0).toFixed(4)} µs</text>`;
  body +=
    '<text x="320" y="157" text-anchor="middle">数字为区间内计数；在交叉时刻锁存向下取整的计数</text>';
  return `<svg viewBox="0 0 620 174" role="img" aria-label="输入A附近的局部时钟和理想锁存约定">${body}</svg>`;
}
