import { surfaces, sag, pairs } from "./model.js";
import { escape, number } from "../common/lesson-view.js";

const inks = ["#85adc2", "#397fa3", "#236688"];
export const legNames = ["首次向右", "反射①后向左", "反射②后向右"];

// The glass occupies the region between its actual spherical caps, including its rim.
export function glassProfiles() {
  return [
    [0, 1],
    [2, 3],
  ].map(([front, back], i) => {
    const left = surfaces[front],
      right = surfaces[back];
    const edge = (s, reverse) =>
      Array.from({ length: 81 }, (_, j) => {
        const y = s.clear * (-1 + (2 * (reverse ? 80 - j : j)) / 80);
        return [sag(s, y), y];
      });
    return {
      name: `镜片${i + 1}`,
      front,
      back,
      n: left.right,
      points: [...edge(left, false), ...edge(right, true)],
    };
  });
}

// Each displayed segment keeps its original endpoints and propagation direction.
// A reflection changes the leg only after the ray reaches that event.
export function pathProjection(ray, progress) {
  const count = progress * (ray.points.length - 1),
    reached = ray.interactions.filter(
      (e) => ray.points.indexOf(e.point) <= count + 1e-12,
    );
  let leg = 0;
  const segments = [];
  for (let i = 0; i < ray.points.length - 1; i++) {
    const from = ray.points[i],
      to = ray.points[i + 1],
      event = ray.interactions.find((e) => e.point === from);
    if (event?.kind === "R") leg++;
    if (i >= count) break;
    const fraction = Math.min(1, count - i);
    segments.push({
      from,
      to: fraction === 1 ? to : from.map((v, j) => v + fraction * (to[j] - v)),
      leg,
      index: i,
    });
  }
  const latest = reached.at(-1),
    next = ray.interactions.find(
      (e) => ray.points.indexOf(e.point) > count + 1e-12,
    );
  const label = (e) => (e ? `S${e.index + 1}` : "入射");
  const complete = progress === 1;
  const location = complete
    ? ray.reason
      ? ray.reason
      : "到达像面"
    : `${label(latest)} → ${next ? label(next) : ray.reason ? "截断位置" : "像面"}`;
  const currentLeg = reached.filter((e) => e.kind === "R").length;
  return { segments, reached, latest, next, complete, currentLeg, location };
}

const plotStyle = `.ghost-plot,.ghost-views{--g0:#85adc2;--g1:#397fa3;--g2:#236688;--gd:#969fa6}.ghost-plot text{fill:currentColor;font-family:inherit}.ghost-plot .g0{stroke:var(--g0)}.ghost-plot .g1{stroke:var(--g1)}.ghost-plot .g2{stroke:var(--g2)}@supports(color:color-mix(in srgb,black,white)){.ghost-plot,.ghost-views{--g0:color-mix(in srgb,currentColor 10%,#85adc2);--g1:color-mix(in srgb,currentColor 10%,#397fa3);--g2:color-mix(in srgb,currentColor 30%,#236688);--gd:color-mix(in srgb,currentColor 35%,#a2adb3)}}`;
const path = (points, x, y) =>
  points.map((p, i) => `${i ? "L" : "M"}${x(p[0])} ${y(p[1])}`).join(" ");

