import { experiment } from "../common/ui.js";
import { replay } from "../common/replay.js";
import {
  observations,
  observedMoments,
  countingTruth,
  distribution,
} from "./model.js";
import {
  eventFigure,
  histogramFigure,
  incoming,
  collected,
} from "./figures.js";
const fixed = (x) => x.toFixed(3);
export function mount({ element, signal, session }) {
  let cacheKey, data;
  return experiment({
    element,
    signal,
    session,
    kicker: "第二章 · 光子到达与量子效率",
    title: "一次曝光的计数与多次曝光的分布",
    intro:
      "上图逐个显示当前一次曝光的事件；下图统计4096次完整曝光。切换固定入射数，可比较只做二项筛选与Poisson到达的区别。",
    controls: [
      {
        key: "incident",
        label: "入射光子数（Poisson模式为均值）",
        min: 0,
        max: 80,
        step: 1,
        value: 24,
        format: (v) => v + " 个 / 曝光",
      },
      {
        key: "eta",
        label: "量子效率 η",
        min: 0,
        max: 1,
        step: 0.05,
        value: 0.5,
        format: (v) => (100 * v).toFixed(0) + "%",
      },
      {
        key: "progress",
        label: "本次曝光进度",
        min: 0,
        max: 100,
        step: 0.5,
        value: 35,
        format: (v) => v.toFixed(1) + "%",
      },
    ],
    presets: [
      { label: "Poisson入射", values: { mode: "poisson" } },
      { label: "固定入射数", values: { mode: "fixed" } },
      {
        label: "24个 · QE一半",
        values: { incident: 24, eta: 0.5, progress: 100 },
      },
      { label: "全部收集", values: { eta: 1, progress: 100 } },
      { label: "从头播放", values: { progress: 0 } },
      {
        label: "换一组曝光",
        values: (s) => ({ seed: (s.seed ?? 20261018) + 1 }),
      },
    ],
    content: `<style>.actions button{font-size:11px;padding:4px 8px}.count-chart svg{width:100%;height:auto;display:block}.count-chart text{fill:currentColor;font:12px ui-sans-serif,sans-serif}.count-key{font-size:11px;display:flex;flex-wrap:wrap;gap:8px 18px}.count-key i{display:inline-block;width:14px;height:5px;margin-right:5px}.truth{font-size:11px;line-height:1.9;border:1px solid #9caea255;border-radius:6px;padding:12px;overflow-wrap:anywhere}.stats strong{font-size:20px}@media(max-width:550px){.count-chart text{font-size:16px}.stats{grid-template-columns:1fr}.stats>div{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}}</style><p class="reading" data-mode></p><div class="count-chart" data-events></div><div class="stats"></div><h4>4096次完整曝光</h4><div class="count-chart" data-histogram></div><div class="count-key"><span><i style="background:${incoming}"></i>入射光子</span><span><i style="background:${collected}"></i>收集电子</span><span>柱：观测频数；虚线：精确分布</span></div><p class="reading" data-reading></p><div class="truth" data-truth aria-label="计数分布独立真值对照"></div>`,
    note: "普通可见光、无倍增、无满阱截断的计数模型。Poisson模式以独立指数等待时间生成入射事件；固定入射数模式每次恰好n个，到达时刻独立均匀分布。每事件用独立均匀标记与η比较，至多收集一个电子；连线只表示事件筛选，不表示硅内轨迹。无暗电流、读噪、串扰或光源强度漂移。直方图始终对应4096次完整曝光，时间轴只回放其中第一次；有限样本不要求均值和方差恰等于真值。",
    update(root, s) {
      const p = {
          incident: s.incident,
          eta: s.eta,
          mode: s.mode === "fixed" ? "fixed" : "poisson",
          seed: Number.isSafeInteger(s.seed) ? s.seed : 20261018,
        },
        key = JSON.stringify(p);
      Object.assign(s, { mode: p.mode, seed: p.seed });
      if (key !== cacheKey) {
        const samples = observations(p),
          measured = observedMoments(samples),
          truth = countingTruth(p),
          pmf = distribution(p);
        const pmfMean = pmf.reduce((a, v, k) => a + k * v, 0),
          pmfVariance = pmf.reduce((a, v, k) => a + (k - pmfMean) ** 2 * v, 0);
        data = {
          samples,
          measured,
          truth,
          pmfMean,
          pmfVariance,
          histogram: histogramFigure(p, samples),
        };
        root.querySelector("[data-histogram]").innerHTML = data.histogram;
        cacheKey = key;
      }
      const { measured: m, truth: t } = data;
      root.querySelector("[data-mode]").textContent =
        p.mode === "poisson"
          ? `每次入射数随机，均值 μγ=${p.incident}；QE=${p.eta}。`
          : `每次恰好入射 n=${p.incident} 个光子；QE=${p.eta}。`;
      root.querySelector("[data-events]").innerHTML = eventFigure(
        p,
        s.progress,
      );
      root.querySelector(".stats").innerHTML = [
        [
          "观测电子均值",
          fixed(m.electronMean) + " e⁻",
          "真值 " + fixed(t.mean) + " e⁻",
        ],
        [
          "观测电子方差",
          fixed(m.electronVariance) + " (e⁻)²",
          "真值 " + fixed(t.variance) + " (e⁻)²",
        ],
        [
          "方差 / 均值",
          m.electronMean > 0
            ? fixed(m.electronVariance / m.electronMean)
            : "无定义",
          "零均值时不报告比值",
        ],
      ]
        .map(
          ([a, b, c]) =>
            `<div><small>${a}</small><strong>${b}</strong><em>${c}</em></div>`,
        )
        .join("");
      root.querySelector("[data-reading]").textContent =
        `入射观测：均值 ${fixed(m.photonMean)}，方差 ${fixed(m.photonVariance)}。电子方差的两个来源：筛选本身 ${fixed(t.conditionalVariance)}，入射数涨落传入 ${fixed(t.arrivingVariance)} (e⁻)²。${p.mode === "fixed" ? "固定总数去掉了第二项，电子计数为二项分布。" : "两项相加仍为ημ；QE降低没有把Poisson涨落变成固定计数。"}`;
      root.querySelector("[data-truth]").textContent =
        `独立真值对照：条件期望/全方差给出均值 ${fixed(t.mean)}、方差 ${fixed(t.variance)}；逐项求和精确PMF得到 ${data.pmfMean.toFixed(9)}、${data.pmfVariance.toFixed(9)}。Poisson分布用递推，二项分布用Bernoulli卷积；观测统计只读取事件计数。`;
      for (const b of root.querySelectorAll(".actions button"))
        if (["Poisson入射", "固定入射数"].includes(b.textContent))
          b.setAttribute(
            "aria-pressed",
            String((b.textContent === "固定入射数") === (p.mode === "fixed")),
          );
    },
    setup: ({ root, state, render }) =>
      replay({
        root,
        state,
        render,
        element,
        signal,
        key: "progress",
        label: "回放一次曝光",
        durationMs: 7000,
      }),
  });
}
