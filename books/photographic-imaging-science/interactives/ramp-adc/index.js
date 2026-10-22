import { experiment } from "../common/ui.js";
import { replay } from "../common/replay.js";
import { rampState, thresholdTruth } from "./model.js";
import { rampFigure, clockFigure } from "./figures.js";
export function mount({ element, signal, session }) {
  return experiment({
    element,
    signal,
    session,
    kicker: "第三章 · 单斜坡模数转换",
    title: "单斜坡 ADC 的扫描与锁存",
    intro:
      "三个列输入共用一条上升斜坡和计数时钟。拖动扫描进度，观察各列何时锁存；A可以调节，B固定为量程的75%，C故意超过量程。",
    controls: [
      {
        key: "bits",
        numeric: { step: 1, unit: "bit" },
        label: "ADC位深",
        min: 3,
        max: 12,
        step: 1,
        value: 8,
        format: (v) => v + " bit",
      },
      {
        key: "inputPercent",
        label: "A输入 / 满量程",
        min: -10,
        max: 110,
        step: 0.5,
        value: 37.5,
        format: (v) => v.toFixed(1) + "%",
      },
      {
        key: "clockMHz",
        label: "计数时钟频率",
        min: 5,
        max: 40,
        step: 5,
        value: 10,
        format: (v) => v + " MHz",
      },
      {
        key: "fullScale",
        label: "满量程电压跨度",
        min: 0.5,
        max: 2,
        step: 0.1,
        value: 1,
        format: (v) => v.toFixed(1) + " V",
      },
      {
        key: "progress",
        label: "扫描进度",
        min: 0,
        max: 100,
        step: 0.25,
        value: 25,
        format: (v) => v.toFixed(2) + "%",
      },
    ],
    presets: [
      {
        label: "8 bit · 10 MHz",
        values: {
          bits: 8,
          clockMHz: 10,
          fullScale: 1,
          inputPercent: 37.5,
          progress: 100,
        },
      },
      {
        label: "10 bit · 同时钟",
        values: {
          bits: 10,
          clockMHz: 10,
          fullScale: 1,
          inputPercent: 37.5,
          progress: 100,
        },
      },
      {
        label: "A交叉时刻",
        values: (s) => ({
          progress: Math.max(0, Math.min(100, s.inputPercent)),
        }),
      },
      { label: "输入超量程", values: { inputPercent: 105, progress: 100 } },
      { label: "从扫描开始", values: { progress: 0 } },
    ],
    content:
      '<style>.actions button{font-size:11px;padding:4px 8px}.adc-chart svg{width:100%;height:auto;display:block}.adc-chart text{fill:currentColor;font:12px ui-sans-serif,sans-serif}.adc-channels{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.adc-channels section{border:1px solid #9caea255;padding:12px;border-radius:6px;min-width:0}.adc-channels h4{margin:0 0 6px;font-size:12px}.adc-channels p{font-size:11px}.adc-channels code{font-size:13px;overflow-wrap:anywhere;display:block}.truth{font-size:11px;line-height:1.9;border:1px solid #9caea255;border-radius:6px;padding:12px;overflow-wrap:anywhere}.stats strong{font-size:20px}@media(max-width:550px){.adc-chart text{font-size:16px}.adc-channels,.stats{grid-template-columns:1fr}.stats>div{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}}</style><div class="stats"></div><div class="adc-chart" data-ramp></div><div class="adc-channels"></div><div class="adc-chart" data-clock></div><p class="reading" data-reading></p><div class="truth" data-truth aria-label="单斜坡ADC独立真值对照"></div>',
    note: "理想上升单斜坡、保持不变的列输入、零比较器延迟和偏置；按2ᵇ个时钟扫完整电压跨度。交叉时刻用floor(V/Δ)锁存码，负输入输出0，达到或超过满量程输出最大码；计数到最大码后保持，完成末码区间再结束扫描。重建用码区间中点。显示二进制计数，实际电路可用格雷码处理多位同时翻转。无亚稳态、参考斜坡非线性、量化抖动或列间失配；未模拟其他ADC架构。动画时长仅为回放速度，横轴另列真实µs；最坏扫描时间不是整台相机帧时间。",
    update(root, s) {
      const input = {
          bits: s.bits,
          fullScale: s.fullScale,
          clockMHz: s.clockMHz,
          inputFraction: s.inputPercent / 100,
          progress: s.progress,
        },
        m = rampState(input),
        c = m.channels[0],
        truth = thresholdTruth(c.voltage, s.bits, s.fullScale);
      root.querySelector(".stats").innerHTML = [
        ["完整扫描", m.totalUs.toFixed(3) + " µs", m.levels + " 个时钟周期"],
        [
          "量化步长 Δ",
          (m.delta * 1000).toFixed(5) + " mV",
          s.fullScale + " V / " + m.levels,
        ],
        ["此刻公共计数", String(m.counter), m.elapsedUs.toFixed(4) + " µs"],
      ]
        .map(
          ([a, b, c]) =>
            `<div><small>${a}</small><strong>${b}</strong><em>${c}</em></div>`,
        )
        .join("");
      root.querySelector("[data-ramp]").innerHTML = rampFigure(input);
      root.querySelector("[data-clock]").innerHTML = clockFigure(input);
      root.querySelector(".adc-channels").innerHTML = m.channels
        .map(
          (c, i) =>
            `<section><h4>输入${["A", "B", "C"][i]} · ${c.voltage.toFixed(4)} V</h4><p>${!c.finished ? (c.overRange ? "输入超量程，等待扫描结束" : "等待交叉") : c.overRange ? (c.crossed ? "满量程交叉，输出上限码" : "无交叉，扫描结束输出上限码") : c.underRange ? "低于量程，输出0" : "已锁存，公共扫描继续"}</p><code>${c.finished ? c.binary : "—".repeat(s.bits)}</code><p>${c.finished ? c.latchedCode + " DN" : "尚无输出码"}</p></section>`,
        )
        .join("");
      root.querySelector("[data-reading]").textContent =
        `A的理想最终码为 ${c.code}；交叉时刻 ${c.crossingUs === null ? "超出本次扫描" : c.crossingUs.toFixed(4) + " µs"}。${c.underRange || c.overRange ? "输入超出声明的码区间，不用半码宽概括截顶误差。" : "码区间中点重建为 " + c.reconstruction.toFixed(7) + " V，误差 " + (c.error * 1000).toFixed(5) + " mV，界限±" + (m.delta * 500).toFixed(5) + " mV。"}`;
      root.querySelector("[data-truth]").textContent =
        `独立真值对照：时刻公式得到最终码 ${c.code}，逐个扫描电压区间得到 ${truth.code}；中点重建差 ${(c.reconstruction - truth.reconstruction).toExponential(2)} V。增加两位并保持时钟和量程时：${s.bits}→${s.bits + 2} bit，扫描 ${m.totalUs.toFixed(3)}→${(4 * m.totalUs).toFixed(3)} µs，步长缩为1/4。`;
      root.querySelector(".lab").dataset.latch = String(c.latchedCode);
    },
    setup: ({ root, state, render }) =>
      replay({
        root,
        state,
        render,
        element,
        signal,
        key: "progress",
        label: "回放一次扫描",
        durationMs: 8000,
      }),
  });
}
