import { experiment, plot } from "../common/ui.js";
import {
  WIDTH,
  HEIGHT,
  FULL_WELL,
  READ_NOISE,
  CAMERA_SHIFT,
  SHADOW_RATE,
  exposurePlan,
  shadowSNR,
  capture,
  sampleRate,
  fuseImage,
} from "./model.js";

import { estimateTranslation } from "./registration.js";

const format = (x, digits = 2) =>
  (Math.abs(x) < 0.5 * 10 ** -digits ? 0 : x).toLocaleString("zh-CN", {
    maximumFractionDigits: digits,
  });
const tone = (rate) =>
  Math.min(
    1,
    Math.log1p(Math.max(0, rate) / SHADOW_RATE) / Math.log1p(5e5 / SHADOW_RATE),
  ) **
  (1 / 2.2);

function draw(canvas, values, valid, kind, probe, box = null) {
  const context = canvas.getContext("2d"),
    image = context.createImageData(WIDTH, HEIGHT);
  for (let i = 0; i < values.length; i++) {
    const x = i % WIDTH,
      y = Math.floor(i / WIDTH);
    const missing = kind === "fused" && !valid[i];
    const grey = Math.round(
      255 *
        (kind === "raw"
          ? Math.max(0, values[i] / FULL_WELL) ** (1 / 2.2)
          : tone(values[i])),
    );
    const pixel = missing
      ? (x + y) % 6 < 3
        ? [155, 76, 110]
        : [234, 196, 212]
      : [grey, grey, grey];
    image.data.set([...pixel, 255], 4 * i);
  }
  context.putImageData(image, 0, 0);
  context.strokeStyle = "#b98447";
  context.lineWidth = 0.8;
  if (Number.isFinite(probe)) {
    context.beginPath();
    context.moveTo(probe + 0.5, 0);
    context.lineTo(probe + 0.5, HEIGHT);
    context.stroke();
    context.strokeRect(probe - 1.5, HEIGHT / 2 - 1.5, 3, 3);
  }
  if (box) {
    context.setLineDash([2, 1]);
    context.strokeRect(box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0);
    context.setLineDash([]);
  }
}

function weightStrip(canvas, result) {
  const context = canvas.getContext("2d"),
    image = context.createImageData(WIDTH, 8);
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < WIDTH; x++) {
      const i = Math.floor(HEIGHT / 2) * WIDTH + x,
        weight = result.weights[i];
      const color = result.valid[i]
        ? [185 - 122 * weight, 132 + 7 * weight, 71 + 81 * weight]
        : [155, 76, 110];
      image.data.set([...color, 255], (y * WIDTH + x) * 4);
    }
  context.putImageData(image, 0, 0);
}

