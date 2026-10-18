import { sag, atlasState, paraxialRay } from "./model.js";
import { escape, number } from "../common/lesson-view.js";
export const GROUP_COLORS = [
  "#377b9d",
  "#bd8551",
  "#4d9184",
  "#8972a4",
  "#899c56",
];
const rayColor = "#327fa1";
const text = (x, y, s, size = 14, anchor = "start", color = "currentColor") =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${color}">${escape(s)}</text>`;
const poly = (pts, color, width = 1.4, dashed = false, opacity = 1) =>
  `<polyline points="${pts.map((p) => p.join(",")).join(" ")}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}"${dashed ? ' stroke-dasharray="5 4"' : ""}/>`;
function glassPath(d, e, px, py) {
  const front = d.surfaces[e.front],
    back = d.surfaces[e.back],
    h = Math.min(front.clear, back.clear),
    points = [];
  for (let i = 0; i <= 40; i++) {
    const y = -h + (2 * h * i) / 40;
    points.push([px(sag(front, y)), py(y)]);
  }
  for (let i = 40; i >= 0; i--) {
    const y = -h + (2 * h * i) / 40;
    points.push([px(sag(back, y)), py(y)]);
  }
  return "M" + points.map((p) => p.join(",")).join("L") + "Z";
}
function glass(d, px, py, selected = 0) {
  return d.elements
    .map((e) => {
      const active = !selected || selected === e.group + 1,
        color = GROUP_COLORS[e.group];
      return `<path data-group="${e.group + 1}" d="${glassPath(d, e, px, py)}" fill="${color}" fill-opacity="${active ? 0.17 + 0.07 * (e.lens % 2) : 0.055}" stroke="${color}" stroke-opacity="${active ? 1 : 0.24}" stroke-width="${selected === e.group + 1 ? 2.4 : 1.4}"/>`;
    })
    .join("");
}
function partial(points, progress) {
  const k = progress * (points.length - 1),
    i = Math.floor(k),
    out = points.slice(0, i + 1);
  if (i < points.length - 1) {
    const a = points[i],
      b = points[i + 1],
      t = k - i;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}
export function localView(m, width = 860, height = 290, small = false) {
  const d = m.d,
    maxY = Math.max(...d.surfaces.map((s) => s.clear)),
    scale = Math.min((width - 80) / (d.last + 6), (height - 100) / (2 * maxY)),
    left = (width - d.last * scale) / 2,
    cy = (height + 20) / 2;
  const px = (z) => left + z * scale,
    py = (y) => cy - y * scale,
    clip = `atlas-${d.p.id}-${small ? "small" : "large"}`;
  let body = `<defs><clipPath id="${clip}"><rect x="10" y="50" width="${width - 20}" height="${height - 80}"/></clipPath></defs><path d="M20 ${cy}H${width - 20}" stroke="currentColor" opacity=".12"/>`;
  body += glass(d, px, py, m.selected);
  const sh = Math.min(maxY, d.stopRadius) * scale;
  body += `<path d="M${px(d.stop)} ${cy - maxY * scale - 6}V${cy - sh}M${px(d.stop)} ${cy + sh}V${cy + maxY * scale + 6}" stroke="currentColor" stroke-width="3"/>`;
  body += `<g clip-path="url(#${clip})">`;
  for (let i = 0; i < m.rays.length; i += 5) {
    const r = m.rays[i];
    body += poly(
      partial(r.points, m.progress).map(([z, y]) => [px(z), py(y)]),
      rayColor,
      small ? 1 : 1.35,
      false,
      0.7,
    );
  }
  body += "</g>";
  const xs = d.groups.map((g) => px((g.start + g.end) / 2)),
    labelXs = [...xs],
    gap = small ? 47 : 62;
  for (let i = 1; i < labelXs.length; i++)
    labelXs[i] = Math.max(labelXs[i], labelXs[i - 1] + gap);
  if (labelXs.at(-1) > width - 38) {
    labelXs[labelXs.length - 1] = width - 38;
    for (let i = labelXs.length - 2; i >= 0; i--)
      labelXs[i] = Math.min(labelXs[i], labelXs[i + 1] - gap);
  }
  for (const [i, g] of d.groups.entries()) {
    const color = GROUP_COLORS[i],
      h = Math.max(...g.elements.map((e) => d.surfaces[e.front].clear));
    body += `<path d="M${labelXs[i]} 33V43L${xs[i]} ${py(h) - 4}" fill="none" stroke="${color}" stroke-opacity=".65"/>`;
    body += text(labelXs[i], 25, `G${i + 1}`, small ? 14 : 17, "middle", color);
  }
  // The stop label sits below the glass to distinguish it from group markers.
  body += text(px(d.stop), height - 20, "光阑", small ? 11 : 13, "middle");
  const bar = d.last / 2 >= 5 ? 5 : d.last / 2 >= 2 ? 2 : 1,
    bx = width - 30 - bar * scale,
    by = height - 16;
  body +=
    `<path d="M${bx} ${by - 4}v8m0-4h${bar * scale}m0-4v8" stroke="currentColor" stroke-width="1.3"/>` +
    text(bx - 8, by + 4, number(bar, 0) + " mm", small ? 11 : 12, "end");
  return `<svg x="0" y="0" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}
function fullView(m, fanScale) {
  const d = m.d,
    xmin = -5,
    xmax = d.image + 3,
    maxY = Math.max(
      ...d.surfaces.map((s) => s.clear),
      ...m.rays.flatMap((r) => r.points.map((p) => Math.abs(p[1]))),
    ),
    scale = Math.min(490 / (xmax - xmin), 145 / (2 * maxY)),
    px = (z) => 28 + (z - xmin) * scale,
    py = (y) => 137 - y * scale;
  let body = text(18, 26, "全程光路 · 实线Snell / 虚线近轴", 15);
  body +=
    `<path d="M15 137H535" stroke="currentColor" opacity=".13"/>` +
    glass(d, px, py, m.selected);
  const h = d.stopRadius * scale;
  body += `<path d="M${px(d.stop)} ${137 - maxY * scale - 5}V${137 - h}M${px(d.stop)} ${137 + h}V${137 + maxY * scale + 5}" stroke="currentColor" stroke-width="2"/>`;
  for (let i = 0; i < m.rays.length; i += 5) {
    const r = m.rays[i];
    body += poly(
      partial(r.points, m.progress).map(([z, y]) => [px(z), py(y)]),
      rayColor,
      1.4,
      false,
      0.8,
    );
    const height = m.input.radius * (i / 10 - 1),
      theta = (m.input.angle * Math.PI) / 180;
    const ref = paraxialRay(d, height, theta),
      pts = [[-5, height - 5 * theta], ...ref.points, [d.image, ref.image]];
    if (r.passed)
      body += poly(
        partial(pts, m.progress).map(([z, y]) => [px(z), py(y)]),
        "#77818c",
        1,
        true,
        0.6,
      );
  }
  body +=
    `<path d="M${px(d.image)} 57V211" stroke="#ad793f" stroke-width="2"/>` +
    text(px(d.image), 237, "近轴像面", "13", "middle");
  body += text(
    18,
    265,
    `首面 → 像面 ${number(d.image)} mm；末面 → 像面 ${number(d.bfd)} mm`,
    13,
  );
  const fx = 600,
    fy = 140,
    fw = 220,
    fh = 82,
    lim = fanScale,
    ref = m.referenceHeight;
  body += text(590, 26, "像面高度 − 近轴参考 / μm", 15);
  body += `<path d="M${fx} ${fy - fh}V${fy + fh}H${fx + fw}M${fx} ${fy}H${fx + fw}" fill="none" stroke="currentColor" opacity=".2"/>`;
  for (const sign of [-1, 0, 1])
    body += text(fx - 8, fy - sign * fh + 4, String(sign * lim), 12, "end");
  let outside = 0,
    segment = [];
  for (const [i, r] of m.rays.entries()) {
    if (!r.passed) {
      if (segment.length) body += poly(segment, rayColor, 1.7);
      segment = [];
      continue;
    }
    const value = (r.image - ref) * 1000,
      x = fx + (fw * i) / 20,
      y = fy - (Math.max(-lim, Math.min(lim, value)) / lim) * fh;
    if (Math.abs(value) > lim) {
      outside++;
      if (segment.length) body += poly(segment, rayColor, 1.7);
      segment = [];
      body += `<path d="M${x - 3} ${y + (value > 0 ? 5 : -5)}L${x} ${y}L${x + 3} ${y + (value > 0 ? 5 : -5)}" fill="none" stroke="${rayColor}"/>`;
    } else segment.push([x, y]);
  }
  if (segment.length) body += poly(segment, rayColor, 1.7);
  body +=
    text(fx, 240, number(-m.input.radius, 1), 12, "middle") +
    text(fx + fw, 240, number(m.input.radius, 1), 12, "middle") +
    text(fx + fw / 2, 263, "首面入射高度 / mm", 13, "middle");
  body += text(
    fx + fw / 2,
    285,
    outside
      ? `${outside}条超出纵轴范围，边界以箭头标出`
      : "纵轴范围固定；改变范围不改变光线",
    12,
    "middle",
  );
  return `<svg x="0" y="0" width="860" height="300" viewBox="0 0 860 300" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}
export function drawing(m, fanScale = 20) {
  return `<svg class="drawing" role="img" aria-label="${escape(m.d.p.name)}的玻璃剖面、逐面光路与近轴对照" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 860 635"><style>text{font-family:inherit}</style>${text(18, 23, "镜组局部 · G按空气间隔编号，组内玻璃用同色", 15)}${localView(m).replace('x="0" y="0"', 'x="0" y="30"')}${fullView(m, fanScale).replace('x="0" y="0"', 'x="0" y="335"')}</svg>`;
}
export function overview() {
  let body =
    '<rect width="1120" height="1200" fill="#fff"/>' +
    text(38, 42, "图 16.2  六种典型镜片结构的玻璃剖面", 27);
  for (let type = 0; type < 6; type++) {
    const m = atlasState({ type }),
      d = m.d,
      x = 28 + (type % 2) * 548,
      y = 76 + Math.floor(type / 2) * 353;
    body +=
      `<g transform="translate(${x} ${y})"><rect width="520" height="333" rx="10" fill="#f8fafb" stroke="#d8dfe4"/>` +
      text(
        18,
        31,
        d.p.name + " · " + d.elements.length + "片" + d.groups.length + "组",
        22,
      ) +
      text(18, 56, d.p.subtitle, 15, "start", "#60717d");
    body += localView(m, 500, 210, true).replace(
      'x="0" y="0"',
      'x="10" y="66"',
    );
    body +=
      text(18, 295, `${d.p.patent}；f=50 mm，BFD=${number(d.bfd, 1)} mm`, 14) +
      text(
        18,
        318,
        `首面至像面 ${number(d.image, 1)} mm；局部放大，横纵等比例`,
        13,
        "start",
        "#60717d",
      ) +
      "</g>";
  }
  body +=
    text(
      38,
      1160,
      "G为以空气分开的镜组；组内不同玻璃之间的弯曲线为胶合界面。各格尺标独立，蓝线为同一单色光束。",
      16,
    ) +
    text(
      38,
      1187,
      "曲率、厚度与nD来自图中专利的数值例，统一缩放至计算焦距50 mm；净口径与所选光阑见互动处方。",
      15,
      "start",
      "#60717d",
    );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="1200" viewBox="0 0 1120 1200" role="img" aria-label="图 16.2 六种典型镜片结构的玻璃剖面" style="font:16px sans-serif;fill:#293842;color:#293842">${body}</svg>`;
}
