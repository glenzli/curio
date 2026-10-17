import { experiment } from "../common/ui.js";
import {
  CHANNELS,
  channelAt,
  bayerModel,
  captureMosaic,
  demosaicBilinear,
  samplingBoundary,
} from "./model.js";

const colors = { R: "#b26458", G: "#52846e", B: "#547fba" };
const fmt = (x, n = 3) => (Math.abs(x) < 0.5 * 10 ** -n ? 0 : x).toFixed(n);
function paint(canvas, side, sample) {
  canvas.width = canvas.height = side;
  const c = canvas.getContext("2d"),
    image = c.createImageData(side, side);
  for (let y = 0; y < side; y++)
    for (let x = 0; x < side; x++) {
      const rgb = sample(x, y);
      image.data.set(
        [
          ...rgb.map((v) =>
            Math.round(255 * Math.max(0, Math.min(1, v)) ** (1 / 2.2)),
          ),
          255,
        ],
        4 * (y * side + x),
      );
    }
  c.putImageData(image, 0, 0);
}
function frequencyDiagram(m, channel) {
  const a = m.aliases[channel],
    x = (v) => 210 + 180 * v,
    y = (v) => 180 + 180 * v;
  let axes = `<path d="M48 180H372M210 28V332" stroke="currentColor" opacity=".15"/><path d="M48 28V332H372" fill="none" stroke="currentColor" opacity=".3"/>`;
  for (const f of [-0.5, -0.25, 0, 0.25, 0.5])
    axes += `<path d="M${x(f)} 332v6M42 ${y(f)}h6" stroke="currentColor" opacity=".3"/><text x="${x(f)}" y="355" text-anchor="middle">${f}</text><text x="36" y="${y(f) + 4}" text-anchor="end">${f}</text>`;
  return `<svg role="img" aria-label="红蓝方形与绿色菱形频率边界，以及输入和等效频率" viewBox="0 0 420 390">${axes}
    <rect x="${x(-0.25)}" y="${y(-0.25)}" width="90" height="90" fill="none" stroke="${channel === "G" ? "#8b8e91" : colors[channel]}" stroke-width="${channel === "G" ? 1 : 2}" stroke-dasharray="${channel === "G" ? "5 4" : "none"}"/>
    <path d="M${x(0)} ${y(0.5)}L${x(0.5)} ${y(0)}L${x(0)} ${y(-0.5)}L${x(-0.5)} ${y(0)}Z" fill="none" stroke="${channel === "G" ? colors.G : "#8b8e91"}" stroke-width="${channel === "G" ? 2 : 1}" stroke-dasharray="${channel === "G" ? "none" : "5 4"}"/>
    <path d="M${x(m.fx)} ${y(m.fy)}L${x(a.fx)} ${y(a.fy)}" stroke="#b47b43" stroke-dasharray="4 4"/>
    <circle cx="${x(m.fx)}" cy="${y(m.fy)}" r="6" fill="none" stroke="currentColor" stroke-width="2"/>
    <circle cx="${x(a.fx)}" cy="${y(a.fy)}" r="3" fill="#448b98"/>
    <text x="210" y="382" text-anchor="middle">fₓ / cycles/pixel</text><text x="26" y="18">fᵧ / cycles/pixel（y 向下）</text>
    </svg>`;
}
function lattice(channel) {
  let cells = "";
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      const c = channelAt(x, y),
        selected = c === channel;
      cells += `<g opacity="${selected ? 1 : 0.16}"><rect x="${28 + 25 * x}" y="${18 + 25 * y}" width="23" height="23" rx="2" fill="${colors[c]}"/><text x="${39.5 + 25 * x}" y="${34 + 25 * y}" text-anchor="middle" fill="white">${c}</text></g>`;
    }
  return `<svg role="img" aria-label="RGGB 格点中选中的 ${channel} 通道位置" viewBox="0 0 256 240">${cells}<text x="128" y="235" text-anchor="middle">原始像素坐标；每格间距为 1</text></svg>`;
}