function view(m, { minZ, maxZ, bound, height, id, local }) {
  const left = 44,
    right = 680,
    top = local ? 110 : 28,
    bottom = local ? 270 : height - 40;
  const x = (z) => left + ((z - minZ) / (maxZ - minZ)) * (right - left),
    y = (v) => (top + bottom) / 2 - (v * (bottom - top)) / (2 * bound);
  const planned = pairs[m.p.pair],
    center = m.secondary[20],
    p = pathProjection(center, m.p.progress);
  const active = p.next ?? p.latest;
  let body = `<defs><clipPath id="${id}"><rect x="${left}" y="${top}" width="${right - left}" height="${bottom - top}"/></clipPath>${inks.map((color, i) => `<marker id="${id}-arrow-${i}" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" refX="10" refY="5.5" orient="auto"><path d="M1 1L10 5.5L1 10Z" fill="var(--g${i},${color})" stroke="var(--paper,#fff)" stroke-width=".65"/></marker>`).join("")}</defs>`;
  body += `<path d="M${left} ${y(0)}H${right}" stroke="currentColor" opacity=".15"/><g clip-path="url(#${id})">`;
  for (const lens of glassProfiles())
    body += `<path data-glass="${lens.front + 1}-${lens.back + 1}" d="${path(lens.points, x, y)}Z" fill="currentColor" fill-opacity=".075" stroke="currentColor" stroke-opacity=".3" stroke-width=".8"/>`;
  for (let i = 0; i < m.primary.length; i += 10) {
    const r = m.primary[i];
    body += `<path d="${path(r.points, x, y)}" fill="none" stroke="var(--gd,#969fa6)" stroke-width="1.1" stroke-dasharray="2 4" opacity=".7"/>`;
  }
  let arrows = "";
  const legs = [[], [], []];
  for (let i = 0; i < m.secondary.length; i += 10) {
    const r = m.secondary[i],
      projection = pathProjection(r, m.p.progress);
    for (const s of projection.segments) {
      const central = i === 20;
      legs[s.leg].push(
        `<path class="g${s.leg}" data-leg="${s.leg}" d="${path([s.from, s.to], x, y)}" fill="none" stroke="${inks[s.leg]}" stroke-width="${central ? 2.6 + s.leg * 0.25 : 1.35 + s.leg * 0.25}" ${s.leg === 1 ? 'stroke-dasharray="6 3"' : ""} opacity="${central ? 1 : 0.68}"/>`,
      );
    }
    if (i === 20) {
      // Put one arrow on the longest visible segment of each leg; draw it last.
      for (let leg = 0; leg < 3; leg++) {
        const candidates = projection.segments
          .filter((s) => s.leg === leg)
          .map((s) => {
            const lo = Math.max(minZ, Math.min(s.from[0], s.to[0])),
              hi = Math.min(maxZ, Math.max(s.from[0], s.to[0]));
            return { ...s, lo, hi, length: Math.max(0, hi - lo) };
          })
          .sort((a, b) => b.length - a.length);
        const s = candidates[0];
        if (!s || s.length < 0.5) continue;
        const direction = Math.sign(s.to[0] - s.from[0]),
          z = direction > 0 ? s.lo + 0.65 * s.length : s.hi - 0.65 * s.length;
        const at = (z) => [
          z,
          s.from[1] +
            ((z - s.from[0]) * (s.to[1] - s.from[1])) / (s.to[0] - s.from[0]),
        ];
        arrows += `<path class="g${leg}" d="${path([at(z - direction * 0.15), at(z)], x, y)}" fill="none" stroke="${inks[leg]}" stroke-width="2.4" marker-end="url(#${id}-arrow-${leg})"/>`;
      }
      let reflection = 0,
        transmissionMarks = "",
        reflectionMarks = "";
      for (const e of projection.reached) {
        if (e.kind === "R") reflection++;
        const point = e.point,
          fill =
            e.kind === "R"
              ? `var(--g${reflection},${inks[reflection]})`
              : "var(--paper,#fff)";
        const mark = `<circle cx="${x(point[0])}" cy="${y(point[1])}" r="${e.kind === "R" ? 4.5 : 2.7}" fill="${fill}" stroke="var(--g${reflection},${inks[reflection]})" stroke-width="1.4"/>`;
        if (e.kind === "R") reflectionMarks += mark;
        else transmissionMarks += mark;
      }
      arrows += transmissionMarks + reflectionMarks;
      if (projection.complete && r.reason) {
        const a = r.points.at(-1);
        arrows += `<path d="M${x(a[0]) - 4} ${y(a[1]) - 4}l8 8m-8 0l8-8" stroke="currentColor" stroke-width="2"/>`;
      }
    }
  }
  // Keep the return dashes visible where a later forward leg overlaps them.
  body += legs[0].join("") + legs[2].join("") + legs[1].join("");
  for (let i = 0; i < surfaces.length; i++) {
    const s = surfaces[i],
      points = Array.from({ length: 81 }, (_, j) => {
        const v = -s.clear + (2 * s.clear * j) / 80;
        return [sag(s, v), v];
      });
    body += `<path d="${path(points, x, y)}" fill="none" stroke="currentColor" stroke-width="${active?.index === i ? 2.2 : 1.4}"/>`;
  }
  body += `<path d="M${x(8)} ${y(bound)}V${y(m.p.stop)}M${x(8)} ${y(-m.p.stop)}V${y(-bound)}" stroke="currentColor" stroke-width="4"/>`;
  if (m.p.sensor <= maxZ)
    body += `<path d="M${x(m.p.sensor)} ${top}V${bottom}" stroke="currentColor" stroke-width="3"/>`;
  body += arrows + "</g>";
  if (local) {
    for (const lens of glassProfiles()) {
      const a = surfaces[lens.front].z,
        b = surfaces[lens.back].z;
      body += `<text x="${x((a + b) / 2)}" y="26" class="ghost-label" text-anchor="middle" style="font-size:15px">${lens.name} · n=${lens.n.toFixed(2)}</text><path d="M${x(a)} 43V36H${x(b)}V43" fill="none" stroke="currentColor" opacity=".45"/>`;
    }
    for (let i = 0; i < surfaces.length; i++) {
      const s = surfaces[i],
        selected = planned.indexOf(i),
        badge = selected < 0 ? "" : ` · ${selected ? "②" : "①"}`;
      body += `<text x="${x(s.z)}" y="72" class="ghost-label" text-anchor="middle" style="font-size:15px;${active?.index === i ? "font-weight:700" : ""}">S${i + 1}${badge}</text><path d="M${x(s.z)} 81L${x(sag(s, s.clear))} ${y(s.clear) - 4}" stroke="currentColor" stroke-width=".8" opacity=".3"/>`;
    }
    body += `<text x="${x(8)}" y="72" class="ghost-label" text-anchor="middle" style="font-size:14px">光阑</text>`;
  }
  const ticks = local
    ? [-4, 0, 4, 8, 12, 15, 18]
    : Array.from({ length: Math.floor(maxZ / 20) + 1 }, (_, i) => i * 20);
  for (const z of ticks)
    body += `<path d="M${x(z)} ${bottom + 5}v4" stroke="currentColor" opacity=".3"/><text x="${x(z)}" y="${bottom + 23}" text-anchor="middle" style="font-size:13px">${z}</text>`;
  body += `<text x="360" y="${height - 3}" text-anchor="middle" style="font-size:13px">z / mm · y 范围 ±${number(bound, 1)} mm${local ? "" : ""} · 横纵比例不同</text>`;
  return `<svg class="drawing ghost-plot ${local ? "ghost-local" : "ghost-whole"}" role="img" aria-label="${local ? "镜片1的S1/S2与镜片2的S3/S4，反射面编号和往返光路" : "主光路与双反射光路直到像面"}" viewBox="0 0 720 ${height}"><style>${plotStyle}</style>${body}</svg>`;
}

function route(m, projection) {
  const reached = projection.reached.length;
  let reflection = 0;
  return `<div class="ghost-route" aria-label="选中反射路径的完整顺序">${m.ghostPath
    .map(([index, kind], i) => {
      if (kind === "R") reflection++;
      const state =
        i < reached
          ? "done"
          : i === reached && !projection.complete
            ? "current"
            : "future";
      const label =
        kind === "R" ? `反射${reflection === 1 ? "①" : "②"}` : "透射";
      return `<span class="${state}" ${state === "current" ? 'aria-current="step"' : ""}><small>${i + 1}</small> S${index + 1} · ${label} ${reflection === 1 ? "←" : "→"}</span>`;
    })
    .join(
      "",
    )}<span class="${projection.complete && !m.secondary[20].reason ? "done" : "future"}">像面</span></div>`;
}

export function ghostFigures(m) {
  const bound = Math.max(
    8,
    ...[...m.primary, ...m.secondary].flatMap((r) =>
      r.points.map((p) => Math.abs(p[1])),
    ),
  );
  const projection = pathProjection(m.secondary[20], m.p.progress);
  const local = view(m, {
    minZ: -4,
    maxZ: 18,
    bound: 8,
    height: 320,
    id: "ghost-local",
    local: true,
  });
  const whole = view(m, {
    minZ: -8,
    maxZ: m.p.sensor + 3,
    bound,
    height: 230,
    id: "ghost-whole",
    local: false,
  });
  const figure = `<svg xmlns="http://www.w3.org/2000/svg" class="drawing" role="img" aria-label="两片玻璃与三个传播行程的光路对照" viewBox="0 0 720 660"><text x="30" y="23" style="font-size:17px;fill:currentColor">S1–S2：镜片1；S3–S4：镜片2；①②按反射发生顺序</text>${local.replace("<svg ", '<svg x="0" y="35" width="720" height="320" ')}<text x="30" y="389" style="font-size:16px;fill:currentColor">全程至像面 z=${m.p.sensor} mm</text>${whole.replace("<svg ", '<svg x="0" y="405" width="720" height="230" ')}<text x="30" y="654" style="font-size:13px;fill:currentColor">细虚线：主光路；蓝色实线：向右；蓝色粗虚线：反射①后的返程</text></svg>`;
  const [first, second] = pairs[m.p.pair];
  const liveFigure = `<style>.ghost-route{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 14px;font-size:11px}.ghost-route span{padding:3px 7px;border:1px solid var(--line,#aaa);border-radius:4px}.ghost-route small{opacity:.55}.ghost-route .current{border-color:currentColor;font-weight:650}.ghost-route .future{opacity:.4}.ghost-route .done{background:color-mix(in srgb,currentColor 5%,transparent)}.ghost-key{display:flex;flex-wrap:wrap;gap:5px 16px;font-size:11px;margin:8px 0 16px}.ghost-key i{display:inline-block;vertical-align:middle;width:25px;border-top:2px solid var(--g0,#85adc2);margin-right:5px}.ghost-key .back{border-top:3px dashed var(--g1,#397fa3)}.ghost-key .out{border-top:3px solid var(--g2,#236688)}.ghost-key .direct{border-top:1px dashed var(--gd,#969fa6)}.ghost-status{font-size:12px;line-height:1.7}.ghost-route+.ghost-status{margin-bottom:16px}.ghost-views h4{margin-top:16px}@media(max-width:550px){.ghost-views .ghost-local text{font-size:21px!important}.ghost-views .ghost-local .ghost-label{font-size:26px!important}.ghost-views .ghost-whole text{font-size:20px!important}.ghost-route{font-size:12px}}</style><div class="ghost-views"><h4>选中反射面：① S${first + 1} → ② S${second + 1}</h4>${route(m, projection)}<p class="ghost-status" aria-live="polite">${escape(projection.location)} · ${legNames[projection.currentLeg]}${projection.complete ? "" : "；步骤框标出下一处界面"}。</p><div class="ghost-key"><span><i></i>首次向右</span><span><i class="back"></i>反射①后返回</span><span><i class="out"></i>反射②后向右</span><span><i class="direct"></i>主光路</span></div><h4>镜组局部 · 玻璃范围与表面编号</h4>${local}<p class="ghost-status">空心点标透射折射，实心点标反射。线色和线型区分同一束光的行程，功率见下方读数。</p><h4>全程至像面 z=${m.p.sensor} mm</h4>${whole}</div>`;
  return { figure, liveFigure, figureHeight: 660, projection };
}
