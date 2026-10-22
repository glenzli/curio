import { experiment } from "../common/ui.js";
import { replay } from "../common/replay.js";
import { adcErrors } from "./model.js";
import { rampFigure, errorFigure, columnFigure } from "./figures.js";
export function mount({ element, signal, session }) {
  let key, m;
  return experiment({
    element,
    signal,
    session,
    kicker: "第三章 · 列并行ADC误差",
    title: "列偏置、斜坡非线性与码值误差",
    intro:
      "各时钟边沿的斜坡电压决定输入电压对应的码区间。固定列偏置会形成列纹；斜坡弯曲后，减去暗场码也未必能消掉亮处的列差。",
    controls: [
      {
        key: "bits",
        numeric: { step: 1, unit: "bit" },
        label: "ADC位深",
        min: 6,
        max: 10,
        step: 1,
        value: 8,
        format: (v) => v + " bit",
      },
      {
        key: "curvature",
        label: "斜坡曲率 a",
        min: -0.8,
        max: 0.8,
        step: 0.05,
        value: 0.45,
        format: (v) => v.toFixed(2),
      },
      {
        key: "offset",
        label: "列电压偏置幅度",
        min: 0,
        max: 6,
        step: 0.25,
        value: 2,
        format: (v) => v.toFixed(2) + " 理想LSB",
      },
      {
        key: "signal",
        label: "信号电压 / 1 V量程",
        min: 0,
        max: 1,
        step: 0.001,
        value: 0.375,
        format: (v) => v.toFixed(3) + " V",
      },
      {
        key: "column",
        numeric: { step: 1, unit: "列" },
        label: "放大观察的列",
        min: 0,
        max: 11,
        step: 1,
        value: 3,
        format: (v) => "列 " + v,
      },
      {
        key: "progress",
        label: "本次扫描进度",
        min: 0,
        max: 100,
        step: 0.25,
        value: 100,
        format: (v) => v.toFixed(1) + "%",
      },
    ],
    presets: [
      {
        label: "弯曲斜坡",
        values: { curvature: 0.45, offset: 2, signal: 0.375, progress: 100 },
      },
      {
        label: "只看列偏置",
        values: { curvature: 0, offset: 4, signal: 0.375, progress: 100 },
      },
      {
        label: "只看斜坡非线性",
        values: { curvature: 0.6, offset: 0, signal: 0.375, progress: 100 },
      },
      {
        label: "减暗场仍有残差",
        values: { curvature: 0.6, offset: 4, signal: 0.75, progress: 100 },
      },
      {
        label: "反向弯曲",
        values: { curvature: -0.6, offset: 4, signal: 0.75, progress: 100 },
      },
      { label: "输入超量程", values: { signal: 1, progress: 100 } },
      { label: "从扫描开始", values: { progress: 0 } },
    ],
    content:
      '<style>.actions button{font-size:11px;padding:4px 8px}.adc-plots{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,400px),1fr));gap:12px}.adc-plots>div{min-width:0}.chart text{font-size:13px}.columns svg{width:100%;height:auto}.columns text{fill:currentColor}.truth{font-size:11px;line-height:1.9;border:1px solid var(--line,#aaa);padding:12px;border-radius:6px}.stats strong{font-size:20px}@media(max-width:650px){.chart text{font-size:21px}.columns text{font-size:19px}.stats{grid-template-columns:1fr}}</style><div class="chart" data-ramp></div><div class="legend"><span><i style="border-color:#40879a"></i>实际斜坡</span><span><i style="border-color:#999;border-top-style:dashed"></i>理想线性斜坡</span><span><i style="border-color:#bb7946"></i>所选列输入</span></div><p class="reading" data-latch aria-live="polite"></p><div class="columns" data-columns></div><div class="stats"></div><div class="adc-plots"><div class="chart" data-dnl></div><div class="chart" data-inl></div></div><p class="reading" data-reading></p><p class="truth" data-truth></p>',
    note: "1 V量程，10 MHz固定时钟，16个理想LSB的固定电压基座；12列偏置由声明的固定图样乘幅度得到，不是每次转换新抽的噪声。斜坡r(τ)=τ+aτ(1−τ)，|a|≤0.8保证严格单调、无缺码。生产码由时钟阈值区间搜索，独立对照由连续交叉时刻的二次根和整周期锁存求得；恰在边沿取新码。DNL按码宽/理想码宽−1，INL按阈值相对固定零点/满量程直线定义；未作最佳直线拟合。此处减暗场用无噪声的精确暗场码，未估计校准参数；电压偏置归零是已知生成参数对照，不是实际校准算法。阴影与亮处码斜率不同，加上量化，暗场码差未必能抵消信号码差。列纹灰度为DN差示意，×表示输入截顶，不按图中灰度判断原始照片。未含比较器延迟、亚稳态、列增益差、读噪或漂移；扫描时间与回放速度分开。",
    update(root, s) {
      const k = JSON.stringify([s.bits, s.curvature, s.offset, s.signal]);
      m = adcErrors(s);
      root.querySelector("[data-ramp]").innerHTML = rampFigure(m);
      if (k !== key) {
        root.querySelector("[data-columns]").innerHTML = columnFigure(m);
        root.querySelector("[data-dnl]").innerHTML = errorFigure(m);
        root.querySelector("[data-inl]").innerHTML = errorFigure(m, "inl");
        key = k;
      }
      const c = m.columns[s.column],
        maxD = Math.max(...m.dnl.map(Math.abs)),
        maxI = Math.max(...m.inl.map(Math.abs));
      root.querySelector("[data-latch]").textContent =
        `当前${(m.tau * m.totalUs).toFixed(4)} µs，公共计数${m.counter}，斜坡${m.rampVoltage.toFixed(6)} V；列${s.column}${c.finished ? "已结束：" + c.code + " DN" : "尚未锁存"}。${c.clipped ? "该输入超出可用电压区间，最终输出上限码。" : ""}`;
      root.querySelector(".stats").innerHTML = [
        [
          "所选列最终码",
          c.code + " DN",
          "暗场 " + c.dark + " DN；差 " + (c.code - c.dark) + " DN",
        ],
        ["最大|DNL|", maxD.toFixed(4) + " LSB", "零点与量程不变"],
        ["最大|INL|", maxI.toFixed(4) + " LSB", "固定端点参考"],
      ]
        .map(
          ([a, b, c]) =>
            `<div><small>${a}</small><strong>${b}</strong><em>${c}</em></div>`,
        )
        .join("");
      root.querySelector("[data-reading]").textContent =
        `列${s.column}电压偏置${(1000 * c.bias).toFixed(4)} mV；原始列差${c.rawError} DN，减暗场后的列差${c.darkError} DN。无偏置参考列的信号码${m.baseline}、暗场码${m.dark0}。完整扫描${m.totalUs.toFixed(3)} µs，理想码宽${(1000 * m.delta).toFixed(4)} mV。`;
      root.querySelector("[data-truth]").textContent =
        `独立交叉根得到${c.truth.code} DN，阈值搜索得到${c.code} DN；码差${c.code - c.truth.code}。DNL解析式a[1−(2k+1)/L]最大差${Math.max(...m.dnl.map((v, k) => Math.abs(v - m.dnlTruth[k]))).toExponential(2)}；INL解析式a·k(1−k/L)最大差${Math.max(...m.inl.map((v, k) => Math.abs(v - m.inlTruth[k]))).toExponential(2)}。原始偏置和减暗场残差的比较只在未截顶列作线性校准解释。`;
    },
    setup: ({ root, state, render }) =>
      replay({
        root,
        state,
        render,
        element,
        signal,
        key: "progress",
        label: "回放非线性斜坡扫描",
        durationMs: 8500,
      }),
  });
}
