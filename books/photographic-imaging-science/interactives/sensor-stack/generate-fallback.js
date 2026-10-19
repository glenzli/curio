import { writeFile } from "node:fs/promises";
import {
  CONFIGURATIONS,
  crossSection,
  inspectStructure,
  STRUCTURE_TRUTH,
} from "./model.js";
import { structureFigure } from "./figures.js";
const numbered = process.argv.includes("--numbered");
const title = numbered
  ? "图 6.3 FSI、BSI 与逻辑堆栈的层次区别"
  : "互动示意：FSI、BSI与逻辑堆栈的功能层序和结构核对";
const descriptions = ["布线在感光硅之前", "从硅背面入光", "像素与逻辑分别制造"];
for (const c of CONFIGURATIONS) {
  const audit = inspectStructure(crossSection(c));
  if (JSON.stringify(audit) !== JSON.stringify(STRUCTURE_TRUTH[c.id]))
    throw Error("Sensor structure differs from reference: " + c.id);
}
const embed = (svg, x) =>
  svg
    .replace("<svg ", `<svg x="${x}" y="201" width="280" height="385" `)
    .replaceAll('id="stack-', 'id="' + x + "-stack-")
    .replaceAll("url(#stack-", "url(#" + x + "-stack-");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="710" viewBox="0 0 1000 710" role="img" aria-label="${title}" style="color:#293744;font-family:Arial,'PingFang SC',sans-serif">
<rect width="1000" height="710" fill="#fafbfc"/><rect x="8" y="8" width="984" height="694" rx="12" fill="white" stroke="#e6e9ed"/>
<text x="36" y="39" font-size="25" font-weight="600" fill="#25303b">${numbered ? title : "入光侧与逻辑堆栈"}</text><path d="M36 60H964" stroke="#edf0f4"/>
<path d="M37 98H67" stroke="#b77b20" stroke-width="2" stroke-dasharray="4 3"/><text x="77" y="103" font-size="16" fill="#735620">入射光 · 到感光硅</text><path d="M355 98H385" stroke="#247d91" stroke-width="2"/><text x="395" y="103" font-size="16" fill="#247d91">电子信号 · 从感光节点到电路</text>
${CONFIGURATIONS.map((c, i) => `<rect x="${35 + i * 315}" y="135" width="300" height="465" rx="9" fill="#fcfdfd" stroke="#d9e2e4"/><text x="${185 + i * 315}" y="168" font-size="20" font-weight="600" text-anchor="middle" fill="#293744">${c.title}</text><text x="${185 + i * 315}" y="190" font-size="14" text-anchor="middle" fill="#6c7981">${descriptions[i]}</text>${embed(structureFigure({ ...c, separation: 80, progress: 100 }), 45 + i * 315)}`).join("")}
<text x="40" y="638" font-size="18" fill="#293744">FSI / BSI 区分入光侧；独立的逻辑晶圆使本例的功能晶圆数从 1 变为 2。</text>
<text x="40" y="675" font-size="16" fill="#6c7981">功能层序示意，厚度与间距不按工艺比例；布线留有入光开口，结构图不换算为器件性能。</text></svg>`;
await writeFile(
  new URL(
    numbered ? "../../figures/06_sensor_structures.svg" : "./fallback.svg",
    import.meta.url,
  ),
  svg,
);
