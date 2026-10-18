import { extensionTube, teleconverter, reverseConjugates } from "./model.js";
import { control, number } from "../common/lesson-view.js";
import { thinGroup, rayArrow } from "../common/optics-drawing.js";
const svg = (body, h = 340) =>
  `<svg class="drawing" role="img" aria-label="近轴共轭与附件光路" viewBox="0 0 740 ${h}"><style>text{font-family:inherit;fill:currentColor}</style>${body}</svg>`;
const line = (pts, color = "#388da7") =>
  `<polyline points="${pts.map((p) => p.join(",")).join(" ")}" fill="none" stroke="${color}" stroke-width="2"/>${pts.length > 1 ? rayArrow(pts.at(-2), pts.at(-1), color) : ""}`;
function tubeDiagram(m) {
  const s = Number.isFinite(m.objectDistance) ? m.objectDistance : 8 * m.focal;
  const left = -Math.min(s, 8 * m.focal),
    right = m.imageDistance + 10,
    px = (z) => 55 + (630 * (z - left)) / (right - left),
    py = (y) => 155 - 10 * y;
  let body = `<text x="24" y="30">物距、像距从同一薄透镜量起 · mm</text><path d="M40 155H710" stroke="currentColor" opacity=".2"/>${thinGroup(px(0), 155, 65, 1 / m.focal, "#596979")}<path d="M${px(m.imageDistance)} 80v150" stroke="#b67f44" stroke-width="3"/>`;
  for (const r of m.rays) {
    const yLeft = Number.isFinite(m.objectDistance)
      ? r.height + left * r.inputAngle
      : r.height;
    body += line([
      [px(left), py(yLeft)],
      [px(0), py(r.height)],
      [px(m.imageDistance), py(r.imageHeight)],
    ]);
  }
  if (Number.isFinite(m.objectDistance) && m.objectDistance <= 8 * m.focal)
    body += `<path d="M${px(-s)} 155v-20" stroke="#8e77ab" stroke-width="3"/>`;
  body += `<text x="55" y="256">物体${Number.isFinite(m.objectDistance) ? "：s=" + number(m.objectDistance) + " mm" : "：无穷远"}</text><text x="${px(0)}" y="256" text-anchor="middle">透镜</text><text x="${px(m.imageDistance)}" y="285" text-anchor="end">像距 ${number(m.imageDistance)} mm</text><text x="370" y="321" text-anchor="middle" font-size="16">三条近轴示例光线；未绘制全孔径光锥，横纵比例不同</text>`;
  return svg(body);
}
function converterDiagram(m) {
  const px = (z) => 65 + (600 * z) / (m.imageZ + 15),
    py = (y) => 150 - 32 * y;
  const leftZ = ((40 - 65) * (m.imageZ + 15)) / 600;
  let body = `<text x="24" y="30">正主镜使光束会聚，负增距组减小会聚角</text><path d="M40 150H705" stroke="currentColor" opacity=".2"/>${thinGroup(px(0), 150, 72, 1 / m.focal, "#596979")}${thinGroup(px(m.d), 150, 65, m.converterPower, "#596979")}<path d="M${px(m.focal)} 70v160" stroke="currentColor" opacity=".4" stroke-dasharray="4 4"/><path d="M${px(m.imageZ)} 70v160" stroke="#b67f44" stroke-width="3"/>`;
  for (const r of m.rays)
    body += line([
      [40, py(r.height + leftZ * m.rays[1].afterMaster)],
      [px(0), py(r.height)],
      [px(m.d), py(r.atConverter)],
      [px(m.imageZ), py(r.imageHeight)],
    ]);
  body += `<text x="65" y="258">主镜</text><text x="${px(m.d)}" y="258" text-anchor="middle">增距组</text><text x="${px(m.focal)}" y="290" text-anchor="middle">原焦面</text><text x="${px(m.imageZ)}" y="258" text-anchor="middle">新焦面</text><text x="370" y="327" text-anchor="middle" font-size="16">δ=${number(m.delta)} mm → 余下像程 Mδ=${number(m.q)} mm；横纵比例不同</text>`;
  return svg(body, 350);
}
function reverseDiagram(m) {
  let body = "";
  const total = m.objectDistance + m.imageDistance,
    px = (z) => 55 + (630 * z) / total;
  for (const [j, a, b, h, label] of [
    [0, m.objectDistance, m.imageDistance, 4, "原来的大物方 → 小像方"],
    [
      1,
      m.reversedObject,
      m.reversedImage,
      4 * Math.abs(m.magnification),
      "交换共轭并倒转镜头：小物方 → 大像方",
    ],
  ]) {
    const yc = 110 + j * 210,
      py = (y) => yc - 12 * y,
      mag = -b / a;
    body += `<text x="24" y="${yc - 74}">${label}</text><path d="M40 ${yc}H710" stroke="currentColor" opacity=".2"/>${thinGroup(px(a), yc, 52, 1 / m.focal, "#596979")}<path d="M${px(0)} ${yc}v${-12 * h}" stroke="#8e77ab" stroke-width="3"/><path d="M${px(total)} ${yc}v${-12 * mag * h}" stroke="#b67f44" stroke-width="3"/>`;
    for (const y of [-1.5, 0, 1.5])
      body += line([
        [px(0), py(h)],
        [px(a), py(y)],
        [px(total), py(mag * h)],
      ]);
    body += `<text x="55" y="${yc + 75}">物距 ${number(a)} mm</text><text x="685" y="${yc + 75}" text-anchor="end">像距 ${number(b)} mm；m=${number(mag, 2)}</text>`;
  }
  body += `<text x="370" y="427" text-anchor="middle" font-size="16">薄透镜翻转本身不改变焦距；倍率来自物像共轭与安装距离</text>`;
  return svg(body, 450);
}
const ALT = "互动示意：增距镜、延长管与反装的共轭和光量";
export const tubeSpec = {
  title: "延长管：像距增加后在哪里合焦",
  alt: ALT,
  intro:
    "空延长管把镜头与传感器拉开。焦距保持不变，重新合焦的物体移近；同时读取放大率、传感器到物体的距离和有效f数。",
  staticCaption:
    "对称薄透镜50 mm、f/4，原先对焦无穷远，加25 mm空延长管；放大率0.5。",
  note: "固定焦距、瞳倍率1的薄透镜；物距与像距从薄镜平面量起，二者之和才是本模型的传感器到物体距离。实际内对焦镜头的主平面、焦距和瞳可能随对焦改变。N有效=N(1+|m|)是该对称近轴模型的光锥预算，忽略透射损失。回放改变机械延长量。",
  controls: [
    control("focal", "薄镜焦距", 25, 200, 5, 50, " mm"),
    control("fNumber", "标称f数", 2.8, 16, 0.2, 4, "", 1),
    control("initialMagnification", "原对焦放大率绝对值", 0, 1, 0.05, 0, "", 2),
    control("extension", "新增延长量", 0, 100, 1, 25, " mm"),
  ],
  presets: [
    {
      label: "50 mm + 25 mm",
      values: { focal: 50, initialMagnification: 0, extension: 25 },
    },
    {
      label: "1∶1 · 像距2f",
      values: { focal: 50, initialMagnification: 0, extension: 50 },
    },
    {
      label: "超过1∶1",
      values: { focal: 50, initialMagnification: 0, extension: 100 },
    },
    { label: "拆下延长管", values: { initialMagnification: 0, extension: 0 } },
  ],
  replay: {
    key: "extension",
    start: 0,
    end: 100,
    durationMs: 8500,
    startOnFirstPlay: true,
    label: "逐渐增加延长量",
  },
  evaluate(s) {
    const m = extensionTube(s),
      dist = (x) => (Number.isFinite(x) ? number(x) + " mm" : "∞");
    return {
      figure: tubeDiagram(m),
      figureHeight: 340,
      figureMinWidth: 620,
      stats: [
        ["放大率 |m|", number(m.magnification, 3), "原放大率 + 新增延长量/f"],
        [
          "物距 / 像距",
          `${dist(m.objectDistance)} / ${dist(m.imageDistance)}`,
          "各自由薄镜平面量起",
        ],
        [
          "传感器到物体",
          dist(m.sensorObjectDistance),
          "实际工作距离须按镜头前端另量",
        ],
        ["有效f数", number(m.effectiveFNumber, 2), "瞳倍率1的近轴模型"],
        [
          "曝光补偿",
          number(m.exposureStops, 2) + "档",
          `光量因子 ${number(m.exposureFactor, 2)}`,
        ],
        [
          "独立光线像高误差",
          m.imageError.toExponential(2) + " mm",
          "角度更新与薄透镜解析式",
        ],
      ],
      reading: `36 mm宽传感器在该倍率下覆盖物方宽度${dist(m.fieldWidth)}。固定薄镜的传感器到物体距离在|m|=1处最小，为4f；继续加长虽让物体靠近透镜，却不保证它继续靠近传感器。`,
    };
  },
};
export const converterSpec = {
  title: "增距镜：会聚光束中的负光焦度",
  alt: ALT,
  intro:
    "在原焦点之前加入一组负光焦度，使会聚变慢。拖动倍率，比较有效焦距、像面位置与f数；原镜头的入瞳保持不变。",
  staticCaption:
    "主镜100 mm、f/4；负组位于80 mm，原焦面前20 mm；2倍增距后在120 mm处成像，等效200 mm f/8。",
  note: "空气中两薄组、远物、原焦面前δ>0；负组焦距−Mδ/(M−1)，M=1按零光焦度处理。每个倍率都重新选取该教学负组，展示一族增距系统，并非一枚可连续变倍的商品增距镜。计入几何f数损失，忽略吸收和像差；实际附件需匹配卡口、后组空间与光束。",
  controls: [
    control("focal", "主镜焦距", 50, 200, 10, 100, " mm"),
    control("fNumber", "主镜f数", 2.8, 8, 0.2, 4, "", 1),
    control("factor", "增距倍率 M", 1, 2.5, 0.1, 2, "×", 1),
    control("remainingFraction", "原余下像程 δ/f", 0.1, 0.4, 0.02, 0.2, "", 2),
    control("angle", "远景方向", -0.5, 0.5, 0.1, 0.5, "°", 1),
  ],
  presets: [
    { label: "不加光焦度 · 1×", values: { factor: 1 } },
    { label: "1.4×", values: { factor: 1.4 } },
    { label: "2×", values: { factor: 2 } },
  ],
  replay: {
    key: "factor",
    start: 1,
    end: 2.5,
    durationMs: 7000,
    startOnFirstPlay: true,
    label: "比较不同增距倍率",
  },
  evaluate(s) {
    const m = teleconverter(s);
    return {
      figure: converterDiagram(m),
      figureHeight: 350,
      figureMinWidth: 630,
      stats: [
        ["等效焦距", number(m.focalLength) + " mm", "主镜焦距乘以M"],
        ["新f数", number(m.newFNumber, 2), "入瞳不变"],
        ["曝光补偿", number(m.exposureStops, 2) + "档", "几何损失；透射另计"],
        [
          "负组焦距",
          m.converterFocal === null
            ? "零光焦度"
            : number(m.converterFocal) + " mm",
          "随当前教学倍率重选",
        ],
        [
          "主镜后新像面 z",
          number(m.imageZ) + " mm",
          "原焦面 z=" + s.focal + " mm",
        ],
        [
          "光线/矩阵/解析对照",
          Math.max(
            m.imageError,
            Math.abs(m.matrixFocal - m.focalLength),
            Math.abs(m.bfd - m.q),
          ).toExponential(2) + " mm",
          "独立逐线追迹与增距公式",
        ],
      ],
      reading: `输入方向${number(s.angle, 1)}°在新像面上的近轴像高为${number(m.expectedHeight, 3)} mm。负组使原余下${number(m.delta)} mm像程变为${number(m.q)} mm，焦距增大${number(s.factor, 1)}倍，f数也增大相同倍数。`,
    };
  },
};
export const reverseSpec = {
  title: "反装：交换原来的大小共轭",
  alt: ALT,
  intro:
    "先看一组缩小成像的物像距离，再把镜头连同传播方向倒转，交换两个共轭平面。倍率成为倒数；单把理想薄透镜翻面而不改位置，光学关系不变。",
  staticCaption:
    "50 mm薄透镜，原共轭300 mm→60 mm，倍率−0.2；交换后60 mm→300 mm，倍率−5。",
  note: "用薄透镜的光路可逆性说明倍率，图中镜头只定位等效平面。实际摄影镜头常为非对称结构，反装还改变前后主平面、瞳与安装参考；像差是否改善要看它原先为哪一对共轭优化。此图不预测某枚反接环的实际倍率或画质。",
  controls: [
    control("focal", "等效焦距", 25, 100, 5, 50, " mm"),
    control("reduction", "原缩小倍率绝对值", 0.1, 1, 0.05, 0.2, "", 2),
  ],
  presets: [
    { label: "原来缩小5倍", values: { focal: 50, reduction: 0.2 } },
    { label: "原来缩小10倍", values: { focal: 50, reduction: 0.1 } },
    { label: "1∶1共轭", values: { focal: 50, reduction: 1 } },
  ],
  evaluate(s) {
    const m = reverseConjugates(s);
    return {
      figure: reverseDiagram(m),
      figureHeight: 450,
      figureMinWidth: 650,
      stats: [
        ["焦距", number(m.focal) + " mm", "倒转前后相同"],
        [
          "原倍率 / 倒转后倍率",
          `${number(m.magnification, 2)} / ${number(m.reversedMagnification, 2)}`,
          "两者乘积为1",
        ],
        [
          "交换后的物距 / 像距",
          `${number(m.reversedObject)} / ${number(m.reversedImage)} mm`,
          "两个共轭平面互换",
        ],
      ],
      reading:
        "反接环先解决安装方向；实际倍率还由卡口到主平面的距离、延长量和对焦状态决定。原像方成为近物方，有机会把镜头用于更合适的大倍率共轭。工作距离、光圈控制和裸露的原后组也要分别检查。",
    };
  },
};
export const specs = [tubeSpec, converterSpec, reverseSpec];
