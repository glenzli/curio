import { experiment } from "../common/ui.js";
import { WIDTH, HEIGHT, FULL_WELL, READ_NOISE, CAMERA_SHIFT, SHADOW_RATE,
  exposurePlan, shadowSNR, capture, sampleRate, fuseImage } from "./model.js";

const format = (x, digits = 2) => x.toLocaleString("zh-CN", { maximumFractionDigits: digits });
const tone = rate => Math.min(1, Math.log1p(Math.max(0, rate) / SHADOW_RATE) / Math.log1p(5e5 / SHADOW_RATE)) ** (1 / 2.2);

function draw(canvas, values, valid, kind, probe) {
  const context = canvas.getContext("2d"), image = context.createImageData(WIDTH, HEIGHT);
  for (let i = 0; i < values.length; i++) {
    const x = i % WIDTH, y = Math.floor(i / WIDTH);
    const missing = kind === "fused" && !valid[i];
    const grey = Math.round(255 * (kind === "raw" ? Math.max(0, values[i] / FULL_WELL) ** (1 / 2.2) : tone(values[i])));
    const pixel = missing ? ((x + y) % 6 < 3 ? [155, 76, 110] : [234, 196, 212]) : [grey, grey, grey];
    image.data.set([...pixel, 255], 4 * i);
  }
  context.putImageData(image, 0, 0);
  context.strokeStyle = "#b98447"; context.lineWidth = .8;
  context.beginPath(); context.moveTo(probe + .5, 0); context.lineTo(probe + .5, HEIGHT); context.stroke();
  context.strokeRect(probe - 1.5, HEIGHT / 2 - 1.5, 3, 3);
}

function weightStrip(canvas, result) {
  const context = canvas.getContext("2d"), image = context.createImageData(WIDTH, 8);
  for (let y = 0; y < 8; y++) for (let x = 0; x < WIDTH; x++) {
    const i = Math.floor(HEIGHT / 2) * WIDTH + x, weight = result.weights[i];
    const color = result.valid[i] ? [185 - 122 * weight, 132 + 7 * weight, 71 + 81 * weight] : [155, 76, 110];
    image.data.set([...color, 255], (y * WIDTH + x) * 4);
  }
  context.putImageData(image, 0, 0);
}

