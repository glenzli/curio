import { WIDTH, HEIGHT, probePixel } from "./scene.js";
import { rasterUrl } from "./raster.js";
import { escape, number } from "../common/lesson-view.js";

let source, images;
const groups = [
  ["场景与捕获", "先看输入，再看传感器留下的码值。"],
  ["编码与监看", "文件里的数值与屏幕上的明暗分别显示。"],
  ["降低监看，检查细节", "两图采用相同的监看设置，对照已记录信息与已知输入。"],
];
export function scenePanels(m, s) {
  if (source !== m) {
    images = [m.evMap, m.raw, m.file, m.monitor, m.lower, m.truth].map((v, i) =>
      rasterUrl(v, WIDTH, HEIGHT, i === 0 || i === 2 ? 1 : 2.2),
    );
    source = m;
  }
  const stage = Math.min(4, Math.floor(s.progress));
  const panels = [
    [
      "已知场景",
      "EV标尺",
      "各处亮度由场景输入给定",
      "−5…+8 EV → 灰阶0…1；显示指数1",
      0,
    ],
    [
      "传感器记录",
      "RAW",
      "满阱裁切后，量化为14 bit码",
      "RAW / 16383；Gamma 2.2",
      1,
    ],
    [
      "文件编码",
      "Log",
      `${s.bits} bit教学Log，按码值大小显示`,
      "Log码 / 满码；显示指数1",
      2,
    ],
    [
      "当前监看",
      "显示",
      `${s.mapping ? "连续肩部" : "硬白点"} · 额外补偿 ${number(s.monitor, 1)} 档`,
      "线性0…1；Gamma 2.2",
      3,
    ],
    [
      "同一文件，监看降三档",
      "记录对照",
      "保留文件码，只降低显示输入",
      "线性0…1；Gamma 2.2",
      4,
    ],
    [
      "未裁切的已知输入",
      "真值对照",
      "跳过捕获与记录的裁切、量化",
      "与图5相同映射；Gamma 2.2",
      4,
    ],
  ].map(([title, badge, detail, scale, step], i) => ({
    title,
    badge,
    detail,
    scale,
    active: stage === step,
    image: images[i],
  }));
  const [px, py] = probePixel(s.probeX, s.probeY);
  const picture = (p) =>
    `<svg class="capture-picture" role="img" aria-label="${escape(p.title)}，蓝色十字标出探针位置" viewBox="0 0 ${WIDTH} ${HEIGHT}"><image href="${p.image}" width="${WIDTH}" height="${HEIGHT}"/><g transform="translate(${px + 0.5} ${py + 0.5})" fill="none" stroke-linecap="round"><path d="M-5 0H-2.6M2.6 0H5M0-5V-2.6M0 2.6V5" stroke="#10191d" stroke-width="1.6"/><path d="M-5 0H-2.6M2.6 0H5M0-5V-2.6M0 2.6V5" stroke="#8ad9ec" stroke-width=".8"/></g></svg>`;
  const card = (p, i) =>
    `<figure class="capture-card${p.active ? " is-active" : ""}" aria-label="${i + 1} ${escape(p.title)}"><figcaption><span class="capture-number">${String(i + 1).padStart(2, "0")}</span><strong>${escape(p.title)}</strong><span class="capture-badge">${escape(p.badge)}</span></figcaption>${picture(p)}<div class="capture-caption"><span>${escape(p.detail)}</span><small>${escape(p.scale)}</small></div></figure>`;
  const sceneKey =
    "窗外 +4.2…+4.7 EV · 织物 −3.5…−2.5 EV · 杯沿高光 +6.3…+6.5 EV";
  const liveFigure = `<style>
    .capture-scene{margin-top:24px}.capture-scene+.stats strong{font-size:18px;white-space:pre-line}.capture-route{display:flex;gap:6px;list-style:none;padding:0;margin:0 0 24px;flex-wrap:wrap}.capture-route li{font-size:11px;padding:3px 8px;border-bottom:2px solid transparent;opacity:.5}.capture-route li[aria-current]{border-color:currentColor;opacity:1;font-weight:600}.capture-row{margin:0 0 26px}.capture-row>header{display:flex;gap:14px;align-items:baseline;margin:0 0 10px;flex-wrap:wrap}.capture-row>header>b{font-size:14px}.capture-row>header>span{font-size:11px;opacity:.65}.capture-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.capture-card{min-width:0;margin:0;border:1px solid var(--line,#999);border-radius:8px;overflow:hidden;background:color-mix(in srgb,currentColor 2%,transparent)}.capture-card.is-active{border-color:currentColor;box-shadow:inset 0 2px currentColor}.capture-card figcaption{display:flex;align-items:center;gap:8px;padding:12px;min-height:48px;line-height:1.4}.capture-number{font-size:10px;font-variant-numeric:tabular-nums;opacity:.5}.capture-card figcaption strong{font-size:12px;font-weight:600}.capture-badge{font-size:10px;opacity:.6;white-space:nowrap;margin-left:auto}.capture-picture{display:block;width:100%;height:auto;background:#000}.capture-caption{padding:10px 12px 12px;font-size:11px;line-height:1.65;display:grid;gap:2px}.capture-caption small{font-size:10px;opacity:.6}.capture-key{font-size:11px;line-height:1.8;opacity:.65;margin-top:-12px}.capture-probe{font-size:11px;opacity:.65;margin:0 0 18px}@media(max-width:550px){.capture-pair{grid-template-columns:1fr}.capture-row>header{gap:4px}.capture-row>header>span{display:block;width:100%}.capture-badge{display:none}.capture-card figcaption strong{font-size:13px}}
  </style><div class="capture-scene"><ol class="capture-route" aria-label="处理顺序">${["场景", "RAW", "Log编码", "监看", "降低监看与真值"].map((label, i) => `<li${stage === i ? ' aria-current="step"' : ""}>${i + 1} · ${label}</li>`).join("")}</ol><p class="capture-probe">蓝色十字在六幅图中标出同一位置。</p>${groups
    .map(
      ([title, detail], i) =>
        `<section class="capture-row"><header><b>${title}</b><span>${detail}</span></header><div class="capture-pair">${panels
          .slice(i * 2, i * 2 + 2)
          .map((p, j) => card(p, i * 2 + j))
          .join("")}</div></section>`,
    )
    .join("")}<div class="capture-key">${sceneKey}</div></div>`;
  // The static figure uses the exact same PNG bytes and probe coordinates.
  const staticRows = groups
    .map(([title], row) => {
      const cards = panels
        .slice(row * 2, row * 2 + 2)
        .map(
          (p, col) =>
            `<g transform="translate(${col * 366} 30)"><rect x=".5" y=".5" width="353" height="310" rx="7" fill="none" stroke="currentColor" opacity="${p.active ? 0.7 : 0.18}"/><text x="12" y="24" style="font-size:14px;font-weight:600">${row * 2 + col + 1} · ${escape(p.title)}</text>${picture(p).replace("<svg ", '<svg x="12" y="38" width="330" height="220" ')}<text x="12" y="282" style="font-size:12px">${escape(p.detail)}</text><text x="12" y="300" style="font-size:10px" opacity=".65">${escape(p.scale)}</text></g>`,
        )
        .join("");
      return `<g transform="translate(0 ${row * 364})"><text x="0" y="17" style="font-size:16px;font-weight:600">${title}</text>${cards}</g>`;
    })
    .join("");
  return {
    figureHeight: 1115,
    figure: `<svg class="drawing" role="img" aria-label="窗边静物的场景、RAW、Log、监看与真值对照" viewBox="0 0 720 1115"><style>text{fill:currentColor;font-family:inherit}</style>${staticRows}<text x="0" y="1110" style="font-size:12px">${sceneKey}</text></svg>`,
    liveFigure,
  };
}
