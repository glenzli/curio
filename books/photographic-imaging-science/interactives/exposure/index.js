import { experiment } from "../common/ui.js";
import { replay } from "../common/replay.js";
import { exposureBudget, exposureTruth, equalExposureTime } from "./model.js";
const reference = exposureBudget();
const parameters = (s) => ({
  fNumber: 2 ** s.apertureEV,
  exposureMs: s.exposureMs,
  transmission: s.transmission,
  magnification: s.magnification,
  velocity: s.velocity,
  progress: s.progress,
});
const format = (x) => x.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
function panel(m, label, progress, scale, motionScale) {
  const elapsed = (m.p.exposureMs * progress) / 100,
    travel = (m.motionPixels * progress) / 100;
  return `<div class="exposure-panel"><h4>${label}</h4><p>f/${m.p.fNumber.toFixed(2)} · ${m.p.exposureMs.toFixed(3)} ms · T=${m.p.transmission.toFixed(2)}</p><svg role="img" aria-label="${label}的曝光积累和点目标轨迹" viewBox="0 0 430 156"><text x="16" y="17">均匀背景：累积光子</text><rect x="16" y="30" width="${(360 * m.photons) / scale}" height="22" fill="#448b98" opacity=".15"/><rect x="16" y="30" width="${(360 * m.photons * progress) / 100 / scale}" height="22" fill="#448b98" opacity=".7"/><text x="16" y="78">移动点：按时间积分的轨迹</text><path d="M16 108H${16 + m.motionPixels * motionScale}" stroke="#b47b43" opacity=".2" stroke-width="13"/><path d="M16 108H${16 + travel * motionScale}" stroke="#b47b43" opacity=".7" stroke-width="13"/><circle cx="${16 + travel * motionScale}" cy="108" r="4" fill="#b47b43"/><text x="16" y="146">${elapsed.toFixed(3)} ms / ${m.p.exposureMs.toFixed(3)} ms；轨迹 ${travel.toFixed(3)} px</text></svg><p>结束时 ${format(m.photons)} 个平均光子<br>完整运动区间 ${m.motionPixels.toFixed(3)} px</p></div>`;
}
export function mount({ element, signal }) {
  return experiment({
    element,
    signal,
    kicker: "曝光 · 光子预算与运动积分",
    title: "相同曝光量，运动轨迹仍可能不同",
    intro:
      "播放一次曝光，观察均匀背景的光子积累与移动点的轨迹。两组进度同步到各自曝光结束，实际经过的毫秒数分别标出。",
    controls: [
      {
        key: "apertureEV",
        label: "曝光光圈",
        min: 1,
        max: 4,
        step: 0.25,
        value: 2,
        format: (v) => `f/${(2 ** v).toFixed(2)}`,
      },
      {
        key: "exposureMs",
        label: "曝光时间",
        min: 0.25,
        max: 80,
        step: "any",
        value: 4,
        format: (v) => `${v.toFixed(3)} ms`,
      },
      {
        key: "transmission",
        label: "镜头能量透射率",
        min: 0,
        max: 1,
        step: 0.01,
        value: 0.8,
        format: (v) => `${(v * 100).toFixed(0)}%`,
      },
      {
        key: "magnification",
        label: "近摄放大率绝对值",
        min: 0,
        max: 1,
        step: 0.05,
        value: 0,
        format: (v) => `${v.toFixed(2)}×`,
      },
      {
        key: "velocity",
        label: "点目标像面速度",
        min: 0,
        max: 2,
        step: 0.05,
        value: 0.6,
        format: (v) => `${v.toFixed(2)} px/ms`,
      },
      {
        key: "progress",
        label: "曝光播放进度",
        min: 0,
        max: 100,
        step: 0.1,
        value: 0,
        format: (v) => `${v.toFixed(1)}%`,
      },
    ],
    presets: [
      {
        label: "基准 f/4 · 4 ms",
        values: {
          apertureEV: 2,
          exposureMs: 4,
          transmission: 0.8,
          magnification: 0,
          velocity: 0.6,
          progress: 0,
        },
      },
      {
        label: "等曝光，收小一档",
        values: {
          apertureEV: 2.5,
          exposureMs: equalExposureTime({}, Math.sqrt(32)),
          transmission: 0.8,
          magnification: 0,
          progress: 0,
        },
      },
      {
        label: "等曝光，开大一档",
        values: {
          apertureEV: 1.5,
          exposureMs: equalExposureTime({}, Math.sqrt(8)),
          transmission: 0.8,
          magnification: 0,
          progress: 0,
        },
      },
      {
        label: "近摄 1:1",
        values: { apertureEV: 2, exposureMs: 4, magnification: 1, progress: 0 },
      },
      { label: "曝光结束", values: { progress: 100 } },
    ],
    content: `<style>.actions button{font-size:11px;padding:4px 8px}.exposure-pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}.exposure-panel{border:1px solid #9caea244;border-radius:6px;padding:12px;min-width:0}.exposure-panel h4{font-size:13px;margin:0}.exposure-panel p{font-size:11px}.exposure-panel svg{display:block;width:100%;height:auto}.exposure-panel text{fill:currentColor;font:11px ui-sans-serif,sans-serif}.truth{font-size:11px;border:1px solid #9caea244;border-radius:6px;padding:12px;margin:14px 0}.stats strong{font-size:18px}@media(max-width:650px){.exposure-panel text{font-size:14px}.exposure-pair,.stats{grid-template-columns:1fr}.stats>div{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}}</style><div class="exposure-pair" data-panels></div><div class="stats" data-stats></div><p class="reading" data-reading aria-live="polite"></p><div class="truth" data-truth></div>`,
    note: "均匀轴上扩展物面，550 nm 单色辐亮度1 W/(m² sr)，4 µm方形像素、量子效率70%。薄透镜及同面光阑，瞳放大率1，工作f数=N(1+|m|)。主读数直接积分圆形出瞳的 sinα cosα；α=atan[1/(2N_eff)]，保留几何圆锥的有限角修正。等曝光预设按此积分匹配，并非把近似√2档位与精确积分混用。背景光子计数与移动点轨迹是两项分开的教学观察；轨迹只示匀速积分，不模拟场景纹理、景深或衍射。两图的运动轨迹始终使用同一尺度，随最大位移一起缩放。播放约8秒，离开视区暂停。",
    update(root, s) {
      const m = exposureBudget(parameters(s)),
        t = exposureTruth(m.p),
        base = exposureBudget({ ...reference.p, velocity: s.velocity }),
        scale = Math.max(m.photons, base.photons, 1),
        motionScale = Math.min(
          12,
          360 / Math.max(m.motionPixels, base.motionPixels, 1),
        );
      root.querySelector("[data-panels]").innerHTML =
        panel(base, "固定基准", s.progress, scale, motionScale) +
        panel(m, "当前条件", s.progress, scale, motionScale);
      root.querySelector("[data-stats]").innerHTML = [
        ["辐射曝光量", `${m.exposure.toExponential(4)} J/m²`, "均匀背景"],
        ["平均信号电子", `${format(m.electrons)} e⁻`, "未加散粒与读出噪声"],
        [
          "相对基准光子数",
          `${(m.photons / reference.photons).toFixed(5)}×`,
          `工作 f/${m.workingNumber.toFixed(2)}`,
        ],
      ]
        .map(
          ([a, b, c]) =>
            `<div><small>${a}</small><strong>${b}</strong><em>${c}</em></div>`,
        )
        .join("");
      root.querySelector("[data-reading]").textContent =
        `当前积累 ${format(m.accumulatedPhotons)} 个平均光子，像面运动 ${m.accumulatedMotion.toFixed(3)} px。等曝光只匹配结束时的光子预算，曝光期间的运动距离仍取决于时间。`;
      root.querySelector("[data-truth]").textContent =
        `独立对照：圆锥积分 E=${m.irradiance.toFixed(10)} W/m²，解析 πTL sin²α=${t.irradiance.toFixed(10)} W/m²，差 ${Math.abs(m.irradiance - t.irradiance).toExponential(2)}。近轴 πTL/(4N_eff²)=${t.paraxial.toFixed(10)} W/m²；像面运动另由 vt=${t.motionPixels.toFixed(3)} px 核对。`;
    },
    setup: (context) =>
      replay({
        ...context,
        element,
        signal,
        key: "progress",
        label: "播放曝光",
      }),
  });
}
