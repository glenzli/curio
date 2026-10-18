import { writeFile } from "node:fs/promises";
import { focusSystem } from "./floating/model.js";
import { diagram as floatingDiagram } from "./floating/index.js";
import { zoomSystem } from "./zoom/model.js";
import { rayDiagram as zoomDiagram } from "./zoom/index.js";
import { relaySystem, relayTruth } from "./telecentric/model.js";
import { diagram as telecentricDiagram } from "./telecentric/index.js";
import { escape } from "./common/lesson-view.js";
const embed = (svg, y, height) =>
  svg.replace("<svg ", `<svg x="30" y="${y}" width="740" height="${height}" `);
const text = (y, value, size = 16) =>
  `<text x="30" y="${y}" font-size="${size}">${escape(value)}</text>`;
const svg = (label, title, height, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="${height}" viewBox="0 0 800 ${height}" role="img" aria-label="${label}"><rect width="800" height="${height}" fill="#fafbfc"/><style>text{font-family:system-ui,'PingFang SC',sans-serif;fill:#30343a}</style>${text(40, title, 25)}${body}</svg>\n`;
let body = text(
  76,
  "物距1 m；固定像面 z=200 mm。图与互动共用近轴光线及薄组符号。",
);
for (const [i, mode] of ["rear", "floating"].entries()) {
  const m = focusSystem({ vergence: 1, mode }),
    y = 112 + i * 465;
  body +=
    text(
      y,
      mode === "rear"
        ? "只移动后组：满足合焦"
        : "两组协同：同时满足合焦与角尺度",
      19,
    ) + embed(floatingDiagram(m), y + 16, 365);
  body += text(
    y + 406,
    `组2 ${m.active.v.toFixed(3)} mm · 组3 ${m.active.c.toFixed(3)} mm · 像面跨度 ${(m.spread * 1000).toExponential(2)} μm`,
  );
  body += text(
    y + 431,
    `角尺度 ${m.scale.toFixed(3)} mm/rad · 相对无穷远 ${m.breathingPercent.toFixed(4)}%`,
  );
}
await writeFile(
  new URL("./floating/fallback.svg", import.meta.url),
  svg(
    "互动示意：有限对焦的两组协同与固定远景尺度",
    "浮动组对焦与远景尺度",
    1050,
    body,
  ),
);
body = text(
  76,
  "前组+10 D，变倍组−20 D，补偿组+20 D；以下三例均打开自动补偿。",
);
for (const [i, variator] of [20, 50, 60].entries()) {
  const m = zoomSystem({ variator, auto: true }),
    y = 112 + i * 445;
  body +=
    text(
      y,
      `变倍组 ${variator} mm → 补偿组 ${m.active.compensator.toFixed(3)} mm`,
      19,
    ) + embed(zoomDiagram(m), y + 14, 380);
  body += text(
    y + 411,
    `有效焦距 ${m.focalLength.toFixed(3)} mm · 固定像面200 mm · 光束跨度 ${(m.spread * 1000).toExponential(2)} μm`,
  );
}
await writeFile(
  new URL("./zoom/fallback.svg", import.meta.url),
  svg(
    "互动示意：三组变焦的补偿位置与固定像面",
    "变焦补偿与固定像面",
    1460,
    body,
  ),
);
const p = { gap: 125, stop: 50, objectOffset: 0, imageOffset: 0, height: 2 },
  m = relaySystem(p),
  truth = relayTruth(p);
body =
  text(76, "f₁=50 mm，f₂=75 mm；前焦面 z=−50 mm，后焦面 z=200 mm。") +
  embed(telecentricDiagram(p, m), 100, 415);
body += text(548, "带箭头的竖线为薄组；粗开口为光阑；穿过光阑中心的是主光线。");
body += text(
  579,
  `独立几何参照：物方远心 ${truth.objectTelecentric ? "成立" : "不成立"}；像方远心 ${truth.imageTelecentric ? "成立" : "不成立"}。`,
);
body += text(
  610,
  "薄组定位等效平面；横纵比例不同。物距、像距和主光线倾角在互动中分别读数。",
);
await writeFile(
  new URL("./telecentric/fallback.svg", import.meta.url),
  svg(
    "互动示意：双侧远心中继的主光线与边缘光线",
    "双侧远心中继的光阑与主光线",
    650,
    body,
  ),
);
console.log("Generated 3 optical figures from the live drawing functions.");
