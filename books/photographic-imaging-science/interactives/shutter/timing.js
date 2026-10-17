import { experiment } from "../common/ui.js";
import { exposureState } from "./model.js";
import { playback } from "./playback.js";

const format = (x) => x.toLocaleString("zh-CN", { maximumFractionDigits: 3 });
const names = ["顶", "1/6", "2/6", "中", "4/6", "5/6", "底"];
const labels = { waiting: "未开始", exposing: "积分中", complete: "已结束" };

function panel(mode, scan, exposure, now, duration, selected) {
  let rows = "";
  for (let i = 0; i < 7; i++) {
    const row = exposureState(i / 6, mode === "global" ? 0 : scan, exposure, now);
    rows += `<div class="time-row ${i === selected ? "selected" : ""}"><span>${names[i]}</span><div class="row-track"><span class="window" style="left:${100 * row.start / duration}%;width:${100 * exposure / duration}%"><i style="width:${100 * row.fraction}%"></i></span><span class="time-cursor" style="left:${100 * now / duration}%"></span></div><span class="row-status ${row.status}">${labels[row.status]}</span></div>`;
  }
  return `<section class="timing-panel" aria-label="${mode === "global" ? "全局快门" : "滚动快门"}曝光窗口"><h4>${mode === "global" ? "全局快门" : "滚动快门"}</h4><p>${mode === "global" ? "各行同时开始、同时结束" : "各行的曝光窗口沿时间错开"}</p>${rows}<div class="time-row time-axis"><span></span><div><span>0</span><span>${format(duration * 500)}</span><span>${format(duration * 1000)} ms</span></div><span></span></div></section>`;
}

export function mount({ element, signal }) {
  return experiment({
    element, signal, kicker: "快门 · 同一时间轴对照", title: "滚动与全局快门的曝光窗口",
    intro: "两个窗口使用相同的每行曝光时间和时间刻度。拖动当前时刻，比较同一行何时开始、何时结束，以及此时其他行的状态。",
    controls: [
      { key: "scanMs", label: "滚动快门首末行时间差", min: 0, max: 40, step: .001, value: 17.272, format: x => `${format(x)} ms` },
      { key: "exposureMs", label: "每行曝光时间", min: .25, max: 20, step: .25, value: 2, format: x => `${format(x)} ms` },
      { key: "progress", label: "当前时刻", min: 0, max: 100, step: 1, value: 45, format: x => `${Math.round(x)}%` },
      { key: "row", label: "选中代表行", min: 0, max: 6, step: 1, value: 3, format: x => names[x] },
    ],
    presets: [
      { label: "短曝光", values: { exposureMs: .5, scanMs: 17.272, progress: 45 } },
      { label: "长曝光", values: { exposureMs: 10, scanMs: 17.272, progress: 45 } },
      { label: "两边同时曝光", values: { scanMs: 0, progress: 45 } },
    ],
    content: `<style>.timing-pair{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:20px 0}.timing-panel{min-width:0;padding:14px;border:1px solid #9caea244;border-radius:6px}.timing-panel h4{font-size:15px;margin:0}.timing-panel p{font-size:10px;margin:3px 0 14px}.time-row{display:grid;grid-template-columns:22px minmax(0,1fr) 42px;gap:5px;align-items:center;font-size:10px;margin:10px 0}.row-track{position:relative;height:20px;border-bottom:1px solid #9caea233}.window{position:absolute;top:4px;height:11px;background:#3f8b9822;border:1px solid #3f8b9877;min-width:1px}.window i{display:block;height:100%;background:color-mix(in srgb,#3f8b98 70%,currentColor)}.time-cursor{position:absolute;top:-2px;bottom:-2px;width:1px;background:#b98447}.selected{font-weight:600}.selected .row-track{background:#9caea214}.exposing{font-weight:600}.complete{opacity:.85}.waiting{opacity:.65}.time-axis>div{display:flex;justify-content:space-between;white-space:nowrap;font-size:9px}.timing-reading{font-size:12px;font-variant-numeric:tabular-nums}.timing-key{display:flex;gap:16px;font-size:10px;opacity:.75}.timing-key i{display:inline-block;width:16px;height:7px;background:#3f8b9822;border:1px solid #3f8b9877}.timing-key i.integrated{background:color-mix(in srgb,#3f8b98 70%,currentColor)}.timing-key i.cursor{width:1px;height:11px;background:#b98447;border:0}@media(max-width:650px){.timing-pair{grid-template-columns:1fr;gap:12px}.timing-panel{padding:12px}.time-row{font-size:11px}.timing-key{flex-wrap:wrap;gap:8px 14px}}</style><div class="timing-key"><span><i></i> 完整曝光窗口</span><span><i class="integrated"></i> 已积分部分</span><span><i class="cursor"></i> 当前时刻</span></div><div class="timing-pair" data-panels></div><p class="timing-reading" data-reading aria-live="polite"></p>`,
    note: "图中抽取 7 条代表行。默认首末行时间差 17.272 ms；全局快门对照只把各行曝光起点设为相同。色条表示时间窗口，深色比例表示窗口已经经过的时间，不代表任意变光场景中的电荷比例。这里不模拟积分结束后的搬运与串行输出，也不比较两种器件的噪声。回放一遍为 6 秒，离开视区自动暂停。",
    update(root, state) {
      const scan = state.scanMs / 1000, exposure = state.exposureMs / 1000;
      const duration = scan + exposure, now = duration * state.progress / 100;
      root.querySelector("[data-panels]").innerHTML = panel("rolling", scan, exposure, now, duration, state.row) + panel("global", scan, exposure, now, duration, state.row);
      const rolling = exposureState(state.row / 6, scan, exposure, now);
      const global = exposureState(state.row / 6, 0, exposure, now);
      root.querySelector("[data-reading]").textContent = `当前 ${format(now * 1000)} ms。选中行（${names[state.row]}）：滚动快门 ${format(rolling.start * 1000)} → ${format(rolling.end * 1000)} ms（${labels[rolling.status]}）；全局快门 0 → ${format(exposure * 1000)} ms（${labels[global.status]}）。`;
    },
    setup: ({ root, state, render }) => playback({ root, state, render, element, signal }),
  });
}
