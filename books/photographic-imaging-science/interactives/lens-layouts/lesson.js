import { layoutSystem, LAYOUTS } from "./model.js";
import { control, number, escape } from "../common/lesson-view.js";
import { thinGroup, rayArrow } from "../common/optics-drawing.js";
function partial(points, progress) {
  const end = Math.max(
      0,
      Math.min(points.length - 1, progress * (points.length - 1)),
    ),
    n = Math.floor(end);
  const out = points.slice(0, n + 1);
  if (n < points.length - 1) {
    const a = points[n],
      b = points[n + 1],
      t = end - n;
    out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
  }
  return out;
}
function diagram(m, progress) {
  let body = "";
  const virtual = m.bfd !== null && m.bfd < 0;
  const localY =
    Math.max(1, ...m.rays.flatMap((r) => r.points.map((p) => Math.abs(p[1])))) *
    1.25;
  for (const [row, full] of [
    [0, false],
    [1, true],
  ]) {
    const y0 = 120 + row * 220,
      xmin = -10,
      xmax = full
        ? Math.max(m.z.at(-1) + 12, m.imageZ ?? 0) + 8
        : m.z.at(-1) + 12;
    const maxY = full
      ? Math.max(localY, Math.abs(m.expectedHeight ?? 0) * 1.25,
          ...(virtual ? m.rays.map((r) => Math.abs(r.outputHeight + (xmax - m.z.at(-1)) * r.slope) * 1.25) : []))
      : localY;
    const px = (z) => 50 + (640 * (z - xmin)) / (xmax - xmin),
      py = (y) => y0 - (60 * y) / maxY;
    body += `<text x="24" y="${y0 - 86}" font-size="17">${full ? virtual ? "出射束与虚像延长线" : "全程至近轴像面" : "镜组局部"} · z/mm · 纵向±${maxY.toFixed(2)} mm</text><path d="M40 ${y0}H710" stroke="currentColor" opacity=".18"/>`;
    for (const r of m.rays) {
      const pts = [...r.points];
      if (full && m.bfd !== null && m.bfd >= 0)
        pts.push([m.imageZ, r.imageHeight]);
      else
        pts.push([xmax, r.outputHeight + (xmax - m.z.at(-1)) * r.slope]);
      const shown = partial(pts, progress),
        mapped = shown.map(([z, y]) => [px(z), py(y)]);
      body += `<polyline points="${mapped.map((p) => p.join(",")).join(" ")}" fill="none" stroke="#3389a3" stroke-opacity=".75" stroke-width="1.8"/>`;
      if (mapped.length > 1)
        body += rayArrow(mapped.at(-2), mapped.at(-1), "#3389a3");
      if (full && virtual && progress === 1)
        body += `<path d="M${px(m.z.at(-1))} ${py(r.outputHeight)}L${px(m.imageZ)} ${py(r.imageHeight)}" fill="none" stroke="#8b62a5" stroke-width="1.5" stroke-dasharray="5 4"/>`;
    }
    m.z.forEach((z, i) => {
      body += thinGroup(px(z), y0, 64, m.layout.powers[i], "#515f70");
      if (!full)
        body += `<text x="${px(z)}" y="${y0 + 88}" text-anchor="middle" font-size="16">G${i + 1}</text>`;
    });
    body += `<path d="M${px(m.stopZ)} ${y0 - 72}v18m0 108v18" stroke="currentColor" stroke-width="4"/>`;
    if (!full)
      body += `<text x="${px(m.stopZ) + 14}" y="${y0 - 57}" font-size="14">光阑</text>`;
    if (full && m.imageZ !== null) {
      body += `<path d="M${px(m.imageZ)} ${y0 - 65}v130" stroke="${virtual ? "#8b62a5" : "#bd8047"}" stroke-width="2.5" ${virtual ? 'stroke-dasharray="5 4"' : ""}/><text x="${px(m.imageZ)}" y="${y0 + 88}" text-anchor="middle" font-size="15">${virtual ? "虚像面" : "像面"} ${m.imageZ.toFixed(2)}</text>`;
    }
  }
  return `<svg class="drawing" role="img" aria-label="等效薄镜组的局部光路与后焦点" viewBox="0 0 740 455"><style>text{font-family:inherit;fill:currentColor}</style>${body}</svg>`;
}
export const spec = {
  title: "常见镜组的光焦度与后焦距",
  alt: "互动示意：三片式、Tessar、双高斯、反望远和望远型的等效光路",
  intro:
    "各结构标出镜组的正负光焦度、有效焦距、后焦距和主平面。上图显示镜组局部，下图显示至像面的完整光路，便于比较镜头长度与焦距。",
  staticCaption:
    "双高斯式四个等效薄组：+25、−12、−12、+25 D；位置0、12、28、40 mm；入射方向0.5°。",
  note: "空气中一阶薄组模型，距离mm、光焦度D；Tessar后胶合组合并为一个薄组。数值为本书给定的教学布局，光阑只定位，未计算孔径截光或像差。实线为实际向前传播，紫色虚线仅为出射线反向延长；后焦距为负时标虚像面，不能在那里放传感器接收合焦图像。线色表示同一单色光束，横纵比例不同；逐组回放的步长不表示传播时间。",
  controls: [
    {
      ...control("type", "镜组结构", 0, 4, 1, 2),
      format: (v) => LAYOUTS[v].name,
      options: [
        { value: 0, label: "三片式" },
        { value: 1, label: "Tessar式" },
        { value: 2, label: "双高斯式" },
        { value: 3, label: "反望远式" },
        { value: 4, label: "望远式" },
      ],
    },
    control("separation", "组间距倍率", 0.5, 1.5, 0.05, 1, "", 2),
    control("angle", "入射方向", -1, 1, 0.1, 0.5, "°", 1),
    control("radius", "入射束半宽", 0.2, 2, 0.1, 0.8, " mm", 1),
    control("progress", "光路步骤", 0, 1, 0.01, 1, "", 2),
  ],
  presets: LAYOUTS.map((m, type) => ({
    label: m.name,
    values: { type, separation: 1, progress: 1 },
  })),
  replay: {
    key: "progress",
    start: 0,
    end: 1,
    durationMs: 6500,
    startOnFirstPlay: true,
    label: "逐组追迹",
  },
  evaluate(s) {
    const m = layoutSystem(s);
    const rows = m.z
      .map(
        (z, i) =>
          `<tr><td>G${i + 1}</td><td>${number(z)} mm</td><td>${m.layout.powers[i] > 0 ? "+" : ""}${m.layout.powers[i]} D</td></tr>`,
      )
      .join("");
    return {
      figure: diagram(m, s.progress),
      figureHeight: 455,
      figureMinWidth: 630,
      stats: [
        ["有效焦距", number(m.focalLength) + " mm", "从主平面量起"],
        ["后焦距 BFD", number(m.bfd) + " mm", m.bfd < 0 ? "负值：出射线的反向延长交点" : "从最后薄组量起"],
        [
          "两主平面 z",
          `${number(m.H1)} / ${number(m.H2)} mm`,
          "前后参考平面已分别标定",
        ],
        [
          m.bfd < 0 ? "独立延长线交点误差" : "独立光线交点误差",
          (m.maxImageError * 1000).toExponential(2) + " μm",
          "相对 f·θ 的像高",
        ],
        [
          "光线/矩阵后焦距差",
          Math.abs(m.bfd - m.tracedBfd).toExponential(2) + " mm",
          "逐组角度更新与矩阵连乘",
        ],
        ["行列式", number(m.determinant, 6), "同为空气时应为1"],
      ],
      reading: `${m.layout.name}：最大近轴倾角${number((m.maxAngle * 180) / Math.PI, 2)}°。${m.bfd < 0 ? "当前出射束发散，只有反向延长线在虚像面相交；实际光线继续向右传播，图中的紫色虚线不表示玻璃内部的一段新光路。" : "当前出射束在最后组之后形成实像。"}改变组间距会改变总光焦度和主平面；相同的正负组序列仍可对应不同的实际玻璃处方。对称性与像差的关系见正文，当前追迹只给一阶共轭。`,
      table: `<div class="table-scroll"><table><thead><tr><th>等效组</th><th>位置</th><th>光焦度</th></tr></thead><tbody>${rows}</tbody></table></div>`,
    };
  },
};
