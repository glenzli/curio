import { ghost, surfaces, sag, pairs } from "./model.js";
import { control, curve, number } from "../common/lesson-view.js";
const blue = "#40879a",
  gold = "#bb7946";
function view(m, minZ, maxZ, bound, top, height, id) {
  const x = (z) => 55 + ((z - minZ) / (maxZ - minZ)) * 610,
    y = (v) => top + height / 2 - (v / bound) * (height / 2 - 28);
  let body = `<defs><clipPath id="${id}"><rect x="55" y="${top}" width="610" height="${height}"/></clipPath><marker id="${id}-arrow" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="${gold}"/></marker></defs><path d="M55 ${y(0)}H665" stroke="currentColor" opacity=".2"/><g clip-path="url(#${id})">`;
  for (const rays of [m.primary, m.secondary])
    rays.forEach((r, i) => {
      if (i % 10) return;
      const isGhost = rays === m.secondary,
        count = isGhost
          ? m.p.progress * (r.points.length - 1)
          : r.points.length - 1;
      const points = r.points.slice(0, Math.floor(count) + 1);
      if (count < r.points.length - 1) {
        const a = r.points[Math.floor(count)],
          b = r.points[Math.floor(count) + 1],
          t = count % 1;
        points.push(a.map((v, k) => v + t * (b[k] - v)));
      }
      body += `<path d="${points.map((v, j) => `${j ? "L" : "M"}${x(v[0])} ${y(v[1])}`).join(" ")}" fill="none" stroke="${isGhost ? gold : blue}" stroke-width="${isGhost ? 2 : 1}" opacity="${isGhost ? 0.85 : 0.5}" ${isGhost ? "" : 'stroke-dasharray="4 3"'}/>`;
      if (isGhost && i === 20)
        for (let j = 1; j < points.length; j++) {
          const a = points[j - 1],
            b = points[j];
          const mid = a.map((v, k) => v + 0.6 * (b[k] - v));
          const before = a.map((v, k) => v + 0.45 * (b[k] - v));
          body += `<path d="M${x(before[0])} ${y(before[1])}L${x(mid[0])} ${y(mid[1])}" fill="none" stroke="${gold}" stroke-width="2" marker-end="url(#${id}-arrow)"/>`;
        }
      if (isGhost)
        for (const event of r.interactions.filter((v) => v.kind === "R")) {
          if (r.points.indexOf(event.point) > count) continue;
          body += `<circle cx="${x(event.point[0])}" cy="${y(event.point[1])}" r="3.5" fill="${gold}"/>`;
        }
    });
  for (const s of surfaces) {
    const pts = Array.from({ length: 81 }, (_, i) => {
      const yy = -s.clear + (2 * s.clear * i) / 80;
      return [sag(s, yy), yy];
    });
    body += `<path d="${pts.map((v, i) => `${i ? "L" : "M"}${x(v[0])} ${y(v[1])}`).join(" ")}" fill="none" stroke="currentColor" stroke-width="1.5"/>`;
  }
  body += `<path d="M${x(8)} ${y(bound)}V${y(m.p.stop)}M${x(8)} ${y(-m.p.stop)}V${y(-bound)}" stroke="currentColor" stroke-width="4"/>`;
  if (m.p.sensor <= maxZ)
    body += `<path d="M${x(m.p.sensor)} ${top}V${top + height}" stroke="currentColor" stroke-width="3"/>`;
  body += "</g>";
  if (id === "ghost-local")
    for (const [z, label] of [
      [0, "S1"],
      [4, "S2"],
      [8, "光阑"],
      [12, "S3"],
      [15, "S4"],
    ])
      body += `<text x="${x(z)}" y="${top + 12}" text-anchor="middle" style="font-size:13px">${label}</text>`;
  for (let z = Math.ceil(minZ / 10) * 10; z <= maxZ; z += maxZ > 50 ? 20 : 10)
    body += `<text x="${x(z)}" y="${top + height + 17}" text-anchor="middle" style="font-size:13px">${z}</text>`;
  return body;
}
function diagram(m) {
  const bound = Math.max(
    8,
    ...[...m.primary, ...m.secondary].flatMap((r) =>
      r.points.map((v) => Math.abs(v[1])),
    ),
  );
  return `<svg class="drawing" role="img" aria-label="两片球面镜片的主光路与指定双反射路径" viewBox="0 0 720 550"><style>text{fill:currentColor;font-family:inherit}</style><text x="30" y="24" style="font-size:16px">镜组局部 · 纵向±8 mm · 橙色鬼影，蓝色主光路</text>${view(m, -8, 22, 8, 48, 190, "ghost-local")}<text x="360" y="285" text-anchor="middle" style="font-size:14px">S1 (0) → S2 (4) · 光阑 (8) · S3 (12) → S4 (15)，z / mm</text><text x="30" y="322" style="font-size:16px">直到像面 z=${m.p.sensor} mm · 两幅纵向标尺不同</text>${view(m, -8, m.p.sensor + 3, bound, 340, 160, "ghost-whole")}<text x="360" y="544" text-anchor="middle" style="font-size:14px">全程轴向位置 z / mm；全程纵向范围 ±${number(bound, 1)} mm</text></svg>`;
}
export const spec = {
  title: "两次反射怎样到达像面",
  alt: "互动示意：两片教学镜片的双反射路径、孔径截断、落点与Fresnel功率",
  intro:
    "橙色光路在两个指定界面反射，途中遇到的其他界面仍会折射。逐步播放光路，再移动像面，比较它与主光路的交点。",
  staticCaption:
    "两片球面教学镜片，入射2°、41条等权子午光线；S3→S2反射；像面z=83 mm，光阑半径3 mm。",
  note: "单色、无吸收、无镀膜的两片教学处方；n在波长上视为常数。坐标为全局(z,y)，R>0的曲率中心在顶点右侧。净半口径均7 mm；空气光阑位于z=8 mm。Snell与Fresnel逐面计算，s/p功率分别相乘；本图不按鬼影强度压暗光线。功率只指41条等权子午线组成的输入光束，非二维瞳面积积分或像面辐照度。没有散射光幕、衍射、镀膜、传感器反射或其他反射组合。动画是路径步骤展示，不是光行时间；读数始终对应完整路径。",
  controls: [
    control("angle", "光源入射角", -4, 4, 0.25, 2, "°", 2),
    control("radius", "入射光束半宽", 0.5, 5, 0.1, 3.8, " mm", 1),
    control("stop", "空气光阑半径", 0.5, 6, 0.1, 3, " mm", 1),
    control("sensor", "像面 z", 16, 180, 1, 83, " mm"),
    {
      ...control("pair", "反射界面 · 按发生顺序", 0, 2, 1, 0),
      format: (v) => {
        const [a, b] = pairs[v];
        return `S${a + 1} → S${b + 1}`;
      },
    },
    control("progress", "路径步骤进度", 0, 1, 0.01, 1, "", 2),
  ],
  presets: [
    {
      label: "S3 → S2",
      values: { pair: 0, angle: 2, sensor: 83, stop: 3, progress: 1 },
    },
    {
      label: "经过更多界面",
      values: { pair: 1, angle: 2, sensor: 83, stop: 3, progress: 1 },
    },
    {
      label: "反向延长线交点",
      values: { pair: 2, angle: 0, sensor: 83, stop: 3, progress: 1 },
    },
    {
      label: "鬼影实焦附近",
      values: { pair: 0, angle: 0, sensor: 16, stop: 3, progress: 1 },
    },
    {
      label: "缩小光阑",
      values: { pair: 0, angle: 3, sensor: 83, stop: 0.8, progress: 1 },
    },
  ],
  replay: {
    key: "progress",
    start: 0,
    end: 1,
    durationMs: 10000,
    startOnFirstPlay: true,
    label: "逐段追迹光路",
  },
  evaluate(s) {
    const m = ghost(s),
      ref = m.ghostReference,
      primary = m.primaryReference;
    const figure = diagram(m);
    const liveFigure = `<style>.ghost-views text[y="285"]{display:none}@media(max-width:550px){.ghost-views .drawing text{font-size:23px!important}}</style><div class="ghost-views"><h4>镜组局部 · z / mm · 纵向±8 mm</h4>${figure.replaceAll("ghost-", "ghost-live-a-").replace('viewBox="0 0 720 550"', 'viewBox="0 36 720 238"')}<h4>全程到像面 z=${s.sensor} mm</h4>${figure.replaceAll("ghost-", "ghost-live-b-").replace('viewBox="0 0 720 550"', 'viewBox="0 336 720 214"')}</div>`;
    const center = m.secondary[20],
      current = Math.min(
        center.interactions.length - 1,
        Math.floor(s.progress * (center.points.length - 1)) - 1,
      ),
      event = center.interactions[current];
    const tableRows = surfaces.map((v, i) => [
      `S${i + 1}`,
      `${v.z}`,
      `${v.R}`,
      `${v.left} → ${v.right}`,
      "7",
    ]);
    const pathRows = center.interactions.map((v) => [
      `S${v.index + 1} ${v.kind === "R" ? "反射" : "透射"}`,
      number(v.point[1], 4),
      `${number(100 * v.Rs, 3)} / ${number(100 * v.Rp, 3)}`,
      number(100 * (v.ws + v.wp), 5),
    ]);
    const table = (heads, rows) =>
      `<div class="table-scroll"><table><tr>${heads.map((v) => `<th>${v}</th>`).join("")}</tr>${rows.map((row) => `<tr>${row.map((v) => `<td>${v}</td>`).join("")}</tr>`).join("")}</table></div>`;
    return {
      figure,
      liveFigure,
      figureHeight: 550,
      panels: [
        {
          title: "光线落点 · 不是PSF强度分布",
          xMin: -5,
          xMax: 5,
          xLabel: "入射高度 / mm",
          yMin: -80,
          yMax: 80,
          yLabel: "像面高度 / mm",
          curves: [
            curve(
              "主光路",
              m.primary.flatMap((r, i) =>
                r.reason ? [] : [[m.launch[i], r.sensorY]],
              ),
              0,
            ),
            curve(
              "双反射光路",
              m.secondary.flatMap((r, i) =>
                r.reason ? [] : [[m.launch[i], r.sensorY]],
              ),
              1,
            ),
          ],
        },
      ],
      stats: [
        [
          "主光路 / 双反射功率",
          `${number(100 * m.primaryPower, 3)}% / ${number(100 * m.ghostPower, 5)}%`,
          "相对于同一组等权入射光线",
        ],
        [
          "存活光线 · 主 / 鬼影",
          `${m.primary.filter((r) => !r.reason).length} / ${m.secondary.filter((r) => !r.reason).length}`,
          "各41条；孔径截断后终止追迹",
        ],
        [
          "当前展示步骤",
          event
            ? `S${event.index + 1} ${event.kind === "R" ? "反射" : "透射"}`
            : "入射",
          `中央光线${center.reason ? `：${center.reason}` : "可到达像面"}`,
        ],
      ],
      reading: `近轴已知对照：主光路焦点z=${number(primary.focus, 6)} mm；鬼影${ref.focus < 15 ? "出射线反向延长交点" : "实焦点"}z=${number(ref.focus, 6)} mm。独立球面追迹以y=10⁻⁴ mm、角度0逼近轴上极限，鬼影交点z=${number(ref.rayFocus, 6)} mm，差${Math.abs(ref.focus - ref.rayFocus).toExponential(2)} mm。该轴上检验不替代当前离轴光束。正入射鬼影功率：Fresnel乘积${number(100 * ref.normal, 6)}%，轴上追迹${number(100 * ref.axialWeight, 6)}%；两者均无孔径损失。`,
      table: `<h4>完整教学处方</h4>${table(["界面", "顶点 z / mm", "R / mm", "n左 → n右", "净半口径 / mm"], tableRows)}<h4>当前中央入射光线的完整路径</h4>${table(["事件", "命中 y / mm", "Rs / Rp · %", "累计功率 · %"], pathRows)}`,
      staticRows: [
        "界面 | 顶点z(mm) | R(mm) | n左→n右 | 净半口径(mm)",
        ...tableRows.map((row) => row.join(" | ")),
        "事件 | 命中y(mm) | Rs/Rp(%) | 累计功率(%)",
        ...pathRows.map((row) => row.join(" | ")),
      ],
    };
  },
};
