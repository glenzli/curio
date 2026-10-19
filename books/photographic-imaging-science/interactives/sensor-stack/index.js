import { experiment } from "../common/ui.js";
import { replay } from "../common/replay.js";
import {
  CONFIGURATIONS,
  crossSection,
  inspectStructure,
  STRUCTURE_TRUTH,
} from "./model.js";
import { structureFigure } from "./figures.js";
const yes = (v) => (v ? "是" : "否"),
  phases = {
    light: "入射光到达感光硅",
    charge: "光电转换后，电荷留在感光节点",
    pixel: "电子信号送往前侧像素电路",
    output: "同片读出，或跨互连送往独立逻辑",
  };
export function mount({ element, signal, session }) {
  return experiment({
    element,
    signal,
    session,
    kicker: "第六章 · 入光侧与功能晶圆",
    title: "FSI、BSI 与逻辑堆栈分别改变什么？",
    intro:
      "以带微透镜和CFA的彩色像素为例：FSI的光先经过前侧布线所在层，BSI从硅背面入光；逻辑堆栈把部分处理电路放到独立晶圆。展开层片，分别跟踪入光和电子信号。",
    controls: [
      {
        key: "separation",
        label: "层片展开间距",
        min: 0,
        max: 100,
        step: 1,
        value: 55,
        format: (v) => v.toFixed(0) + "%",
      },
      {
        key: "progress",
        label: "入光 → 读出的展示进度",
        min: 0,
        max: 100,
        step: 0.25,
        value: 100,
        format: (v) => v.toFixed(1) + "%",
      },
    ],
    presets: [
      { label: "层片合拢", values: { separation: 0 } },
      { label: "展开看结构", values: { separation: 100 } },
      { label: "看入光", values: { progress: 20 } },
      { label: "看感光节点", values: { progress: 50 } },
      { label: "看像素电路", values: { progress: 72 } },
      { label: "看逻辑连接", values: { progress: 100 } },
      { label: "从入光开始", values: { progress: 0 } },
    ],
    content:
      '<style>.actions button{font-size:11px;padding:4px 8px}.stack-cards{display:flex;flex-wrap:wrap;justify-content:center;gap:12px}.stack-cards figure{flex:1 1 285px;max-width:380px;margin:0;min-width:0;border:1px solid #9caea244;border-radius:8px;padding:16px 6px 5px;background:color-mix(in srgb,currentColor 2%,transparent)}.stack-cards figcaption{text-align:center;font-size:13px;font-weight:600;line-height:1.7}.stack-cards figcaption small{display:block;font-size:10px;font-weight:400;opacity:.65;margin-bottom:12px}.stack-cards svg{display:block;width:100%;height:auto}.stack-table{width:100%;border-collapse:collapse;font-size:11px;margin:16px 0}.stack-table td,.stack-table th{text-align:left;border-bottom:1px solid #9caea244;padding:9px 7px;font-weight:400}.stack-table th{font-weight:600}.table-wrap{overflow:auto}.phase{font-size:12px;border-left:2px solid #40879a;padding:8px 12px}.truth{font-size:11px;border:1px solid #9caea255;padding:12px;border-radius:6px;line-height:1.9}.stack-legend{display:flex;gap:16px;flex-wrap:wrap;font-size:11px}.stack-legend span:before{content:"";display:inline-block;width:16px;border-top:2px solid;margin-right:6px}.stack-legend .light{color:#b78637}.stack-legend .electronic{color:#40879a}@media(max-width:650px){.stack-cards figure{max-width:320px;width:100%;margin:auto}.stack-table{font-size:10px}.stack-table td,.stack-table th{padding:7px 4px}}</style><div class="stack-legend"><span class="light">入光路径 · 到硅为止</span><span class="electronic">电信号路径 · 转换之后</span></div><p class="phase reading" data-phase aria-live="polite"></p><div class="stack-cards"></div><div class="table-wrap"><table class="stack-table" aria-label="传感器结构与独立参照核对"><thead><tr><th>核对项</th><th>FSI</th><th>BSI</th><th>BSI堆栈</th></tr></thead><tbody></tbody></table></div><p class="truth" data-truth></p>',
    note: "按功能层序绘图，厚度和间距用于辨认结构。微透镜与CFA位于入光侧；FSI布线留有开口，BSI的前侧电路位于硅之后。橙线只标出经过各层的先后，未计算折射与吸收。PPD将吸收的光转换为电荷，后续电荷转移、电压转换、ADC和数字传输合并画成蓝色信号路径。功能晶圆只计像素与独立逻辑，支撑、CFA与键合不计入；本图采用常见的两晶圆堆栈，具体电路分工因实现而异。QE、满阱、读噪、速度和快门同步需另用器件参数检验。",
    update(root, s) {
      const sections = CONFIGURATIONS.map((c) =>
          crossSection({
            ...c,
            separation: s.separation,
            progress: s.progress,
          }),
        ),
        audits = sections.map(inspectStructure),
        passed = audits.every(
          (a, i) =>
            JSON.stringify(a) ===
            JSON.stringify(STRUCTURE_TRUTH[CONFIGURATIONS[i].id]),
        );
      root.querySelector(".stack-cards").innerHTML = CONFIGURATIONS.map(
        (c, i) =>
          `<figure><figcaption>${c.title}<small>${["布线在感光硅之前", "从硅背面入光", "像素与逻辑分别制造"][i]}</small></figcaption>${structureFigure({ ...c, separation: s.separation, progress: s.progress })}</figure>`,
      ).join("");
      root.querySelector("[data-phase]").textContent =
        phases[sections[0].phase] +
        "。回放只表示先后，播放速度不代表器件速度。";
      const rows = [
        [
          "到感光硅前经过前侧金属层",
          ...audits.map((a) => yes(a.metalBeforeSilicon)),
        ],
        ["有独立逻辑晶圆", ...audits.map((a) => yes(a.independentLogic))],
        ["所画功能晶圆数", ...audits.map((a) => String(a.functionalWafers))],
        ["电子路径跨入逻辑晶圆", ...audits.map((a) => yes(a.reachesLogic))],
      ];
      root.querySelector("tbody").innerHTML = rows
        .map(
          (r) =>
            "<tr>" +
            r
              .map((v, i) =>
                i ? `<td>${v}</td>` : `<th scope="row">${v}</th>`,
              )
              .join("") +
            "</tr>",
        )
        .join("");
      root.querySelector("[data-truth]").textContent =
        "结构参照核对：" +
        (passed
          ? "三张截面的层序、功能晶圆归属和电子路径均符合独立参照。"
          : "发现结构不一致。") +
        "FSI先经过布线，BSI先进入感光硅；右图再经键合互连到逻辑晶圆。展开间距改变时，这些层序和连接关系保持不变。";
      root.querySelector(".lab").dataset.structure = passed
        ? "verified"
        : "mismatch";
    },
    setup: ({ root, state, render }) =>
      replay({
        root,
        state,
        render,
        element,
        signal,
        key: "progress",
        label: "回放入光与读出",
        durationMs: 9000,
      }),
  });
}
