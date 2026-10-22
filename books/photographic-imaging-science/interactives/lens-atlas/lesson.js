import { atlasState, PRESCRIPTIONS, systemMatrix } from "./model.js";
import { drawing } from "./drawing.js";
import { control, number, escape } from "../common/lesson-view.js";
export const FAN_SCALES = [20, 100, 500, 2000];
export const spec = {
  title: "从玻璃剖面读镜头结构",
  alt: "互动示意：六种典型镜片结构、胶合组与逐面Snell光路",
  intro:
    "选择结构后，点选G编号可查看各组的组成和作用。上图是镜组局部，下图是延伸至像面的完整光路；实线由球面求交与Snell折射计算，虚线为近轴参考。",
  staticCaption:
    "六片四组双高斯；公开处方统一缩放至计算焦距50 mm，采用nD，入射束半宽1.5 mm。",
  note: "各处方按计算焦距等比例缩放至50 mm，原表与比例见处方表。净口径和部分光阑位置为本书给定；单色几何光线，不计反射、吸收、衍射及色散。像面固定在近轴后焦面；光路图选画21条子午样本中的5条，偏移图和跨度使用全部通过样本，非二维PSF或器材排名。组颜色区分位置，不表示波长或透射率；回放步骤不代表传播时间。",
  controls: [
    {
      ...control("type", "镜片结构", 0, 5, 1, 2),
      format: (v) => PRESCRIPTIONS[Math.round(v)].name,
      options: [
        { value: 0, label: "三片式" },
        { value: 1, label: "Tessar" },
        { value: 2, label: "双高斯" },
        { value: 3, label: "Sonnar" },
        { value: 4, label: "反望远" },
        { value: 5, label: "望远型" },
      ],
    },
    control("angle", "入射方向", -3, 3, 0.1, 0, "°", 1),
    control("radius", "首面入射束半宽", 0.2, 4, 0.1, 1.5, " mm", 1),
    control("stopFraction", "光阑半径倍率", 0.25, 1, 0.05, 1, "", 2),
    {
      ...control("fanScale", "偏移图纵轴", 0, 3, 1, 0),
      format: (v) => "±" + FAN_SCALES[Math.round(v)] + " μm",
      options: [
        { value: 0, label: "±20 μm" },
        { value: 1, label: "±100 μm" },
        { value: 2, label: "±500 μm" },
        { value: 3, label: "±2000 μm" },
      ],
    },
    control("progress", "逐面光路进度", 0, 1, 0.01, 1, "", 2),
  ],
  presets: PRESCRIPTIONS.map((p, type) => ({
    label: p.name,
    values: {
      type,
      selected: 0,
      angle: 0,
      radius: 1.5,
      stopFraction: 1,
      progress: 1,
    },
  })),
  replay: {
    key: "progress",
    start: 0,
    end: 1,
    durationMs: 7000,
    startOnFirstPlay: true,
    label: "逐面追迹",
  },
};
export function evaluate(s) {
  const m = atlasState(s),
    d = m.d,
    selected = d.groups[m.selected - 1],
    air = 2 * d.groups.length,
    cement = d.elements.length - d.groups.length;
  const selectedLabel = selected
    ? "G" +
      (selected.index + 1) +
      " · " +
      selected.elements.map((e) => "L" + e.lens).join("+")
    : "全部镜组";
  const rows = d.groups
    .map(
      (g) =>
        `<tr${g.index + 1 === m.selected ? ' class="selected"' : ""}><td>G${g.index + 1}</td><td>${g.elements.map((e) => "L" + e.lens).join("、")}</td><td>${number(g.start)}…${number(g.end)} mm</td><td>${number(g.power)} D</td></tr>`,
    )
    .join("");
  const prescription = d.surfaces
    .map(
      (p, i) =>
        `<tr><td>S${i + 1}</td><td>${number(p.z, 4)}</td><td>${Number.isFinite(p.R) ? number(p.R, 4) : "∞"}</td><td>${number(p.left, 5)} → ${number(p.right, 5)}</td><td>${number(p.clear, 3)}</td></tr>`,
    )
    .join("");
  let reading = selected ? selected.description : d.p.analysis;
  if (d.p.id === "telephoto") {
    const rear = systemMatrix(d.surfaces.slice(d.elements[1].front));
    reading += ` 后四片的合成光焦度为${number(-1000 * rear[2])} D，末片单独为${number(d.groups.at(-1).power)} D。`;
  }
  const tiny =
    m.tinyBfd === null
      ? "微束未通过"
      : number((m.tinyBfd - d.bfd) * 1e6, 3) + " nm";
  return {
    model: m,
    figure: drawing(m, FAN_SCALES[s.fanScale ?? 0]),
    figureHeight: 635,
    figureMinWidth: 720,
    stats: [
      [
        "玻璃 / 空气分隔组",
        `${d.elements.length}片 / ${d.groups.length}组`,
        `${air}个空气—玻璃界面，${cement}个胶合界面`,
      ],
      [
        "有效焦距",
        number(d.focalLength, 3) + " mm",
        "各处方等比例缩放后的同一近轴焦距",
      ],
      ["后焦距 BFD", number(d.bfd, 3) + " mm", "从最后一面顶点量到近轴像面"],
      [
        "首面至近轴像面",
        number(d.image, 3) + " mm",
        "包含玻璃、空气间隔与后焦空间",
      ],
      [
        "当前观察",
        selectedLabel,
        selected
          ? number(selected.power) + " D，孤立于空气中的组光焦度"
          : "点上方G编号查看组内作用",
      ],
      [
        "当前通过光线",
        m.passed + " / 21",
        `实际光阑半径${number(d.stopRadius * s.stopFraction, 3)} mm`,
      ],
      [
        "像面子午样本跨度",
        m.span === null ? "无通过光线" : number(m.span * 1000, 3) + " μm",
        "有限条光线在固定近轴像面上的高度跨度",
      ],
      [
        "独立近轴计算差",
        m.referenceError.toExponential(2) + " mm",
        "标量逐面折转与总矩阵分别计算焦距、后焦距",
      ],
      ["微束Snell后焦差", tiny, "入射高度0.001 mm，与近轴后焦距相减"],
    ],
    reading,
    table: `<div class="table-scroll"><table><thead><tr><th>镜组</th><th>玻璃编号</th><th>顶点范围</th><th>组光焦度</th></tr></thead><tbody>${rows}</tbody></table></div><details class="prescription"><summary>查看处方与来源：${escape(d.p.patent)}</summary><p><a href="${escape(d.p.url)}" target="_blank" rel="noreferrer">${escape(d.p.patent)} · ${escape(d.p.location)}</a>。${escape(d.p.convention)}原表计算焦距${number(d.nativeF, 5)} mm；所有长度乘${number(d.scale, 7)}，得到50 mm。</p><div class="table-scroll"><table><thead><tr><th>界面</th><th>z / mm</th><th>R / mm</th><th>左 → 右 nD</th><th>净半径 / mm</th></tr></thead><tbody>${prescription}</tbody></table></div><p>光阑z=${number(d.stop, 4)} mm，基准半径${number(d.stopRadius, 4)} mm。各空气分隔组内直接相接的材料界面按胶合处理。</p></details>`,
    staticRows: d.groups.map(
      (g) =>
        `G${g.index + 1}：${g.elements.map((e) => "L" + e.lens).join("+")}；组光焦度${number(g.power)} D`,
    ),
  };
}
