import { experiment, plot, legend } from "../common/ui.js";
import { replay } from "../common/replay.js";
import {
  propagate,
  amplitudeAt,
  indexAt,
  otfAt,
  directCorrelation,
  polarAmplitude,
  airyRelative,
  circularOtf,
  defocusOnAxis,
  phasorTrace,
} from "./model.js";

const fmt = (v, n = 4) => (Math.abs(v) < 0.5 * 10 ** -n ? 0 : v).toFixed(n);
const complex = (z) =>
  `${fmt(z[0])} ${z[1] < -0.00005 ? "−" : "+"} ${fmt(Math.abs(z[1]))}i`;
const zero = { defocus: 0, astigmatism: 0, coma: 0, spherical: 0 };
const localStyle = `<style>
.wave-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:18px 0}.wave-card{min-width:0;border:1px solid #9caea244;border-radius:7px;padding:14px}.wave-card h4{margin:0 0 8px;font-size:14px}.wave-card p{font-size:11px;min-height:3em}.wave-card canvas,.wave-card svg{display:block;width:100%;max-width:260px;aspect-ratio:1;margin:auto;border-radius:4px}.wave-card svg{height:auto}.wave-card canvas{background:#10171c}.wave-card svg text{fill:currentColor;font-size:12px}.wave-card.active{outline:2px solid #496c8c;outline-offset:1px}.wave-plots .chart text{font-size:13px}.wave-truth{padding:14px;background:color-mix(in srgb,currentColor 4%,transparent);border-radius:6px;font-size:11px;font-variant-numeric:tabular-nums}.wave-truth p{opacity:.85;margin:5px 0}.wave-truth strong{font-weight:600}.wave-process{font-size:12px;min-height:3.4em}.wave-display{margin:5px 0}.wave-map-scale{font-size:10px;text-align:center}.wave-grid .number{font-variant-numeric:tabular-nums}.wave-profile-note{font-size:11px}
@media(max-width:550px){.wave-grid{grid-template-columns:1fr}.wave-card{padding:12px}.wave-plots .chart text{font-size:16px}.stats{grid-template-columns:1fr 1fr}.stats>div:last-child{grid-column:1/-1}.wave-truth{font-size:12px}.wave-truth p{overflow-wrap:anywhere}}
</style>`;