export function mount({ element, signal }) {
  let cachedKey, frames;
  return experiment({
    element, signal, kicker: "HDR · 配准与融合", title: "长短曝光、错位与鬼影",
    intro: "左下直接融合两帧，右下按背景位移对齐后融合。移动主体与背景的位移不同；打开去鬼影，会在不一致的区域退回短曝光。",
    controls: [
      { key: "timeMs", label: "曝光时间设置", min: 4, max: 32, step: 1, value: 16, format: x => `${x} ms` },
      { key: "stops", label: "长短曝光比", min: 0, max: 5, step: 1, value: 4, format: x => `${2 ** x}∶1（${x} 档）` },
      { key: "movement", label: "主体在两帧间的位移", min: 0, max: 24, step: 1, value: 12, format: x => `${x} px` },
      { key: "residual", label: "背景配准残差", min: -3, max: 3, step: .25, value: 0, format: x => `${x > 0 ? "+" : ""}${x} px` },
      { key: "probe", label: "探针横坐标（中间行）", min: 0, max: WIDTH - 1, step: 1, value: 54, format: x => `${x} px` },
    ],
    presets: [
      { label: "静止场景", values: { movement: 0, residual: 0 } },
      { label: "移动主体", values: { movement: 12, residual: 0, deghost: false } },
    ],
    content: `<style>.hdr-images{display:grid;grid-template-columns:1fr 1fr;gap:18px 14px;margin:20px 0}.hdr-images figure{margin:0;min-width:0}.hdr-images figcaption{font-size:11px;margin-bottom:6px}.hdr-images canvas{display:block;width:100%;height:auto;image-rendering:pixelated;border-radius:4px}.hdr-images small{font-size:10px;opacity:.65}.hdr-weights{display:block;width:100%;height:14px;margin:6px 0}.hdr-options{display:flex;flex-wrap:wrap;gap:7px;margin:12px 0}.hdr-options [aria-pressed=true]{background:#9caea222;border-color:currentColor}.hdr-probe{font-size:11px;font-variant-numeric:tabular-nums}@media(max-width:550px){.hdr-images{grid-template-columns:1fr}.stats strong{font-size:16px}}</style><p class="reading" data-times></p><div class="hdr-options" data-options></div><div class="hdr-images"><figure><figcaption>短曝光 · 电子读数</figcaption><canvas width="144" height="72" data-short role="img" aria-label="短曝光的合成场景电子读数"></canvas><small>与长曝光使用相同电子白点</small></figure><figure><figcaption>长曝光 · 电子读数</figcaption><canvas width="144" height="72" data-long role="img" aria-label="长曝光的合成场景电子读数"></canvas><small>窗口中的白块可能已经饱和</small></figure><figure><figcaption>直接融合 · 电子率尺度</figcaption><canvas width="144" height="72" data-plain role="img" aria-label="未配准的曝光归一化融合"></canvas><small>除以各自曝光时间后再加权</small></figure><figure><figcaption data-result-title>背景配准后融合</figcaption><canvas width="144" height="72" data-aligned role="img" aria-label="背景配准并可选择去鬼影的融合"></canvas><small>与左图使用相同的显示变换</small></figure></div><div class="stats"><div><small>静态阴影 SNR · 短 / 长</small><strong data-snr></strong><em>电子率 2,000 e⁻/s</em></div><div><small>两帧融合 / 一次总时长曝光</small><strong data-budget></strong><em>理想静态未饱和阴影的 SNR</em></div><div><small>右图无有效观测</small><strong data-missing></strong><em>紫色斜纹标记，不能补回高光</em></div></div><p class="hdr-probe" data-probe aria-live="polite"></p><p class="reading">中间行的长曝光权重：棕色 0 → 蓝色 1；紫色为无有效观测。</p><canvas class="hdr-weights" width="144" height="8" data-weights role="img" aria-label="融合结果中间行的长曝光权重"></canvas><p class="reading" data-rejections></p>`,
    note: `合成单色场景，满阱 ${FULL_WELL} e⁻、读噪 ${READ_NOISE} e⁻；长帧的背景相对短帧平移 ${CAMERA_SHIFT} px，界面直接使用已知位移，未运行光流估计。噪声开启时独立采样 Poisson 电子数与 Gaussian 读噪，固定种子可重复。方差由已知场景率计算，是教学中的理想权重；真实算法须估计它。亚像素配准用线性插值，方差包含插值权重的平方，跨输出像素的相关性不用于本例的单点融合。去鬼影以两帧差超过 3 倍合成标准差为条件，退回短帧；这会受噪声与阈值影响，不保证无偏。画面忽略单次曝光内的运动模糊和滚动快门。电子率图用同一对数压缩与 Gamma 2.2 显示；它不改变捕获范围。`,
    update(root, state) {
      const plan = exposurePlan(state.timeMs, state.stops, state.fixedTotal);
      const key = JSON.stringify([plan.short, plan.long, state.movement, !!state.noise, state.seed ?? 1]);
      if (key !== cachedKey) {
        frames = {
          short: capture({ exposure: plan.short, noise: state.noise, seed: state.seed ?? 1 }),
          long: capture({ exposure: plan.long, shift: CAMERA_SHIFT, movement: state.movement, noise: state.noise, seed: (state.seed ?? 1) + 100003 }),
        };
        cachedKey = key;
      }
      const offset = CAMERA_SHIFT + state.residual;
      const plain = fuseImage(frames.short, frames.long, 0), aligned = fuseImage(frames.short, frames.long, offset, state.deghost);
      draw(root.querySelector("[data-short]"), frames.short.values, frames.short.valid, "raw", state.probe);
      draw(root.querySelector("[data-long]"), frames.long.values, frames.long.valid, "raw", state.probe + offset);
      draw(root.querySelector("[data-plain]"), plain.values, plain.valid, "fused", state.probe);
      draw(root.querySelector("[data-aligned]"), aligned.values, aligned.valid, "fused", state.probe);
      weightStrip(root.querySelector("[data-weights]"), aligned);
      const snr = shadowSNR(plan);
      root.querySelector("[data-times]").textContent = `${state.fixedTotal ? "固定总曝光" : "固定长曝光"} ${state.timeMs} ms：短帧 ${format(plan.short * 1000, 3)} ms，长帧 ${format(plan.long * 1000, 3)} ms，总积分 ${format(plan.total * 1000, 3)} ms。${state.noise ? "已加入采样噪声。" : "当前显示期望值，未叠加随机噪声。"}`;
      root.querySelector("[data-result-title]").textContent = state.deghost ? "背景配准 + 短帧去鬼影" : "背景配准后融合";
      root.querySelector("[data-snr]").textContent = `${format(snr.short)} / ${format(snr.long)}`;
      root.querySelector("[data-budget]").textContent = `${format(snr.fused)} / ${format(snr.single)}`;
      root.querySelector("[data-missing]").textContent = `${format(100 * aligned.missing / (WIDTH * HEIGHT))}%`;
      const y = Math.floor(HEIGHT / 2), i = y * WIDTH + state.probe;
      const a = sampleRate(frames.short, state.probe, y), b = sampleRate(frames.long, state.probe + offset, y);
      root.querySelector("[data-probe]").textContent = `探针 (${state.probe}, ${y})：短帧 ${a ? format(a.value, 0) + " e⁻/s" : "无有效观测"}；长帧 ${b ? format(b.value, 0) + " e⁻/s" : "饱和或超出画面"}；融合 ${aligned.valid[i] ? format(aligned.values[i], 0) + " e⁻/s，长帧权重 " + format(aligned.weights[i]) : "无有效观测"}。`;
      root.querySelector("[data-rejections]").textContent = state.deghost ? `右图有 ${aligned.rejectionCount} 个像素退回短帧。移动边缘因此保留短帧时刻，也放弃这些位置的长曝光降噪收益。` : "背景对齐以后，主体仍可能有两处轮廓。去鬼影需要处理局部的时刻差异。";
      for (const button of root.querySelectorAll("[data-option]")) {
        const on = !!state[button.dataset.option];
        button.setAttribute("aria-pressed", String(on));
        button.textContent = `${button.dataset.label}：${on ? "开" : "关"}`;
      }
    },
    setup({ root, state, render }) {
      for (const [key, label] of [["deghost", "去鬼影"], ["noise", "采样噪声"], ["fixedTotal", "固定总曝光"]]) {
        const button = document.createElement("button");
        button.dataset.option = key; button.dataset.label = label;
        button.addEventListener("click", () => { state[key] = !state[key]; render(); }, { signal });
        root.querySelector("[data-options]").append(button);
      }
      const resample = document.createElement("button"); resample.textContent = "重新采样";
      resample.addEventListener("click", () => { state.noise = true; state.seed = (state.seed ?? 1) + 1; render(); }, { signal });
      root.querySelector("[data-options]").append(resample);
      render();
    },
  });
}
