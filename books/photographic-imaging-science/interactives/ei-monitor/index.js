import { migrateStageProgress, experiment } from "../common/ui.js";
import { replay } from "../common/replay.js";
import { eiBudget } from "./model.js";
import {
  monitorFigure,
  allocationFigure,
  patchesFigure,
  markerData,
} from "./figures.js";
export function mount({ element, signal, session }) {
  let key, m;
  return experiment({
    version: 2,
    migrate: (saved) => migrateStageProgress(saved, 20, 4),
    element,
    signal,
    session,
    kicker: "第五、九章 · EI与监看链",
    title: "EI、实际曝光与监看分别在哪一步起作用",
    intro:
      "先固定传感器和模拟读出，再决定是否按EI改变曝光、是否把EI增益放进编码。沿一个场景探针跟踪电子、RAW、Log和监看码，分别标出传感器、文件和显示的白点。",
    controls: [
      {
        key: "eiStops",
        label: "相对EI 800的变化",
        min: -2,
        max: 3,
        step: 0.25,
        value: 0,
        format: (v) => v.toFixed(2) + " stop · EI " + (800 * 2 ** v).toFixed(0),
      },
      {
        key: "exposure",
        label: "额外实际曝光补偿",
        min: -2,
        max: 2,
        step: 0.25,
        value: 0,
        format: (v) => v.toFixed(2) + " stop",
      },
      {
        key: "probe",
        label: "场景探针相对中灰",
        min: -6,
        max: 8,
        step: 0.25,
        value: 4,
        format: (v) => v.toFixed(2) + " stop",
      },
      {
        key: "bits",
        label: "教学Log文件位深",
        min: 8,
        max: 12,
        step: 1,
        value: 12,
        format: (v) => v + " bit",
      },
      {
        key: "progress",
        label: "查看处理环节",
        min: 0,
        max: 4,
        step: 1,
        value: 4,
        discrete: true,
        format: (v) =>
          ["收集电子", "线性RAW", "Log文件", "反解与增益", "监看码"][
            Math.min(4, Math.floor(v))
          ],
      },
    ],
    presets: [
      {
        label: "EI 800基准",
        values: {
          eiStops: 0,
          exposure: 0,
          policy: "fixed",
          recording: "fixed",
          probe: 4,
          progress: 4,
        },
      },
      {
        label: "EI 1600 · 只改监看",
        values: {
          eiStops: 1,
          exposure: 0,
          policy: "fixed",
          recording: "fixed",
          progress: 4,
        },
      },
      {
        label: "EI 1600 · 按表少曝",
        values: {
          eiStops: 1,
          exposure: 0,
          policy: "metered",
          recording: "fixed",
          progress: 4,
        },
      },
      {
        label: "EI 6400 · 固定记录链",
        values: {
          eiStops: 3,
          exposure: 0,
          policy: "metered",
          recording: "fixed",
          probe: 6,
          progress: 4,
        },
      },
      {
        label: "EI 6400 · 编码前增益",
        values: {
          eiStops: 3,
          exposure: 0,
          policy: "metered",
          recording: "ei-gain",
          probe: 6,
          progress: 4,
        },
      },
      {
        label: "高光仍在RAW",
        values: {
          eiStops: 0,
          exposure: 0,
          policy: "fixed",
          recording: "fixed",
          probe: 4,
          progress: 4,
        },
      },
      {
        label: "传感器已剪切",
        values: {
          eiStops: 0,
          exposure: 0,
          policy: "fixed",
          recording: "fixed",
          probe: 7,
          progress: 4,
        },
      },
      { label: "从输入开始", values: { progress: 0 } },
    ],
    content:
      '<style>.actions button{font-size:11px;padding:4px 8px}.ei-chain{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,125px),1fr));gap:8px}.ei-step{border:1px solid var(--line,#aaa);border-radius:6px;padding:10px;font-size:11px;min-width:0;overflow-wrap:anywhere}.ei-step[data-active=true]{outline:1px solid currentColor}.ei-step strong{display:block;font-size:16px;font-variant-numeric:tabular-nums}.ei-step small{font-size:10px}.ei-step em{display:block;font-size:10px;font-style:normal}.ei-svg svg{width:100%;height:auto}.ei-svg text{fill:currentColor}.chart text{font-size:13px}.truth{font-size:11px;line-height:1.9;border:1px solid var(--line,#aaa);padding:12px;border-radius:6px}.stats strong{font-size:20px}@media(max-width:650px){.ei-chain{grid-template-columns:1fr 1fr}.stats{grid-template-columns:1fr}.chart text{font-size:21px}.ei-svg text{font-size:21px}}</style><p class="reading" data-mode></p><div class="ei-chain"></div><p class="reading" data-stage-explanation></p><p class="reading" data-flags aria-live="polite"></p><div class="ei-svg" data-allocation></div><div class="stats"></div><div class="chart" data-monitor></div><div class="legend" data-markers></div><div class="ei-svg" data-patches></div><p class="reading" data-reading></p><p class="truth" data-truth></p>',
    note: "固定传感器模式：线性满阱32000 e⁻，输入等效读噪4 e⁻ RMS；EI 800基准曝光下中灰1000 e⁻。EI倍率g=2^(相对EI档位)；固定曝光策略保持曝光，按表策略使曝光乘1/g，另乘额外实际曝光补偿。14 bit线性RAW按满阱比例四舍五入，未模拟黑电平与噪声观测。Log采用第9章给定的分段函数。固定记录链在解码后给监看乘g；编码前增益模式在Log前乘g，解码后不再重复加EI。两种路径在无截顶、无量化时给出相同监看，但文件上限可以不同。教学显示用clamp(0.18·解码电子参考值/1000,0,1)^(1/2.2)，没有色调肩部；监看白不等于RAW或传感器白。光子/读噪SNR仅对未饱和均值按μ/sqrt(μ+16)报告，未加ADC/Log量化噪声。总范围log2(32000/4)按容量/读噪工程比计算；含散粒噪声的SNR=1下端另按第四章求解。档位上限为连续标称边界；有限ADC和文件码区间会提前舍入为白码，另保留逐码反解。回放只突出链中步骤，不改变曝光或数据。",
    update(root, s) {
      const p = eiBudget(s);
      s.policy = p.policy;
      s.recording = p.recording;
      const k = JSON.stringify([
        s.eiStops,
        s.exposure,
        s.probe,
        s.bits,
        s.policy,
        s.recording,
      ]);
      if (k !== key) {
        m = p;
        root.querySelector("[data-allocation]").innerHTML = allocationFigure(m);
        root.querySelector("[data-monitor]").innerHTML = monitorFigure(m);
        root.querySelector("[data-markers]").innerHTML =
          '<span><i style="border-color:#40879a"></i>有限位深</span><span><i style="border-color:#bb7946;border-top-style:dashed"></i>无量化对照</span>' +
          markerData(m)
            .map(
              (d) =>
                `<span><i style="border-color:${d.color};border-top-style:dashed"></i>${d.label} ${d.value.toFixed(3)} stop</span>`,
            )
            .join("");
        root.querySelector("[data-patches]").innerHTML = patchesFigure(m);
        key = k;
      }
      const q = m.probeResult,
        step = Math.min(4, Math.floor(s.progress));
      root.querySelector("[data-mode]").textContent =
        `EI ${m.ei.toFixed(0)}；${m.policy === "metered" ? "按EI测光，实际曝光随之减少" : "固定实际曝光，只改变EI映射"}；实际曝光为基准的${m.exposureRatio.toFixed(4)}倍。${m.recording === "fixed" ? "固定Log记录，EI用于解码后的监看。" : "Log编码前加入EI增益，监看不重复乘。"}`;
      root.querySelector(".ei-chain").innerHTML = [
        ["收集电子均值", q.mu.toFixed(2) + " e⁻", "传感器容量32000 e⁻"],
        [
          "线性RAW",
          q.rawCode + " DN",
          "14 bit，捕获值" + q.captured.toFixed(2) + " e⁻",
        ],
        [
          "教学Log文件",
          q.logCode + " DN",
          m.bits + " bit，编码前增益" + q.recordGain.toFixed(3),
        ],
        [
          "反解与监看增益",
          (q.decoded * 32000).toFixed(2) + " e_ref",
          "解码后增益" + q.monitorGain.toFixed(3),
        ],
        [
          "教学监看码",
          q.display.toFixed(5),
          "显示输入" + q.monitorLinear.toFixed(4),
        ],
      ]
        .map(
          ([a, b, c], i) =>
            `<section class="ei-step" data-active="${i === step}"><small>${a}</small><strong>${b}</strong><em>${c}</em></section>`,
        )
        .join("");
      root.querySelector("[data-stage-explanation]").textContent = [
        `① 先按实际曝光收集电子：这个场景探针的均值为${q.mu.toFixed(2)} e⁻。EI怎样影响收光，由上方曝光规则决定。`,
        `② 捕获值先受32000 e⁻满阱限制，再量化为14-bit RAW：当前${q.rawCode} DN。后面的监看设置不改变这个码。`,
        `③ RAW之后、Log之前的数字增益为${q.recordGain.toFixed(3)}×，随后记录为${m.bits}-bit Log中的${q.logCode} DN。`,
        `④ 先反解文件码，得到${(q.decoded * 32000).toFixed(2)} e_ref，再施加${q.monitorGain.toFixed(3)}×监看增益。`,
        `⑤ 线性显示输入为${q.monitorLinear.toFixed(5)}，经教学显示映射得到${q.display.toFixed(5)}。显示变白与前面的捕获裁切分别查看。`,
      ][step];
      root.querySelector("[data-flags]").textContent =
        `探针：传感器${q.sensorClipped ? "已达白点" : "未饱和"}，文件${q.recordClipped ? "编码输入已截顶" : q.fileWhite ? "已舍入为白码" : "未到容器白码"}，监看${q.monitorClipped ? "已到显示白" : "未到显示白"}。${q.sensorClipped ? "探针已饱和，不报告其线性SNR。" : "探针输入端SNR " + q.snr.toFixed(3) + "。"}`;
      root.querySelector(".stats").innerHTML = [
        [
          "中灰上方物理余量",
          m.headroom.toFixed(3) + " stop",
          "中灰下方 " + m.shadow.toFixed(3) + " stop",
        ],
        [
          "文件的标称余量",
          m.fileHeadroom.toFixed(3) + " stop",
          "当前标称电子上限 " + m.fileLimit.toFixed(1) + " e⁻",
        ],
        [
          "中灰输入端SNR",
          m.gray.snr.toFixed(3),
          "中灰 " + m.gray.mu.toFixed(2) + " e⁻",
        ],
      ]
        .map(
          ([a, b, c]) =>
            `<div><small>${a}</small><strong>${b}</strong><em>${c}</em></div>`,
        )
        .join("");
      root.querySelector("[data-reading]").textContent =
        `同链无量化监看码${q.idealDisplay.toFixed(6)}，实际${q.display.toFixed(6)}；保留同样截顶，只比较量化差。探针文件码反解区间[${q.codeBin.map((v) => v.toFixed(8)).join(", ")}]，单位为Log输入的归一化线性信号；该区间不恢复任何先前截顶。`;
      root.querySelector("[data-truth]").textContent =
        `独立档位真值：中灰${m.truth.gray.toFixed(3)} e⁻，物理高光${m.truth.physicalHeadroom.toFixed(6)} stop，阴影${m.truth.shadow.toFixed(6)} stop，合计${m.truth.total.toFixed(6)} stop；与链中高光读数差${(m.headroom - m.truth.physicalHeadroom).toExponential(2)} stop。未量化、未发生中灰截顶时，中灰监看线性值应为${m.truth.grayIdealMonitor.toFixed(6)}。文件余量真值${m.truth.fileHeadroom.toFixed(6)} stop；物理容量不因文件上限改变。`;
    },
    setup: ({ root, state, render }) =>
      replay({
        root,
        state,
        render,
        element,
        signal,
        key: "progress",
        end: 4,
        label: "逐步展开EI监看链",
        durationMs: 9000,
      }),
  });
}