function mapPupil(canvas, g) {
  const size = 160,
    ctx = canvas.getContext("2d"),
    image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = Math.round((x / (size - 1) - 0.5) * g.p.diameter * 1.12),
        j = Math.round((y / (size - 1) - 0.5) * g.p.diameter * 1.12);
      const k = indexAt(g, i + g.size / 2, j + g.size / 2),
        phase = Math.atan2(g.imaginary[k], g.real[k]) / Math.PI;
      const inside = g.real[k] ** 2 + g.imaginary[k] ** 2 > 0.5,
        at = (y * size + x) * 4;
      // A cyclic phase palette: -pi and +pi meet at the same color, zero is pale.
      const hue = (phase + 1) * Math.PI;
      const color = inside
        ? [
            140 + 105 * Math.cos(hue),
            140 + 105 * Math.cos(hue - (2 * Math.PI) / 3),
            140 + 105 * Math.cos(hue + (2 * Math.PI) / 3),
          ]
        : [16, 23, 28];
      color.forEach((v, c) => (image.data[at + c] = v));
      image.data[at + 3] = 255;
    }
  canvas.width = size;
  canvas.height = size;
  ctx.putImageData(image, 0, 0);
}
function mapPsf(canvas, g, enhanced) {
  const size = 160,
    ctx = canvas.getContext("2d"),
    image = ctx.createImageData(size, size);
  const referencePeak = g.count / (g.size * g.size * g.imageStepUm ** 2);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (x / (size - 1) - 0.5) * 10 * g.p.padding,
        j = (y / (size - 1) - 0.5) * 10 * g.p.padding;
      const a = Math.floor(i),
        b = Math.floor(j),
        u = i - a,
        v = j - b;
      // Display interpolation only. All profiles, integrals and OTF use the original samples.
      const value =
        (1 - u) * (1 - v) * g.psf[indexAt(g, a, b)] +
        u * (1 - v) * g.psf[indexAt(g, a + 1, b)] +
        (1 - u) * v * g.psf[indexAt(g, a, b + 1)] +
        u * v * g.psf[indexAt(g, a + 1, b + 1)];
      const relative = value / referencePeak;
      const gray = Math.round(
        255 *
          Math.max(
            0,
            Math.min(
              1,
              enhanced
                ? Math.log1p(1000 * relative) / Math.log(1001)
                : relative,
            ),
          ),
      );
      const at = (y * size + x) * 4;
      image.data[at] = image.data[at + 1] = image.data[at + 2] = gray;
      image.data[at + 3] = 255;
    }
  canvas.width = size;
  canvas.height = size;
  ctx.putImageData(image, 0, 0);
}
function phasors(trace, progress) {
  const last = Math.max(
    1,
    Math.min(trace.length - 1, Math.ceil(progress * (trace.length - 1))),
  );
  const shown = trace.slice(0, last + 1),
    x = (v) => 130 + v * 105,
    y = (v) => 130 - v * 105;
  const path = shown
    .map((z, i) => `${i ? "L" : "M"}${x(z[0])},${y(z[1])}`)
    .join(" ");
  const end = shown.at(-1);
  return `<svg viewBox="0 0 260 260" role="img" aria-label="按瞳面条带累计的复振幅相量"><path d="M20 130H242M130 240V18" stroke="currentColor" opacity=".25"/><circle cx="130" cy="130" r="105" fill="none" stroke="currentColor" opacity=".12"/><path d="${path}" fill="none" stroke="#648cac" stroke-width="2"/><path d="M130 130L${x(end[0])} ${y(end[1])}" stroke="#b78952" stroke-width="2"/><circle cx="${x(end[0])}" cy="${y(end[1])}" r="4" fill="#b78952"/><text x="242" y="149" text-anchor="end">Re</text><text x="139" y="21">Im</text><text x="18" y="254">累计 ${last} / 32 条带 · 圆半径 1</text></svg>`;
}
function overlap(rho, aberrated, z) {
  if (aberrated) {
    const x = 130 + 100 * z[0],
      y = 130 - 100 * z[1];
    return `<svg viewBox="0 0 260 260" role="img" aria-label="所选频率的复 OTF，保留实部、虚部和相位"><circle cx="130" cy="130" r="100" fill="none" stroke="currentColor" opacity=".2"/><path d="M20 130H244M130 240V15" stroke="currentColor" opacity=".25"/><path d="M130 130L${x} ${y}" stroke="#ad844d" stroke-width="3"/><circle cx="${x}" cy="${y}" r="4" fill="#ad844d"/><text x="239" y="149">Re</text><text x="140" y="21">Im</text><text x="130" y="254" text-anchor="middle">|H| = ${fmt(Math.hypot(...z), 3)}</text></svg>`;
  }
  const d = 110 * rho;
  return `<svg viewBox="0 0 260 260" role="img" aria-label="圆瞳及其平移副本的几何重叠，平移量为两倍归一化频率"><circle cx="${130 - d / 2}" cy="121" r="55" fill="#648cac" fill-opacity=".35" stroke="#648cac"/><circle cx="${130 + d / 2}" cy="121" r="55" fill="#ad844d" fill-opacity=".35" stroke="#ad844d"/><path d="M${130 - d / 2} 196H${130 + d / 2}" stroke="currentColor"/><text x="130" y="219" text-anchor="middle">平移 ${fmt(2 * rho, 2)} 个瞳半径</text><text x="130" y="247" text-anchor="middle">重叠面积 / π = ${fmt(circularOtf(rho), 3)}</text></svg>`;
}

