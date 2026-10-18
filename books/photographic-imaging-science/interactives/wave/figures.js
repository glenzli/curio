import { wavefront, indexAt, circularOtf } from "./model.js";
import { diskIntensity } from "./circle-reference.js";
import { HALF_FIELD_UM, REFERENCE_PEAK } from "./reading.js";
const fmt = (n, d = 3) => n.toFixed(d);
export function drawPupil(canvas, g, point, aberrations) {
  const size = 512,
    c = size / 2,
    ctx = canvas.getContext("2d");
  canvas.width = canvas.height = size;
  ctx.fillStyle = "#10171c";
  ctx.fillRect(0, 0, size, size);
  const radius = aberrations ? 216 : ((point.diameterMm / 30) * size) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, radius, 0, 2 * Math.PI);
  ctx.clip();
  if (!aberrations) {
    ctx.fillStyle = "#35bac0";
    ctx.fillRect(0, 0, size, size);
  } else {
    const texture = document.createElement("canvas");
    texture.width = texture.height = 256;
    const image = texture.getContext("2d").createImageData(256, 256);
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++) {
        const u = ((x - 127.5) * 2) / 216,
          v = ((127.5 - y) * 2) / 216,
          phase = 2 * Math.PI * wavefront(u, v, g.p),
          hue = phase + Math.PI,
          k = (y * 256 + x) * 4;
        for (let ch = 0; ch < 3; ch++)
          image.data[k + ch] =
            140 + 105 * Math.cos(hue - (ch * 2 * Math.PI) / 3);
        image.data[k + 3] = 255;
      }
    texture.getContext("2d").putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(texture, 0, 0, size, size);
  }
  if (!aberrations && point.strips < 32) {
    const edge = c - radius + (2 * radius * point.strips) / 32;
    ctx.fillStyle = "#091016aa";
    ctx.fillRect(edge, 0, size - edge, size);
    ctx.fillStyle = "#f1b56bb0";
    ctx.fillRect(edge, 0, Math.max(2, (2 * radius) / 32), size);
  }
  ctx.restore();
  ctx.strokeStyle = "#8cdee0";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(c, c, radius, 0, 2 * Math.PI);
  ctx.stroke();
  if (!aberrations) {
    ctx.strokeStyle = "#b2bfc7";
    ctx.lineWidth = 1;
    const base = size - 54;
    ctx.beginPath();
    ctx.moveTo(c - radius, base);
    ctx.lineTo(c + radius, base);
    ctx.moveTo(c - radius, base - 7);
    ctx.lineTo(c - radius, base + 7);
    ctx.moveTo(c + radius, base - 7);
    ctx.lineTo(c + radius, base + 7);
    ctx.stroke();
    ctx.fillStyle = "#e0e8ee";
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`D = ${fmt(point.diameterMm, 2)} mm`, c, size - 18);
  }
}
export function drawPsf(canvas, g, enhanced, aberrations = false) {
  const size = 384,
    ctx = canvas.getContext("2d"),
    image = ctx.createImageData(size, size),
    span = HALF_FIELD_UM;
  let radial;
  if (!aberrations) {
    const maxQ = (Math.SQRT2 * span) / g.scaleUm;
    radial = Float64Array.from(
      { length: 4097 },
      (_, i) =>
        (Math.PI / (4 * g.scaleUm ** 2)) * diskIntensity((maxQ * i) / 4096),
    );
  }
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const ux = ((x + 0.5) / size - 0.5) * 2 * span,
        uy = ((y + 0.5) / size - 0.5) * 2 * span;
      let value;
      if (radial) {
        const r = (Math.hypot(ux, uy) / (Math.SQRT2 * span)) * 4096,
          a = Math.min(4095, Math.floor(r));
        value = radial[a] * (1 - (r - a)) + radial[a + 1] * (r - a);
      } else {
        const i = ux / g.imageStepUm,
          j = uy / g.imageStepUm,
          a = Math.floor(i),
          b = Math.floor(j),
          u = i - a,
          v = j - b;
        value =
          (1 - u) * (1 - v) * g.psf[indexAt(g, a, b)] +
          u * (1 - v) * g.psf[indexAt(g, a + 1, b)] +
          (1 - u) * v * g.psf[indexAt(g, a, b + 1)] +
          u * v * g.psf[indexAt(g, a + 1, b + 1)];
      }
      const relative = value / REFERENCE_PEAK,
        gray =
          255 *
          Math.max(
            0,
            Math.min(
              1,
              enhanced
                ? Math.log1p(1000 * relative) / Math.log(1001)
                : relative,
            ),
          ),
        k = (y * size + x) * 4;
      image.data[k] = image.data[k + 1] = image.data[k + 2] = gray;
      image.data[k + 3] = 255;
    }
  canvas.width = canvas.height = size;
  ctx.putImageData(image, 0, 0);
}
export function crosshair(point) {
  const x = 130 + (point.probeUm / HALF_FIELD_UM) * 130;
  return `<svg viewBox="0 0 260 260" aria-hidden="true"><path d="M${x - 9} 130h18M${x} 121v18" stroke="#f6b75b" stroke-width="1.7"/><circle cx="${x}" cy="130" r="4" fill="none" stroke="#f6b75b" stroke-width="1"/></svg>`;
}
export function phasors(point) {
  const trace = point.trace,
    last = point.strips,
    peak = Math.max(...trace.flatMap((z) => z.map(Math.abs))),
    radius = Math.max(0.05, Math.ceil(peak * 12) / 10),
    x = (v) => 130 + (v / radius) * 100,
    y = (v) => 128 - (v / radius) * 100;
  const path = trace
      .map((z, i) => `${i ? "L" : "M"}${x(z[0])},${y(z[1])}`)
      .join(" "),
    shown = trace
      .slice(0, last + 1)
      .map((z, i) => `${i ? "L" : "M"}${x(z[0])},${y(z[1])}`)
      .join(" "),
    end = trace[last];
  return `<svg viewBox="0 0 260 260" role="img" aria-label="在同一像点依次累加32条瞳带的复振幅"><circle cx="130" cy="128" r="100" stroke="currentColor" fill="none" opacity=".12"/><path d="M20 128H240M130 20V238" stroke="currentColor" opacity=".25"/><path d="${path}" stroke="currentColor" opacity=".12" fill="none"/><path d="${shown}" fill="none" stroke="#648cac" stroke-width="2.5"/><path d="M130 128L${x(end[0])} ${y(end[1])}" stroke="#c68a40" stroke-width="2"/><circle cx="${x(end[0])}" cy="${y(end[1])}" r="4" fill="#c68a40"/><text x="242" y="148" text-anchor="end">Re</text><text x="139" y="20">Im</text><text x="18" y="254">${last}/32 条带 · 坐标半径 ${fmt(radius, 2)}</text></svg>`;
}
export function overlap(rho, aberrated, z) {
  if (aberrated) {
    const x = 130 + 100 * z[0],
      y = 130 - 100 * z[1];
    return `<svg viewBox="0 0 260 260" role="img" aria-label="所选频率的复OTF"><circle cx="130" cy="130" r="100" fill="none" stroke="currentColor" opacity=".2"/><path d="M20 130H244M130 240V15" stroke="currentColor" opacity=".25"/><path d="M130 130L${x} ${y}" stroke="#ad844d" stroke-width="3"/><circle cx="${x}" cy="${y}" r="4" fill="#ad844d"/><text x="239" y="149">Re</text><text x="140" y="21">Im</text><text x="130" y="254" text-anchor="middle">|H| = ${fmt(Math.hypot(...z))}</text></svg>`;
  }
  const r = Math.min(55, 105 / (1 + rho)),
    d = 2 * r * rho;
  return `<svg viewBox="0 0 260 260" role="img" aria-label="两份圆瞳按所选空间频率平移后的重叠"><circle cx="${130 - d / 2}" cy="121" r="${r}" fill="#648cac" fill-opacity=".35" stroke="#648cac"/><circle cx="${130 + d / 2}" cy="121" r="${r}" fill="#ad844d" fill-opacity=".35" stroke="#ad844d"/><text x="130" y="210" text-anchor="middle">${rho >= 1 ? "圆瞳已分离，传递为零" : `重叠面积 / π = ${fmt(circularOtf(rho))}`}</text><text x="130" y="240" text-anchor="middle">中心距 ${fmt(2 * rho, 2)} 个瞳半径</text></svg>`;
}
