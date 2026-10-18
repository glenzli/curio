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
      "从入光侧向下看：FSI先遇到前侧布线所在层，BSI先进入感光硅；逻辑堆栈再把部分处理电路放到独立晶圆。展开层片，分别跟踪光路和电子信号。",
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
      '<style>.actions button{font-size:11px;padding:4px 8px}.stack-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.stack-cards figure{margin:0;min-width:0;border:1px solid #9caea255;border-radius:6px;padding:10px 5px}.stack-cards figcaption{text-align:center;font-size:12px;font-weight:600}.stack-cards svg{display:block;width:100%;height:auto}.stack-cards text{fill:currentColor;font:10px ui-sans-serif,sans-serif}.stack-table{width:100%;border-collapse:collapse;font-size:11px;margin:16px 0}.stack-table td,.stack-table th{text-align:left;border-bottom:1px solid #9caea244;padding:9px 7px;font-weight:400}.stack-table th{font-weight:600}.table-wrap{overflow:auto}.phase{font-size:12px;border-left:2px solid #40879a;padding:8px 12px}.truth{font-size:11px;border:1px solid #9caea255;padding:12px;border-radius:6px;line-height:1.9}.stack-legend{display:flex;gap:16px;flex-wrap:wrap;font-size:11px}.stack-legend span:before{content:"";display:inline-block;width:16px;border-top:2px solid;margin-right:6px}.stack-legend .light{color:#b78637}.stack-legend .electronic{color:#40879a}@media(max-width:650px){.stack-cards{grid-template-columns:1fr}.stack-cards figure{max-width:320px;width:100%;margin:auto}.stack-table{font-size:10px}.stack-table td,.stack-table th{padding:7px 4px}}</style><div class="stack-legend"><span class="light">入光路径 · 到硅为止</span><span class="electronic">电信号路径 · 转换之后</span></div><p class="phase reading" data-phase aria-live="polite"></p><div class="stack-cards"></div><div class="table-wrap"><table class="stack-table" aria-label="传感器结构与独立参照核对"><thead><tr><th>核对项</th><th>FSI</th><th>BSI</th><th>BSI堆栈</th></tr></thead><tbody></tbody></table></div><p class="truth" data-truth></p>',
    note: "三种功能截面均不按工艺尺寸或厚度比例。FSI表示从前侧入光，前侧金属有开口，不表示金属整面不透光；BSI表示从减薄硅背面入光，前侧晶体管和布线仍然存在。虚线为功能路径，不计算折射、吸收深度、DTI串扰或电荷转移效率。光电二极管PPD吸收光后生成电荷，后续电荷转移、电压转换、ADC与数字传输合并为电子信号示意，蓝色线不是继续传播的光。功能晶圆数只数像素与独立逻辑，不数承载基底、微透镜、CFA或键合界面；这是常见的两功能晶圆示例，未涵盖所有堆栈实现。BSI与堆栈是两个分类维度，均不规定全局快门；本图也不规定ADC、存储或像素晶体管的全部细分位置。没有把层距或播放速度换算为QE、读噪、满阱、帧率或全局同步能力。",
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
        (c) =>
          `<figure><figcaption>${c.title}</figcaption>${structureFigure({ ...c, separation: s.separation, progress: s.progress })}</figure>`,
      ).join("");
      root.querySelector("[data-phase]").textContent =
        phases[sections[0].phase] +
        "。动画把过程拉开显示，进度没有物理时间单位。";
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
        "FSI的前侧布线在入光与感光硅之间；两张BSI图的布线在硅之后；仅右图另有逻辑晶圆与跨界互连。展开间距不改变这些关系。这里保留的是可核查的结构参照，不是器件性能的数值真值。";
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