export function mountWave({ element, signal, session, aberrations = false }) {
  let cachedKey,
    g,
    truth,
    enhanced = true,
    drawnKey;
  const controls = aberrations
    ? [
        ...[
          ["defocus", "离焦"],
          ["astigmatism", "像散"],
          ["coma", "彗差"],
          ["spherical", "球差"],
        ].map(([key, label]) => ({
          key,
          label: `${label}系数`,
          min: -0.25,
          max: 0.25,
          step: 0.005,
          value: key === "coma" ? 0.12 : 0,
          format: (v) => `${fmt(v, 3)} λ`,
        })),
        {
          key: "rho",
          label: "OTF 探针频率",
          min: 0,
          max: 1,
          step: 1 / 64,
          value: 0.5,
          format: (v) => `${fmt(v, 3)} νc`,
        },
      ]
    : [
        {
          key: "fNumber",
          label: "光圈 f 数",
          min: 2,
          max: 22,
          step: 0.5,
          value: 8,
          format: (v) => `f/${v}`,
        },
        {
          key: "wavelengthNm",
          label: "波长",
          min: 400,
          max: 700,
          step: 10,
          value: 550,
          format: (v) => `${v} nm`,
        },
        {
          key: "probe",
          label: "像面探针位置",
          min: 0,
          max: 3,
          step: 0.25,
          value: 1,
          format: (v) => `${fmt(v, 2)} λN`,
        },
        {
          key: "rho",
          label: "OTF 探针频率",
          min: 0,
          max: 1,
          step: 1 / 64,
          value: 0.5,
          format: (v) => `${fmt(v, 3)} νc`,
        },
        {
          key: "progress",
          label: "计算步骤",
          min: 0,
          max: 100,
          step: 1,
          value: 100,
          format: (v) => `${Math.round(v)}%`,
        },
      ];
  const presets = aberrations
    ? [
        { label: "理想圆瞳", values: zero },
        ...[
          ["defocus", "离焦"],
          ["astigmatism", "像散"],
          ["coma", "彗差"],
          ["spherical", "球差"],
        ].map(([key, label]) => ({
          label: `${label} 0.12 λ`,
          values: { ...zero, [key]: 0.12 },
        })),
        { label: "彗差反号", values: { ...zero, coma: -0.12 } },
        { label: "相位反转", values: { ...zero, defocus: 0.25 } },
        {
          label: "两项叠加",
          values: { ...zero, defocus: 0.08, astigmatism: 0.12 },
        },
      ]
    : [
        { label: "从复瞳开始", values: { progress: 0 } },
        { label: "查看全部", values: { progress: 100 } },
        { label: "第一暗环附近", values: { probe: 1.25, progress: 100 } },
        { label: "截止频率", values: { rho: 1, progress: 100 } },
      ];
  return experiment({
    element,
    signal,
    session,
    kicker: aberrations ? "第十三章 · 波前与成像" : "第十二章 · 标量衍射",
    title: aberrations
      ? "波前改变后，点像和 OTF 怎样变化"
      : "复瞳 → 复振幅 → PSF → OTF",
    intro: aberrations
      ? "四项系数分别控制一组归一化圆瞳模式。可回放离焦扫描，也可直接比较相同 RMS 的不同像差。"
      : "播放四步计算，查看瞳面各部分的复振幅如何相加，再由点像强度得到传递函数。播放顺序表示计算步骤。",
    controls,
    presets,
    content: `${localStyle}<p class="wave-process"></p><div class="wave-grid"><section class="wave-card" data-stage="0"><h4>① 复瞳 P</h4><canvas class="pupil-map" role="img" aria-label="均匀圆瞳内的相位，瞳外振幅为零"></canvas><p class="pupil-reading"></p></section><section class="wave-card" data-stage="1"><h4>② 复振幅 U</h4><div class="phasor"></div><p class="amplitude-reading number"></p></section><section class="wave-card" data-stage="2"><h4>③ 点像强度 PSF</h4><canvas class="psf-map" role="img" aria-label="固定参考峰值刻度下的衍射点扩散函数"></canvas><p class="psf-reading"></p></section><section class="wave-card" data-stage="3"><h4>④ 复传递函数 OTF</h4><div class="overlap"></div><p class="otf-reading number"></p></section></div><button class="wave-display" type="button">切换为线性强度</button><p class="wave-map-scale"></p><div class="stats"></div><div class="wave-plots"><div class="chart psf-chart"></div><div class="legend psf-legend"></div><p class="wave-profile-note"></p><div class="chart otf-chart"></div><div class="legend otf-legend"></div></div><div class="wave-truth" aria-label="独立真值对照"></div>`,
    note: "单色、标量、近轴后焦面；均匀完整圆瞳，物点之间按非相干强度相加。瞳径 64 格，补零至 256×256；补零细化像面间隔，不提高瞳面精度。相位系数以当前波长为单位；未加入遮挡、像素孔径、色差或真实镜头处方。横轴均为像面坐标，x、y 是本演示固定方向，不代表厂商的全像场 S/T 曲线。",
    update(root, s) {
      enhanced = s.enhanced !== false;
      const p = aberrations
        ? {
            ...zero,
            ...Object.fromEntries(Object.keys(zero).map((k) => [k, s[k]])),
          }
        : { fNumber: s.fNumber, wavelengthNm: s.wavelengthNm };
      const key = JSON.stringify(p),
        probe = aberrations ? 1 : s.probe;
      if (key !== cachedKey) {
        g = propagate(p);
        truth = polarAmplitude(p);
        cachedKey = key;
      }
      const progress = aberrations ? 100 : s.progress,
        stage = Math.min(3, Math.floor(progress / 25));
      const shift = Math.round(s.rho * g.p.diameter),
        rho = shift / g.p.diameter;
      const h = otfAt(g, shift),
        direct = directCorrelation(g, shift),
        sample = amplitudeAt(g, Math.round(probe * g.p.padding));
      const trace = phasorTrace(g, probe),
        part = Math.max(0, Math.min(1, (progress - 25) / 25));
      root.querySelectorAll(".wave-card").forEach((card, i) => {
        card.classList.toggle("active", i === stage);
        card.style.opacity = i > stage ? ".38" : "1";
      });
      root.querySelector(".wave-process").textContent = aberrations
        ? "固定像面比较：离焦项保留在 RMS 中。波前图给相位，PSF 给强度，OTF 还保留了方向与相位信息。"
        : [
            "① 瞳内振幅为 1，瞳外为 0；本章的圆瞳相位为零。",
            "② 对所选像面位置，逐条带累加复振幅。相量方向由传播相位决定。",
            "③ 对总复振幅取模平方，再按全像面能量归一化。条带强度不能先相加。",
            "④ 对归一化 PSF 作 Fourier 变换；也可直接计算两份复瞳的自相关。由 OTF 取模才得到 MTF。",
          ][stage];
      root.querySelector(".pupil-reading").textContent =
        "颜色表示 arg P：−π 与 +π 为同色；瞳内 |P| = 1，暗底为瞳外。";
      root.querySelector(".phasor").innerHTML = phasors(
        trace,
        progress >= 50 ? 1 : part,
      );
      root.querySelector(".amplitude-reading").textContent =
        `像面 x = ${fmt(probe * g.scaleUm, 2)} µm，y = 0；完整 U / π = ${complex(sample)}。`;
      root.querySelector(".psf-reading").textContent =
        `范围 ±${fmt(5 * g.scaleUm, 1)} µm；与同孔径理想圆瞳共用峰值刻度。二维图作双线性显示插值；归一化使用完整数值像面。`;
      root.querySelector(".overlap").innerHTML = overlap(rho, aberrations, h);
      root.querySelector(".otf-reading").textContent =
        `ν = ${fmt(rho * g.cutoff, 2)} lp/mm；H = ${complex(h)}，${Math.hypot(...h) < 1e-6 ? "模接近零，相位不读数" : `arg H = ${fmt((Math.atan2(h[1], h[0]) * 180) / Math.PI, 1)}°`}。`;
      const drawKey = `${key}:${enhanced}`;
      if (drawKey !== drawnKey) {
        mapPupil(root.querySelector(".pupil-map"), g);
        mapPsf(root.querySelector(".psf-map"), g, enhanced);
        drawnKey = drawKey;
      }
      root.querySelector(".wave-display").textContent = enhanced
        ? "切换为线性强度"
        : "增强暗环显示";
      root.querySelector(".wave-map-scale").textContent = enhanced
        ? "显示映射 log(1 + 1000 h/h参考峰值) / log(1001)，仅便于看暗环；不能用图中亮度读能量。"
        : "线性显示 h/h参考峰值；像差前后不单独拉伸峰值。";
      root.querySelector(".stats").innerHTML =
        `<div><small>轴上强度比 S₀</small><strong>${fmt(g.onAxisRatio)}</strong><em>固定原点 / 同孔径理想轴上值</em></div><div><small>连续圆瞳 RMS</small><strong>${fmt(g.rms, 3)} λ</strong><em>去 piston、tilt；保留 defocus</em></div><div><small>物理刻度</small><strong>${fmt(g.imageStepUm, 3)} µm</strong><em>像面间隔 · νc = ${fmt(g.cutoff, 2)} lp/mm</em></div>`;
      const refPeak = g.count / (g.size * g.size * g.imageStepUm ** 2);
      const profiles = [
        {
          name: "PSF x 截面",
          color: "#648cac",
          points: Array.from({ length: 41 }, (_, i) => [
            (i - 20) * g.imageStepUm,
            g.psf[indexAt(g, i - 20)] / refPeak,
          ]),
        },
        {
          name: aberrations ? "PSF y 截面" : "Airy 解析值",
          color: "#b78952",
          dashed: true,
          points: aberrations
            ? Array.from({ length: 41 }, (_, i) => [
                (i - 20) * g.imageStepUm,
                g.psf[indexAt(g, 0, i - 20)] / refPeak,
              ])
            : Array.from({ length: 161 }, (_, i) => [
                ((i - 80) * g.scaleUm) / 16,
                airyRelative((i - 80) / 16),
              ]),
        },
      ];
      root.querySelector(".psf-chart").innerHTML = plot({
        curves: profiles,
        xMin: -5 * g.scaleUm,
        xMax: 5 * g.scaleUm,
        xLabel: "像面位置 · µm",
        yLabel: "强度 / 理想峰值",
        title: "PSF 线性截面与参考值",
        height: 300,
        width: 480,
        rightPadding: 40,
        topLabelY: 22,
        bottomLabelPadding: 10,
        topPadding: 34,
        bottomPadding: 56,
        yMax: 1,
      });
      root.querySelector(".psf-legend").innerHTML = legend(profiles);
      root.querySelector(".wave-profile-note").textContent =
        "截面始终使用线性强度。相量按 π 归一化；离散值按采样瞳面积归一化，二者有有限网格误差。";
      const curves = [
        {
          name: "MTF x",
          color: "#648cac",
          points: Array.from({ length: 65 }, (_, j) => [
            j * g.frequencyStep,
            Math.hypot(...otfAt(g, j)),
          ]),
        },
        {
          name: "Re H(x)",
          color: "#b78952",
          points: Array.from({ length: 65 }, (_, j) => [
            j * g.frequencyStep,
            otfAt(g, j)[0],
          ]),
        },
        {
          name: "Im H(x)",
          color: "#9b627a",
          dashed: true,
          points: Array.from({ length: 65 }, (_, j) => [
            j * g.frequencyStep,
            otfAt(g, j)[1],
          ]),
        },
        {
          name: aberrations ? "MTF y" : "圆盘重叠解析值",
          color: "#6e8766",
          dashed: true,
          points: Array.from({ length: 65 }, (_, j) => [
            j * g.frequencyStep,
            aberrations ? Math.hypot(...otfAt(g, 0, j)) : circularOtf(j / 64),
          ]),
        },
      ];
      const dots = [0, 8, 16, 24, 32, 40, 48, 56, 64].map((j) => [
        j * g.frequencyStep,
        Math.hypot(...directCorrelation(g, j)),
      ]);
      root.querySelector(".otf-chart").innerHTML = plot({
        curves,
        xMax: g.cutoff,
        xLabel: "像面空间频率 · lp/mm",
        yLabel: "OTF / MTF",
        yMin: aberrations ? -0.5 : 0,
        yMax: 1,
        title: "OTF 的实部、虚部与模；点为直接瞳相关",
        height: 310,
        width: 480,
        rightPadding: 40,
        topLabelY: 22,
        bottomLabelPadding: 10,
        topPadding: 48,
        bottomPadding: 56,
        samples: dots,
        markers: [{ value: rho * g.cutoff, label: "探针" }],
      });
      root.querySelector(".otf-legend").innerHTML =
        legend(curves) + "<span>● 直接瞳相关的模</span>";
      const continuousRatio = truth[0] ** 2 + truth[1] ** 2,
        pureDefocus = aberrations && !s.astigmatism && !s.coma && !s.spherical;
      root.querySelector(".wave-truth").innerHTML =
        `<strong>独立真值对照</strong><p>归一化前 Parseval 比 = ${fmt(g.parseval, 10)}；Σ h Δx² = ${fmt(g.integral, 10)}；H(0) = ${complex(otfAt(g, 0))}。</p><p>当前 H：PSF 的 FFT ${complex(h)}；直接瞳相关 ${complex(direct)}；差 ${Math.hypot(h[0] - direct[0], h[1] - direct[1]).toExponential(1)}。</p><p>轴上 S₀：离散传播 ${fmt(g.onAxisRatio)}；独立连续圆瞳积分 ${fmt(continuousRatio)}${pureDefocus ? `；纯离焦 sinc² 解析值 ${fmt(defocusOnAxis(s.defocus))}` : ""}。</p><p>${aberrations ? `Maréchal 小误差近似 exp[−(2πσ)²] = ${fmt(Math.exp(-((2 * Math.PI * g.rms) ** 2)))}；它不是精确真值。S₀ 比较固定原点，不把彗差下偏移后的最高峰混为同一指标。` : `Airy 首暗环 = ${fmt(1.2196698912665 * g.scaleUm, 3)} µm；圆盘重叠 H(ν/νc=${fmt(rho, 3)}) = ${fmt(circularOtf(rho))}。`}</p><p>瞳面积数值 ${fmt(g.area, 5)} / π；像面间隔 ${fmt(g.imageStepUm, 3)} µm，频率间隔 ${fmt(g.frequencyStep, 3)} lp/mm。笛卡尔圆边界与有限像面会留下网格误差，补零不能消除它。</p>`;
      Object.assign(root.querySelector(".lab").dataset, {
        onAxis: String(g.onAxisRatio),
        continuous: String(continuousRatio),
        rms: String(g.rms),
        parseval: String(g.parseval),
        integral: String(g.integral),
        otfReal: String(h[0]),
        otfImag: String(h[1]),
        stage: String(stage),
      });
    },
    setup({ root, state, render, restored }) {
      root.querySelector(".wave-display").addEventListener(
        "click",
        () => {
          state.enhanced = !enhanced;
          render();
        },
        { signal },
      );
      return replay({
        root,
        state,
        render,
        element,
        signal,
        key: aberrations ? "defocus" : "progress",
        start: aberrations ? -0.25 : 0,
        end: aberrations ? 0.25 : 100,
        label: aberrations ? "回放离焦扫描" : "回放计算步骤",
        startOnFirstPlay: aberrations && !restored,
        durationMs: 8000,
      });
    },
  });
}