export function mount({ element, signal }) {
  return experiment({
    element,
    signal,
    kicker: "Bayer · 二维采样方向",
    title: "Bayer 采样：方向、相位与伪色",
    intro:
      "输入是三个理想通道完全相同的中性正弦。旋转频率方向，比较红蓝方形、绿色菱形的频率边界，再看同一份 CFA 样本经过双线性插值后的结果。",
    controls: [
      {
        key: "frequency",
        label: "空间频率模长",
        min: 0,
        max: 0.75,
        step: 0.01,
        value: 0.3,
        format: (v) => `${fmt(v, 2)} cycles/pixel`,
      },
      {
        key: "angle",
        label: "频率方向（垂直于条纹）",
        min: 0,
        max: 90,
        step: 1,
        value: 0,
        format: (v) => `${v}°`,
      },
      {
        key: "phase",
        label: "输入相位",
        min: 0,
        max: 1,
        step: 0.01,
        value: 0,
        format: (v) => `${fmt(v, 2)} 周期`,
      },
      {
        key: "width",
        label: "方形孔径边长 / 像素节距",
        min: 0,
        max: 1,
        step: 0.1,
        value: 0,
        format: (v) => (v ? fmt(v, 1) : "0 · 点采样极限"),
      },
    ],
    presets: [
      {
        label: "轴向 0.30",
        values: { frequency: 0.3, angle: 0, phase: 0, width: 0, channel: "R" },
      },
      {
        label: "斜向 0.40",
        values: { frequency: 0.4, angle: 45, phase: 0, width: 0, channel: "G" },
      },
      {
        label: "R 边界与相位",
        values: {
          frequency: 0.25,
          angle: 0,
          phase: 0.25,
          width: 0,
          channel: "R",
        },
      },
      { label: "满像素面积积分", values: { width: 1 } },
    ],
    content: `<style>
      .actions button,.bayer-channels button{font-size:11px;padding:4px 8px}.bayer-channels{display:flex;gap:8px;margin:12px 0}.bayer-channels [aria-pressed=true]{border-color:currentColor;background:#9caea222}.bayer-domains{display:grid;grid-template-columns:1.25fr 1fr;gap:16px;align-items:center}.bayer-domains svg{width:100%;height:auto;display:block}.bayer-domains text{font-family:inherit;font-size:12px;fill:currentColor}.bayer-lattice text{font-size:11px}.bayer-lattice g text{fill:white}.bayer-key{display:flex;gap:6px 18px;flex-wrap:wrap;font-size:11px}.bayer-key i{display:inline-block;width:16px;border-top:2px solid;vertical-align:middle;margin-right:6px}.bayer-vectors{font-size:12px;font-variant-numeric:tabular-nums}.bayer-status{font-size:12px;border-left:2px solid #448b98;padding-left:12px}.bayer-images{display:grid;grid-template-columns:1fr 1fr;gap:20px 16px;margin:20px 0}.bayer-images figure{margin:0;min-width:0}.bayer-images canvas{display:block;width:100%;height:auto;border-radius:4px}.bayer-images canvas[data-mosaic],.bayer-images canvas[data-reconstruction]{image-rendering:pixelated}.bayer-images figcaption{font-size:11px;margin-bottom:5px}.bayer-images small{display:block;font-size:10px;opacity:.65}.bayer-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:18px 0;padding:12px 0;border-block:1px solid #9caea244}.bayer-stats strong{display:block;font-size:19px}.bayer-stats small{font-size:10px;opacity:.65}.bayer-stats em{font-size:10px;font-style:normal;display:block;opacity:.7}
      @media(max-width:650px){.bayer-domains,.bayer-images{grid-template-columns:1fr}.bayer-lattice{max-width:240px;margin:auto}.bayer-stats{grid-template-columns:1fr}.bayer-stats>div{display:flex;gap:6px 16px;justify-content:space-between;flex-wrap:wrap}.bayer-stats em{width:100%}.bayer-stats strong{font-size:17px}}
    </style><div class="bayer-channels" data-channels></div><div class="bayer-domains"><div data-frequency></div><div class="bayer-lattice" data-lattice></div></div><div class="bayer-key"><span><i style="border-color:#8b8e91"></i>R/B 方形与 G 菱形</span><span>空心圈：输入真值</span><span>青点：一个等效基带频率</span></div><p class="bayer-vectors" data-vectors></p><p class="bayer-status" data-status aria-live="polite"></p><div class="bayer-stats" data-stats></div><div class="bayer-images"><figure><figcaption>连续中性条纹 · 输入真值</figcaption><canvas data-truth role="img" aria-label="已知连续中性条纹"></canvas><small>未作孔径积分；各理想通道相同</small></figure><figure><figcaption>CFA 记录值 · RGGB</figcaption><canvas data-mosaic role="img" aria-label="积分后中性场景的 RGGB 观测"></canvas><small>颜色标识滤色位置；每格只记录一个数值</small></figure><figure><figcaption>双线性 RGB 插值示例</figcaption><canvas data-reconstruction role="img" aria-label="只从 CFA 观测进行双线性插值的 RGB"></canvas><small>不使用输入频率；输出颜色差异来自插值误差</small></figure><figure><figcaption data-alias-title></figcaption><canvas data-alias role="img" aria-label="与选中通道样点一致的一个基带正弦"></canvas><small>沿用原孔径的振幅与格点相位；不是重新拍摄的低频场景</small></figure></div>`,
    note: "频率以原始像素节距为单位，角度相对 +x，图像坐标 x 向右、y 向下，角度由 +x 顺时针增加。RGGB 的 R/B 是间隔 2 的方格；两个绿色位置假定响应相同，合成基向量为 (1,1)、(1,−1) 的交错格。图中边界是所选中心频率单元，不表示任意自然图像都能唯一恢复；严格带限需在边界内。频率从原点到真值圆圈的向量垂直于条纹，孔径乘数为 sinc(w fₓ)sinc(w fᵧ)，sinc(z)=sin(πz)/(πz)。等效频率从真值减去倒格向量，并保留采样起点造成的相位；它是已知输入构造的对照，不是由 RAW 估计的真频率。双线性仅用观测及 RGGB 位置，不把三通道相同作为恢复先验；数值比较剔除一圈边界。显示统一用 Gamma 2.2；没有噪声、真实光谱响应、镜头 PSF、OLPF、锐化或学习先验。",
    update(root, s) {
      const m = bayerModel(s),
        channel = s.channel ?? "R",
        a = m.aliases[channel],
        size = 48,
        mosaic = captureMosaic(size, (_, x, y) => m.integrated(x, y)),
        rgb = demosaicBilinear(mosaic, size);
      root.querySelector("[data-frequency]").innerHTML = frequencyDiagram(
        m,
        channel,
      );
      root.querySelector("[data-lattice]").innerHTML = lattice(channel);
      root.querySelector("[data-vectors]").textContent =
        `${channel} 通道：输入 (fₓ, fᵧ) = (${fmt(m.fx)}, ${fmt(m.fy)})；等效频率 (${fmt(a.fx)}, ${fmt(a.fy)}) cycles/pixel，等效相位 ${fmt(a.phase)} 周期。`;
      root.querySelector("[data-status]").textContent =
        a.location === "outside"
          ? `输入已越过 ${channel} 的中心频率边界。高频与图中的基带正弦在该通道的采样位置给出相同数值；其他通道的格点约束分别计算。`
          : a.location === "boundary"
            ? `输入恰在 ${channel} 的边界。当前相位可能使样点失去调制度，不能把边界当成稳定恢复的保证。`
            : `输入位于 ${channel} 的中心频率单元内。这里的基带代表与输入相同；唯一重建仍需要预先限定带宽。`;
      let maximumError = 0,
        chroma = 0,
        count = 0,
        sampleMin = Infinity,
        sampleMax = -Infinity;
      for (let y = 1; y < size - 1; y++)
        for (let x = 1; x < size - 1; x++) {
          const i = y * size + x,
            values = CHANNELS.map((c) => rgb[c][i]);
          chroma += (Math.max(...values) - Math.min(...values)) ** 2;
          count++;
          if (channelAt(x, y) === channel) {
            sampleMin = Math.min(sampleMin, mosaic[i]);
            sampleMax = Math.max(sampleMax, mosaic[i]);
            maximumError = Math.max(
              maximumError,
              Math.abs(mosaic[i] - a.value(x, y)),
            );
          }
        }
      root.querySelector("[data-stats]").innerHTML = [
        [
          "此方向的通道边界",
          fmt(samplingBoundary(channel, s.angle)),
          "cycles/pixel；使用原像素节距",
        ],
        [
          "选中通道的样本范围",
          `${fmt(sampleMin)} – ${fmt(sampleMax)}`,
          "当前窗口的最小与最大观测，线性尺度",
        ],
        [
          "同通道样点最大差",
          maximumError < 1e-12 ? "< 10⁻¹²" : maximumError.toExponential(2),
          "真值与构造的基带代表；不是估计精度",
        ],
        [
          "插值后通道差 RMS",
          fmt(Math.sqrt(chroma / count)),
          "RMS(max RGB − min RGB)，线性尺度",
        ],
      ]
        .map(
          ([name, value, note]) =>
            `<div><small>${name}</small><strong>${value}</strong><em>${note}</em></div>`,
        )
        .join("");
      paint(root.querySelector("[data-truth]"), 192, (x, y) => {
        const v = m.raw(
          3.5 + (40 * (x + 0.5)) / 192,
          3.5 + (40 * (y + 0.5)) / 192,
        );
        return [v, v, v];
      });
      paint(root.querySelector("[data-alias]"), 192, (x, y) => {
        const v = a.value(
          3.5 + (40 * (x + 0.5)) / 192,
          3.5 + (40 * (y + 0.5)) / 192,
        );
        return [v, v, v];
      });
      paint(root.querySelector("[data-mosaic]"), 40, (x, y) => {
        const px = x + 4,
          py = y + 4,
          c = channelAt(px, py),
          v = mosaic[py * size + px];
        return CHANNELS.map((k) => (k === c ? v : 0));
      });
      paint(root.querySelector("[data-reconstruction]"), 40, (x, y) =>
        CHANNELS.map((c) => rgb[c][(y + 4) * size + x + 4]),
      );
      root.querySelector("[data-alias-title]").textContent =
        `${channel} 通道的一个等效基带正弦`;
      for (const b of root.querySelectorAll("[data-channel]"))
        b.setAttribute("aria-pressed", String(b.dataset.channel === channel));
    },
    setup({ root, state, render }) {
      for (const c of CHANNELS) {
        const b = document.createElement("button");
        b.dataset.channel = c;
        b.textContent = `${c} 通道`;
        b.addEventListener(
          "click",
          () => {
            state.channel = c;
            render();
          },
          { signal },
        );
        root.querySelector("[data-channels]").append(b);
      }
      render();
    },
  });
}
