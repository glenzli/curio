import { arrivals, partialCounts, parameters, distribution } from "./model.js";
export const incoming = "#618ca6",
  collected = "#4c846c";
export function eventFigure(input = {}, progress = 100) {
  const p = parameters(input),
    events = arrivals(p),
    fraction = progress / 100;
  const counts = partialCounts(events, fraction),
    x = (t) => 75 + 500 * t;
  let body = '<text x="75" y="22">同一次曝光的到达事件</text>';
  for (const [at, label] of [
    [65, "入射"],
    [125, "收集"],
  ])
    body += `<text x="16" y="${at + 4}">${label}</text><path d="M75 ${at}H575" stroke="currentColor" opacity=".2"/>`;
  for (const event of events.filter((e) => e.time <= fraction)) {
    const column = x(event.time);
    body += `<path d="M${column} 57V73" stroke="${incoming}" stroke-width="2"/>`;
    if (event.kept)
      body += `<path d="M${column} 77V117" stroke="${collected}" opacity=".25"/><circle cx="${column}" cy="125" r="3" fill="${collected}"/>`;
  }
  body += `<path d="M${x(fraction)} 42V143" stroke="currentColor" stroke-dasharray="3 4"/>`;
  for (const t of [0, 0.25, 0.5, 0.75, 1])
    body += `<text x="${x(t)}" y="167" text-anchor="middle">${t}</text>`;
  body += `<text x="325" y="191" text-anchor="middle">曝光时间的比例 t / T</text><text x="75" y="219">此刻入射 ${counts.photons} 个光子，收集 ${counts.electrons} 个电子</text>`;
  return `<svg viewBox="0 0 620 235" role="img" aria-label="入射事件与被收集事件的时间标记；连线只表示筛选关系">${body}</svg>`;
}
export function histogramFigure(input, samples) {
  const p = parameters(input),
    inPmf = distribution({ ...p, eta: 1 }),
    outPmf = distribution(p);
  const maximum = Math.max(
    p.incident + 4,
    ...samples.map((s) => s.photons),
    ...samples.map((s) => s.electrons),
  );
  const photons = Array(maximum + 1).fill(0),
    electrons = Array(maximum + 1).fill(0);
  for (const s of samples) {
    photons[s.photons]++;
    electrons[s.electrons]++;
  }
  const limit =
    Math.max(
      ...inPmf,
      ...outPmf,
      ...photons.map((v) => v / samples.length),
      ...electrons.map((v) => v / samples.length),
    ) * 1.15;
  const x = (v) => 55 + ((v + 0.5) / (maximum + 1)) * 530,
    y = (v) => 221 - (v / limit) * 177,
    unit = 530 / (maximum + 1);
  let body = '<text x="55" y="21">完整曝光的计数分布 · 相对频数 / 概率</text>';
  for (let k = 0; k <= maximum; k++) {
    body += `<rect x="${x(k) - 0.34 * unit}" y="${y(photons[k] / samples.length)}" width="${0.32 * unit}" height="${221 - y(photons[k] / samples.length)}" fill="${incoming}" opacity=".55"/><rect x="${x(k) + 0.02 * unit}" y="${y(electrons[k] / samples.length)}" width="${0.32 * unit}" height="${221 - y(electrons[k] / samples.length)}" fill="${collected}" opacity=".7"/>`;
  }
  for (const [pmf, color] of [
    [inPmf, incoming],
    [outPmf, collected],
  ]) {
    const points = pmf
      .slice(0, maximum + 1)
      .map((v, i) => `${i ? "L" : "M"}${x(i)} ${y(v)}`)
      .join(" ");
    body += `<path d="${points}" fill="none" stroke="${color}" stroke-width="1.8" stroke-dasharray="4 3"/>`;
  }
  for (let i = 0; i <= 4; i++) {
    const count = Math.round((maximum * i) / 4),
      value = (limit * i) / 4;
    body += `<text x="${x(count)}" y="244" text-anchor="middle">${count}</text><text x="47" y="${y(value) + 4}" text-anchor="end">${value.toFixed(2)}</text>`;
  }
  body +=
    '<text x="320" y="273" text-anchor="middle">光子数或电子数 · 每次完整曝光</text>';
  return `<svg viewBox="0 0 620 288" role="img" aria-label="多次完整曝光的入射光子、电子直方图和精确分布">${body}</svg>`;
}
