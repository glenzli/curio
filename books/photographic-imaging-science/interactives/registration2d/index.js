import { experiment } from "../common/ui.js";
import { replay } from "../common/replay.js";
import {
  parameters,
  capturePair,
  estimateTranslation2D,
  resample,
  scoreAt,
  WIDTH,
  HEIGHT,
} from "./model.js";
import { correlationFigure } from "./figures.js";
const names = {
  texture: "有横纵纹理",
  flat: "均匀平面",
  stripes: "单向条纹",
  tiles: "重复格纹",
  occlusion: "下半部新增遮挡",
};
function draw(canvas, values, reference = null, points = null) {
  const ctx = canvas.getContext("2d"),
    image = ctx.createImageData(WIDTH, HEIGHT);
  for (let i = 0; i < values.length; i++) {
    const v = values[i],
      r = reference?.[i],
      gray = (x) => Math.round(255 * Math.max(0, Math.min(1, x))),
      valid = Number.isFinite(v);
    image.data[4 * i] = valid ? gray(reference ? r : v) : 139;
    image.data[4 * i + 1] = valid ? gray(v) : 112;
    image.data[4 * i + 2] = valid ? gray(v) : 149;
    image.data[4 * i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  if (points?.length) {
    const xs = points.map((p) => p.x),
      ys = points.map((p) => p.y);
    ctx.strokeStyle = "#f6c486";
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 1]);
    ctx.strokeRect(
      Math.min(...xs) - 1,
      Math.min(...ys) - 1,
      Math.max(...xs) - Math.min(...xs) + 2,
      Math.max(...ys) - Math.min(...ys) + 2,
    );
  }
}
export function mount({ element, signal, session }) {
  let cacheKey, frames, result, truth, truthScore;
  return experiment({
    element,
    signal,
    session,
    kicker: "第八章 · 二维平移",
    title: "从两幅观测估计横、纵位移",
    intro:
      "给定横纵位移生成两帧，再由相关峰估计位移。红色来自参考帧，青色来自重采样后的移动帧；两者相同时呈灰色。真值只用于右侧对照和误差读数。",
    controls: [
      {
        key: "dx",
        label: "生成位移 dx · 向右为正",
        min: -8,
        max: 8,
        step: 0.25,
        value: 2.5,
        format: (v) => v.toFixed(2) + " px",
      },
      {
        key: "dy",
        label: "生成位移 dy · 向下为正",
        min: -8,
        max: 8,
        step: 0.25,
        value: -1.75,
        format: (v) => v.toFixed(2) + " px",
      },
      {
        key: "noise",
        numeric: {
          toInput: (v) => 100 * v,
          fromInput: (v) => v / 100,
          step: "any",
          unit: "%相对灰度",
        },
        label: "观测噪声标准差",
        min: 0,
        max: 0.05,
        step: 0.005,
        value: 0,
        format: (v) => (v * 100).toFixed(1) + "% · 相对灰度",
      },
      {
        key: "progress",
        label: "配准位移的回放进度",
        hint: "估计可用时移动配准叠加图；相关面和误差读数对应完整配准。",
        min: 0,
        max: 100,
        step: 0.25,
        value: 100,
        format: (v) => v.toFixed(1) + "%",
      },
    ],
    presets: [
      {
        label: "二维纹理",
        values: {
          mode: "texture",
          roi: "all",
          dx: 2.5,
          dy: -1.75,
          noise: 0,
          progress: 100,
        },
      },
      {
        label: "只有单向条纹",
        values: {
          mode: "stripes",
          roi: "all",
          dx: 2,
          dy: -1,
          noise: 0,
          progress: 100,
        },
      },
      {
        label: "重复格纹",
        values: {
          mode: "tiles",
          roi: "all",
          dx: 2,
          dy: -1,
          noise: 0,
          progress: 100,
        },
      },
      {
        label: "均匀平面",
        values: { mode: "flat", roi: "all", noise: 0, progress: 100 },
      },
      {
        label: "移出搜索范围",
        values: {
          mode: "texture",
          roi: "all",
          dx: 8,
          dy: 0,
          noise: 0,
          progress: 100,
        },
      },
      {
        label: "下半部有遮挡",
        values: {
          mode: "occlusion",
          roi: "all",
          dx: 3,
          dy: -2,
          noise: 0,
          progress: 100,
        },
      },
      { label: "只取上方区域", values: { roi: "top", progress: 100 } },
      { label: "取整个共同区域", values: { roi: "all", progress: 100 } },
      {
        label: "重新采样噪声",
        values: (s) => ({ seed: ((s.seed ?? 20261018) + 1) >>> 0 }),
      },
      { label: "从未配准开始", values: { progress: 0 } },
    ],
    content:
      '<style>.actions button{font-size:11px;padding:4px 8px}.reg-images{display:grid;grid-template-columns:1fr 1fr;gap:14px}.reg-images figure{margin:0;min-width:0}.reg-images figcaption{font-size:11px;margin:6px 0}.reg-images canvas{display:block;width:100%;height:auto;image-rendering:pixelated;border-radius:4px}.reg-images [hidden]{display:none}.unavailable{aspect-ratio:9/7;display:grid;place-content:center;border:1px dashed #9caea277;padding:12px;font-size:12px;text-align:center}.reg-analysis{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;align-items:center}.reg-analysis .chart{width:100%;max-width:680px;margin:16px auto}.chart text{font-size:12px}.stats{grid-template-columns:1fr;gap:8px}.stats strong{font-size:18px;white-space:nowrap}.truth{font-size:11px;line-height:1.9;border:1px solid #9caea255;padding:12px;border-radius:6px}.status{font-size:12px;border-left:2px solid #40879a;padding-left:12px}.status[data-failed=true]{border-color:#bb7946}@media(max-width:650px){.reg-analysis{grid-template-columns:1fr}.stats{grid-template-columns:1fr 1fr}.stats strong{font-size:16px}}@media(max-width:400px){.stats{grid-template-columns:1fr}}</style><p class="reading" data-mode></p><div class="reg-images"><figure><figcaption>参考帧 · 虚框为共同取样区域</figcaption><canvas width="72" height="56" data-reference role="img" aria-label="二维配准参考观测"></canvas></figure><figure><figcaption>移动帧 · 生成时向右/向下平移</figcaption><canvas width="72" height="56" data-moving role="img" aria-label="二维配准移动观测"></canvas></figure><figure><figcaption data-warp-label>采用估计位移 · 红/青叠加</figcaption><canvas width="72" height="56" data-estimate role="img" aria-label="按估计二维位移配准的观测叠加"></canvas><div class="unavailable" data-empty hidden>估计未通过检查<br>不生成配准结果</div></figure><figure><figcaption>按已知真值配准 · 红/青叠加</figcaption><canvas width="72" height="56" data-oracle role="img" aria-label="按生成真值二维位移配准的观测叠加"></canvas></figure></div><div class="reg-analysis"><div class="chart" data-surface></div><div class="stats"></div></div><p class="status reading" data-status aria-live="polite"></p><p class="reading">相关面：浅黄色十字为生成真值；小圆为观测的最佳候选，采用时为浅蓝色，拒绝时为橙色。搜索范围外的真值不画在面内。相关系数与峰间差不是置信度。</p><p class="truth" data-truth></p>',
    note: "72×56的相对线性灰度，未裁切；独立加性Gaussian观测噪声，固定种子。无CFA、Poisson噪声、曝光合成、旋转、尺度变化或滚动快门。移动帧M(x,y)=F(x−dx,y−dy)+噪声；匹配R(x,y)与双线性取样M(x+sx,y+sy)，因此估计的对应偏移与生成位移同号，显示校正向相反方向。候选sx、sy均为−6到6 px，间隔0.25 px；所有候选使用同一组观测有效点，每隔2 px取样，缺失像素按整个搜索邻域排除。相关峰不足0.85、相距至少1.5 px的竞争峰差不足0.012，或唯一最佳峰位于边界，均拒绝；这些是教学筛选阈值，不是置信区间或普适可靠性保证。分数面和读数为最终搜索结果，回放只演示采用位移的重采样。紫色为超出画面的区域；真值配准仍有噪声、插值误差及遮挡，不能保证图像相同。",
    update(root, s) {
      const p = parameters(s);
      Object.assign(s, { mode: p.mode, roi: p.roi, seed: p.seed });
      const key = JSON.stringify([p.dx, p.dy, p.noise, p.seed, p.mode, p.roi]);
      if (key !== cacheKey) {
        frames = capturePair(p);
        result = estimateTranslation2D(frames.reference, frames.moving, {
          roi: p.roi,
        });
        truth = resample(frames.moving, p.dx, p.dy);
        truthScore = scoreAt(frames.moving, result.points, p.dx, p.dy);
        cacheKey = key;
        draw(
          root.querySelector("[data-reference]"),
          frames.reference,
          null,
          result.points,
        );
        draw(root.querySelector("[data-moving]"), frames.moving);
        draw(root.querySelector("[data-oracle]"), truth, frames.reference);
        root.querySelector("[data-surface]").innerHTML = correlationFigure(
          result,
          p,
        );
      }
      const offset = result.offset,
        aligned = root.querySelector("[data-estimate]");
      root.querySelector('[data-control-key="progress"]').disabled = !offset;
      aligned.hidden = !offset;
      root.querySelector("[data-empty]").hidden = !!offset;
      if (offset)
        draw(
          aligned,
          resample(
            frames.moving,
            (offset.dx * p.progress) / 100,
            (offset.dy * p.progress) / 100,
          ),
          frames.reference,
        );
      root.querySelector("[data-warp-label]").textContent = offset
        ? "采用估计位移 · 当前回放 " + p.progress.toFixed(1) + "%"
        : "估计不可用 · 保留真值对照";
      root.querySelector("[data-mode]").textContent =
        names[p.mode] +
        "；" +
        (p.roi === "top" ? "上方区域" : "整个共同区域") +
        "，" +
        result.points.length +
        "个固定观测点；噪声种子 " +
        p.seed +
        "。";
      const error = offset
        ? Math.hypot(offset.dx - p.dx, offset.dy - p.dy)
        : null;
      root.querySelector(".stats").innerHTML = [
        [
          "生成真值 (dx, dy)",
          `(${p.dx.toFixed(2)}, ${p.dy.toFixed(2)}) px`,
          "仅用于生成、真值图及误差核对",
        ],
        [
          "采用估计 (sx, sy)",
          offset
            ? `(${offset.dx.toFixed(2)}, ${offset.dy.toFixed(2)}) px`
            : "未采用",
          result.best
            ? "最佳相关 " + result.best.score.toFixed(5)
            : "无可用相关峰",
        ],
        [
          "位移误差长度",
          error === null ? "—" : error.toFixed(4) + " px",
          "相对已知真值的欧氏距离",
        ],
        [
          "观测RMSE · 估计 / 真值",
          `${offset ? result.best.rmse.toFixed(5) : "—"} / ${truthScore.rmse === null ? "—" : truthScore.rmse.toFixed(5)}`,
          "相同共同点、相对线性灰度",
        ],
      ]
        .map(
          ([a, b, c]) =>
            `<div><small>${a}</small><strong>${b}</strong><em>${c}</em></div>`,
        )
        .join("");
      const status = root.querySelector("[data-status]");
      status.dataset.failed = String(!offset);
      status.textContent =
        result.reason +
        (result.best
          ? `；最佳候选(${result.best.dx.toFixed(2)}, ${result.best.dy.toFixed(2)}) px，峰间差 ${result.gap.toFixed(5)}。`
          : "。");
      root.querySelector("[data-truth]").textContent =
        "真值对照分开计算：搜索仅收到两幅观测数组与取样规则，不接收生成位移或场景函数。右下图用已知(dx,dy)对同一移动观测作双线性取样；若位移为整数且无噪声、无遮挡，共同区域应与参考逐点相同。亚像素位移会留下插值误差，0.25 px搜索间隔不等于0.25 px实测精度。遮挡无法由一个平移消除；上方区域只在它仍未被遮挡时可用。";
      root.querySelector(".lab").dataset.registrationStatus = result.status;
    },
    setup: ({ root, state, render }) =>
      replay({
        root,
        state,
        render,
        element,
        signal,
        key: "progress",
        label: "回放配准位移",
        durationMs: 6000,
      }),
  });
}