export function mount({ element, signal, session }) {
  let cachedKey, frames, estimatedKey, registration;
  return experiment({
    element,
    signal,
    session,
    kicker: "HDR · 从观测估计位移",
    title: "两帧位移估计与 HDR 融合",
    intro:
      "从长短曝光的灰度变化搜索水平位移。下方并列显示未配准、按估计配准和按真值配准的融合；移动主体可能让整幅画面的估计失效。",
    controls: [
      {
        key: "timeMs",
        label: "曝光时间设置",
        min: 4,
        max: 32,
        step: 1,
        value: 16,
        format: (x) => `${x} ms`,
      },
      {
        key: "stops",
        label: "长短曝光比",
        min: 0,
        max: 5,
        step: 1,
        value: 4,
        format: (x) => `${2 ** x}∶1（${x} 档）`,
      },
      {
        key: "cameraShift",
        label: "生成时设定的背景位移",
        min: -6,
        max: 6,
        step: 1,
        value: CAMERA_SHIFT,
        format: (x) => `${format(x)} px`,
      },
      {
        key: "movement",
        label: "主体在两帧间的位移",
        min: 0,
        max: 24,
        step: 1,
        value: 12,
        format: (x) => `${x} px`,
      },
      {
        key: "search",
        label: "位移搜索半宽",
        min: 1,
        max: 8,
        step: 1,
        value: 8,
        format: (x) => `±${x} px`,
      },
      {
        key: "residual",
        label: "估计后额外加入的偏差",
        min: -3,
        max: 3,
        step: 0.25,
        value: 0,
        format: (x) => `${format(x)} px`,
      },
      {
        key: "probe",
        label: "探针横坐标（中间行）",
        min: 0,
        max: WIDTH - 1,
        step: 1,
        value: 54,
        format: (x) => `${x} px`,
      },
    ],
    presets: [
      {
        label: "静止场景",
        values: {
          movement: 0,
          cameraShift: 3,
          search: 8,
          residual: 0,
          uniform: false,
          wholeFrame: false,
          noise: false,
        },
      },
      {
        label: "移动主体",
        values: {
          movement: 12,
          cameraShift: 3,
          search: 8,
          residual: 0,
          uniform: false,
          wholeFrame: false,
        },
      },
      {
        label: "均匀场景",
        values: { uniform: true, noise: false, wholeFrame: false },
      },
      {
        label: "搜索范围不足",
        values: {
          cameraShift: 3,
          search: 1,
          uniform: false,
          noise: false,
          movement: 0,
          wholeFrame: false,
        },
      },
    ],
    content: `<style>
      .actions button,.hdr-options button{font-size:11px;padding:4px 8px}.hdr-images{display:grid;grid-template-columns:1fr 1fr;gap:16px 12px;margin:18px 0}.hdr-results{grid-template-columns:repeat(3,minmax(0,1fr))}.hdr-images figure{margin:0;min-width:0}.hdr-images figcaption{font-size:11px;margin-bottom:6px}.hdr-images canvas{display:block;width:100%;height:auto;image-rendering:pixelated;border-radius:4px}.hdr-images small{font-size:10px;opacity:.65}.hdr-images [hidden]{display:none}.hdr-empty{aspect-ratio:2;display:grid;place-content:center;border:1px dashed #9caea277;padding:12px;font-size:11px;text-align:center}.hdr-weights{display:block;width:100%;height:14px;margin:6px 0}.hdr-options{display:flex;flex-wrap:wrap;gap:7px;margin:12px 0}.hdr-options [aria-pressed=true]{background:#9caea222;border-color:currentColor}.hdr-probe,.hdr-registration{font-size:12px;font-variant-numeric:tabular-nums}.hdr-registration{border-left:2px solid #448b98;padding-left:12px}.hdr-registration[data-failed=true]{border-color:#b47b43}.hdr-truth{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;border-block:1px solid #9caea244;padding:12px 0;margin:18px 0}.hdr-truth small{display:block;font-size:10px;opacity:.65}.hdr-truth strong{display:block;font-size:20px;font-weight:500}.hdr-chart{max-width:680px}.hdr-chart text{font-size:12px}.hdr-result-heading{font-size:13px;margin:24px 0 8px}.hdr-score-note{font-size:11px}
      @media(max-width:650px){.hdr-images,.hdr-results{grid-template-columns:1fr}.hdr-truth strong{font-size:17px}.stats strong{font-size:15px}.stats{grid-template-columns:1fr}.stats>div{display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px 12px}.stats em{width:100%}}
    </style><p class="reading" data-times></p><div class="hdr-options" data-options></div><div class="hdr-truth" data-shifts></div><p class="hdr-registration" data-registration aria-live="polite"></p><div class="chart hdr-chart" data-score></div><p class="hdr-score-note">灰色标记为生成时设定的真值，只用于对照；青色标记为估计，棕色标记为未通过检查的候选。相关系数和峰间差是本例的筛选条件，不是统计置信度。</p><div class="hdr-images"><figure><figcaption>短曝光 · 电子读数</figcaption><canvas width="144" height="72" data-short role="img" aria-label="短曝光及位移估计使用的参考区域"></canvas><small>棕色虚框是用于估计的参考区域</small></figure><figure><figcaption>长曝光 · 电子读数</figcaption><canvas width="144" height="72" data-long role="img" aria-label="长曝光及按估计位移对应的区域"></canvas><small>估计可用时，虚框按估计位移平移</small></figure></div><h4 class="hdr-result-heading">同一曝光尺度、同一显示变换</h4><div class="hdr-images hdr-results"><figure><figcaption>未配准</figcaption><canvas width="144" height="72" data-plain role="img" aria-label="未配准的曝光归一化融合"></canvas></figure><figure><figcaption data-result-title>按估计配准</figcaption><canvas width="144" height="72" data-aligned role="img" aria-label="按观测估计位移的融合"></canvas><div class="hdr-empty" data-empty hidden>位移估计不可用<br>不生成这一配准结果</div></figure><figure><figcaption>按真值配准 · 对照</figcaption><canvas width="144" height="72" data-truth role="img" aria-label="按已知背景位移计算的融合基准"></canvas></figure></div><div class="stats"><div><small>静态阴影 SNR · 短 / 长</small><strong data-snr></strong><em>电子率 2,000 e⁻/s</em></div><div><small>两帧融合 / 一次总时长曝光</small><strong data-budget></strong><em>理想静态未饱和阴影的 SNR</em></div><div><small>估计配准图的无有效观测</small><strong data-missing></strong><em>紫色斜纹；估计失败另行标记</em></div></div><p class="hdr-probe" data-probe aria-live="polite"></p><p class="reading" data-weight-reading></p><canvas class="hdr-weights" width="144" height="8" data-weights role="img" aria-label="按估计位移融合后中间行的长曝光权重"></canvas><p class="reading" data-rejections></p>`,
    note: `合成单色场景，满阱 ${FULL_WELL} e⁻、读噪 ${READ_NOISE} e⁻，只估计全局水平平移。估计器只接收观测电子读数及曝光时间：按曝光归一化，取 log(1+E/1000) 的平滑水平梯度，在固定共同有效区域按列平均，再搜索 0.25 px 网格上的归一化相关峰。仅从观测排除达到白点 98% 的邻域；不读取场景函数、真位移、模拟有效标志或理想方差。峰在边界、相关系数低于 0.25、相距至少 1 px 的竞争峰差小于 0.005，或样本不足时不采用候选。这些阈值是教学约定。均匀场景把整幅画面设为同一电子率；噪声开启时独立采样 Poisson 计数与 Gaussian 读噪。融合仍用已知场景率计算理想方差，并保留模拟饱和标志；这部分与观测位移估计分开。线性插值方差使用权重平方，忽略跨输出像素的相关性。三个融合图使用同一去鬼影选项；差超过 3 倍合成标准差时退回短帧，此选择可能带偏。忽略曝光内运动、滚动快门与 CFA；显示变换不增加捕获范围。`,
    update(root, state) {
      const plan = exposurePlan(state.timeMs, state.stops, state.fixedTotal);
      const key = JSON.stringify([
        plan.short,
        plan.long,
        state.cameraShift,
        state.movement,
        !!state.noise,
        !!state.uniform,
        state.seed ?? 1,
      ]);
      if (key !== cachedKey) {
        frames = {
          short: capture({
            exposure: plan.short,
            noise: state.noise,
            uniform: state.uniform,
            seed: state.seed ?? 1,
          }),
          long: capture({
            exposure: plan.long,
            shift: state.cameraShift,
            movement: state.movement,
            noise: state.noise,
            uniform: state.uniform,
            seed: (state.seed ?? 1) + 100003,
          }),
        };
        cachedKey = key;
      }
      const ekey = key + ":" + state.search + ":" + !!state.wholeFrame;
      if (ekey !== estimatedKey) {
        registration = estimateTranslation(frames.short, frames.long, {
          maxShift: state.search,
          roi: state.wholeFrame ? "all" : "band",
        });
        estimatedKey = ekey;
      }
      const available = registration.offset !== null,
        offset = available ? registration.offset + state.residual : null;
      const plain = fuseImage(frames.short, frames.long, 0, state.deghost),
        truth = fuseImage(
          frames.short,
          frames.long,
          state.cameraShift,
          state.deghost,
        );
      const aligned = available
        ? fuseImage(frames.short, frames.long, offset, state.deghost)
        : null;
      draw(
        root.querySelector("[data-short]"),
        frames.short.values,
        frames.short.valid,
        "raw",
        state.probe,
        registration.box,
      );
      draw(
        root.querySelector("[data-long]"),
        frames.long.values,
        frames.long.valid,
        "raw",
        available ? state.probe + offset : null,
        available
          ? {
              ...registration.box,
              x0: registration.box.x0 + offset,
              x1: registration.box.x1 + offset,
            }
          : null,
      );
      draw(
        root.querySelector("[data-plain]"),
        plain.values,
        plain.valid,
        "fused",
        state.probe,
      );
      draw(
        root.querySelector("[data-truth]"),
        truth.values,
        truth.valid,
        "fused",
        state.probe,
      );
      root.querySelector("[data-aligned]").hidden = !available;
      root.querySelector("[data-empty]").hidden = available;
      if (aligned) {
        draw(
          root.querySelector("[data-aligned]"),
          aligned.values,
          aligned.valid,
          "fused",
          state.probe,
        );
        weightStrip(root.querySelector("[data-weights]"), aligned);
      } else
        root
          .querySelector("[data-weights]")
          .getContext("2d")
          .clearRect(0, 0, WIDTH, 8);
      root.querySelector("[data-shifts]").innerHTML = [
        ["设定真值", format(state.cameraShift) + " px"],
        [
          "观测估计",
          available ? format(registration.offset) + " px" : "不可用",
        ],
        [
          "估计 − 真值",
          available
            ? format(registration.offset - state.cameraShift) + " px"
            : "—",
        ],
      ]
        .map(
          ([name, value]) =>
            `<div><small>${name}</small><strong>${value}</strong></div>`,
        )
        .join("");
      const status = root.querySelector("[data-registration]");
      status.dataset.failed = String(!available);
      status.textContent = `${state.wholeFrame ? "整幅画面" : "上方条带"}：${registration.support} 个共同有效像素，按列平均为 ${registration.columns} 点。${available ? `相关峰 ${format(registration.score, 3)}；采用位移 ${format(offset)} px（估计值再加手动偏差）。` : registration.reason}${registration.score !== undefined && !available ? ` 最佳候选 ${format(registration.bestOffset)} px，相关系数 ${format(registration.score, 3)}。` : ""}`;
      const markers = [
        { value: state.cameraShift, label: "真值", color: "#8b8e91" },
      ];
      if (registration.bestOffset !== undefined)
        markers.push({
          value: registration.bestOffset,
          label: available ? "估计" : "候选",
          color: available ? "#448b98" : "#b47b43",
        });
      root.querySelector("[data-score]").innerHTML = plot({
        width: 420,
        curves: [
          {
            color: "#448b98",
            points: registration.curve
              .filter((p) => p.score !== null)
              .map((p) => [p.offset, p.score]),
          },
        ],
        xMin: -state.search,
        xMax: state.search,
        yMin: -1,
        yMax: 1,
        markers,
        xLabel: "候选水平位移 / px",
        yLabel: "梯度相关系数",
        title: "从观测搜索水平位移的相关曲线",
      });
      const snr = shadowSNR(plan);
      root.querySelector("[data-times]").textContent =
        `${state.fixedTotal ? "固定总曝光" : "固定长曝光"} ${state.timeMs} ms：短帧 ${format(plan.short * 1000, 3)} ms，长帧 ${format(plan.long * 1000, 3)} ms，总积分 ${format(plan.total * 1000, 3)} ms。${state.noise ? "已采样随机噪声。" : "当前使用期望信号，仍由图像估计位移。"}`;
      root.querySelector("[data-result-title]").textContent = available
        ? `按估计配准${state.residual ? " + 手动偏差" : ""}`
        : "估计不可用";
      root.querySelector("[data-snr]").textContent =
        `${format(snr.short)} / ${format(snr.long)}`;
      root.querySelector("[data-budget]").textContent =
        `${format(snr.fused)} / ${format(snr.single)}`;
      root.querySelector("[data-missing]").textContent = aligned
        ? `${format((100 * aligned.missing) / (WIDTH * HEIGHT))}%`
        : "未生成";
      const y = Math.floor(HEIGHT / 2),
        i = y * WIDTH + state.probe,
        a = sampleRate(frames.short, state.probe, y);
      root.querySelector("[data-probe]").textContent =
        `探针 (${state.probe}, ${y})：短帧 ${a ? format(a.value, 0) + " e⁻/s" : "无有效观测"}；估计配准融合 ${aligned ? (aligned.valid[i] ? format(aligned.values[i], 0) + " e⁻/s" : "无有效观测") : "未生成"}；真值配准融合 ${truth.valid[i] ? format(truth.values[i], 0) + " e⁻/s" : "无有效观测"}。`;
      root.querySelector("[data-weight-reading]").textContent = aligned
        ? "估计配准图中间行的长曝光权重：棕色 0 → 青色 1；紫色为无有效观测。"
        : "位移估计不可用，当前不显示估计配准图的融合权重。";
      root.querySelector("[data-rejections]").textContent = state.deghost
        ? `退回短帧的像素：估计配准图 ${aligned ? aligned.rejectionCount : "未生成"}，真值配准图 ${truth.rejectionCount}。`
        : "背景位移估计正确时，移动主体仍可能留下两处轮廓。去鬼影另行处理两帧的局部时刻差异。";
      for (const button of root.querySelectorAll("[data-option]")) {
        const on = !!state[button.dataset.option];
        button.setAttribute("aria-pressed", String(on));
        button.textContent = `${button.dataset.label}：${on ? "开" : "关"}`;
      }
    },
    setup({ root, state, render }) {
      for (const [key, label] of [
        ["wholeFrame", "改用整幅画面估计"],
        ["deghost", "去鬼影"],
        ["noise", "采样噪声"],
        ["fixedTotal", "固定总曝光"],
      ]) {
        const button = document.createElement("button");
        button.dataset.option = key;
        button.dataset.label = label;
        button.addEventListener(
          "click",
          () => {
            state[key] = !state[key];
            render();
          },
          { signal },
        );
        root.querySelector("[data-options]").append(button);
      }
      const resample = document.createElement("button");
      resample.textContent = "重新采样";
      resample.addEventListener(
        "click",
        () => {
          state.noise = true;
          state.seed = (state.seed ?? 1) + 1;
          render();
        },
        { signal },
      );
      root.querySelector("[data-options]").append(resample);
      render();
    },
  });
}
