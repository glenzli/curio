import { experiment, plot, legend } from "../common/ui.js";
import { replay } from "../common/replay.js";
import {
  propagate,
  indexAt,
  otfAt,
  directCorrelation,
  polarAmplitude,
  circularOtf,
  defocusOnAxis,
} from "./model.js";
import { diskIntensity, diskAmplitude } from "./circle-reference.js";
import {
  readingPoint,
  migratingSession,
  HALF_FIELD_UM,
  REFERENCE_SCALE_UM,
  FOCAL_MM,
} from "./reading.js";
import { drawPupil, drawPsf, crosshair, phasors, overlap } from "./figures.js";
const fmt = (v, n = 4) => (Math.abs(v) < 0.5 * 10 ** -n ? 0 : v).toFixed(n);
const complex = (z) =>
  `${fmt(z[0])} ${z[1] < -0.00005 ? "−" : "+"} ${fmt(Math.abs(z[1]))}i`;
const zero = { defocus: 0, astigmatism: 0, coma: 0, spherical: 0 };
const style = `<style>
.wave-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:18px 0}.wave-card{min-width:0;border:1px solid #9caea244;border-radius:7px;padding:14px}.wave-card h4{margin:0 0 8px;font-size:14px}.wave-card p{font-size:11px;min-height:3em}.wave-card canvas,.wave-card svg{display:block;width:100%;max-width:280px;aspect-ratio:1;margin:auto;border-radius:4px}.wave-card svg{height:auto}.wave-card canvas{background:#10171c}.wave-card svg text{fill:currentColor;font-size:12px}.wave-plots .chart text{font-size:13px}.wave-truth{padding:14px;background:color-mix(in srgb,currentColor 4%,transparent);border-radius:6px;font-size:11px;font-variant-numeric:tabular-nums}.wave-truth p{opacity:.85;margin:5px 0}.wave-process{font-size:12px;padding:12px;background:color-mix(in srgb,currentColor 4%,transparent);border-radius:6px}.wave-display{margin:5px 0}.wave-map-scale,.wave-profile-note{font-size:11px}.wave-map{position:relative;max-width:280px;margin:auto}.wave-map .probe-overlay{position:absolute;inset:0;pointer-events:none}.wave-sum-control{display:grid;gap:6px;font-size:11px;margin:10px 0}.wave-sum-control span{display:flex;justify-content:space-between}.wave-sum-control input{width:100%}.wave-how{font-size:11px;line-height:1.8;padding:10px 0}.wave-truth summary{cursor:pointer;font-weight:600}
@media(max-width:550px){.wave-grid{grid-template-columns:1fr}.wave-card{padding:12px}.wave-plots .chart text{font-size:14px}.stats{grid-template-columns:1fr}.wave-truth{font-size:12px}.wave-truth p{overflow-wrap:anywhere}}
</style>`;
export function mountWave({ element, signal, session, aberrations = false }) {
  let cachedKey,
    g,
    truth,
    drawnKey,
    enhanced = true;
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
          step: 1 / 128,
          value: 0.5,
          format: (v) => `${fmt(v, 3)} νc`,
        },
      ]
    : [
        {
          key: "fNumber",
          label: "光圈 f 数 · 看孔径和点像",
          min: 2,
          max: 22,
          step: 0.5,
          value: 8,
          format: (v) => `f/${v}`,
        },
        {
          key: "wavelengthNm",
          label: "波长 · 看衍射尺度",
          min: 400,
          max: 700,
          step: 10,
          value: 550,
          format: (v) => `${v} nm`,
        },
        {
          key: "probeUm",
          label: "像面取样位置 · 黄色十字",
          min: 0,
          max: 22,
          step: 0.1,
          value: 4.4,
          format: (v) => `${fmt(v, 1)} μm`,
        },
        {
          key: "frequencyLpMm",
          label: "要传递的纹理频率",
          min: 0,
          max: 400,
          step: 0.01,
          value: 60,
          format: (v) => `${fmt(v, 2)} lp/mm`,
        },
      ];
  const presets = aberrations
    ? [
        { label: "理想圆瞳", values: zero },
        ...Object.entries({
          defocus: "离焦",
          astigmatism: "像散",
          coma: "彗差",
          spherical: "球差",
        }).map(([key, label]) => ({
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
        { label: "f/4：大孔径", values: { fNumber: 4, sumProgress: 1 } },
        { label: "f/16：小孔径", values: { fNumber: 16, sumProgress: 1 } },
        { label: "中心：同相相加", values: { probeUm: 0, sumProgress: 1 } },
        {
          label: "第一暗环：相互抵消",
          values: (s) => ({
            probeUm: 1.2196698912665 * s.wavelengthNm * 0.001 * s.fNumber,
            sumProgress: 1,
          }),
        },
        {
          label: "f/8半截止",
          values: {
            frequencyLpMm: 113.64,
            fNumber: 8,
            wavelengthNm: 550,
            sumProgress: 1,
          },
        },
        {
          label: "细纹理超过截止",
          values: { frequencyLpMm: 350, fNumber: 16, sumProgress: 1 },
        },
      ];
  return experiment({
    element,
    signal,
    session: migratingSession(session, aberrations),
    version: 2,
    kicker: aberrations
      ? "第十三章 · 波前与成像"
      : "第十二章 · 孔径、点像与纹理",
    title: aberrations
      ? "波前改变后，点像和 OTF 怎样变化"
      : "复瞳 → 复振幅 → PSF → OTF",
    intro: aberrations
      ? "四项系数分别控制一组归一化圆瞳模式。先看相位怎样改变，再比较固定像面上的点像与传递函数。"
      : "先切换f/4和f/16：左图孔径缩小，下方点像在同一微米窗口内展开。再移动“像面取样位置”滑块，黄色十字会跟着移动；右侧相量图显示该点的复振幅怎样由各条瞳带相加。",
    controls,
    presets,
    content: `${style}<p class="wave-process"></p><div class="wave-grid"><section class="wave-card"><h4>${aberrations ? "① 复瞳 P · 相位" : "① 圆孔 · 固定毫米尺度"}</h4><canvas class="pupil-map" role="img" aria-label="连续圆瞳轮廓与相位，橙色为当前求和条带"></canvas><p class="pupil-reading"></p></section><section class="wave-card"><h4>② 这个像点的复振幅 U</h4><div class="phasor"></div>${aberrations ? "" : '<label class="wave-sum-control"><span>已累计条带<output class="sum-count">32/32</output></span><input class="sum-slider" aria-label="已累计条带数" type="range" min="0" max="32" step="1" value="32"></label>'}<p class="amplitude-reading"></p></section><section class="wave-card"><h4>③ 点像 PSF · 固定微米尺度</h4><div class="wave-map"><canvas class="psf-map" role="img" aria-label="固定48微米窗口与共同白点的点像强度"></canvas><div class="probe-overlay"></div></div><p class="psf-reading"></p></section><section class="wave-card"><h4>④ 这组纹理的 OTF</h4><div class="overlap"></div><p class="otf-reading"></p></section></div><p class="wave-how"></p><button class="wave-display" type="button">切换为线性强度</button><p class="wave-map-scale"></p><div class="stats"></div><div class="wave-plots"><div class="chart psf-chart"></div><div class="legend psf-legend"></div><p class="wave-profile-note"></p><div class="chart otf-chart"></div><div class="legend otf-legend"></div></div><details class="wave-truth" aria-label="独立真值对照"><summary>独立真值与数值精度</summary><div class="truth-body"></div></details>`,
    note: aberrations
      ? "单色、标量、近轴，均匀圆瞳；相位图按瞳半径归一。波前系数用当前波长，128格瞳、4倍补零；点像固定48 μm窗口，使用550 nm、f/8参考白点。离散Parseval、瞳自相关及连续积分保留作核对。横纵是固定方向；未加入像素、光谱平均或具体镜头处方。"
      : "单色、标量、近轴后焦面，均匀完整圆瞳；物点按非相干强度相加。孔径示例固定焦距50 mm，D=f/N，图幅30 mm；点像图幅固定48 μm，白点固定在550 nm、f/8的单位通量理想峰值。圆孔图按连续Airy积分，像差图用128格瞳、4倍补零的FFT；连续相位图与离散数值网格分开。相量条带按采样瞳面积归一，顺序是求和过程；点像和OTF均显示完整孔径的结果。未加入像素、色差或实际镜头处方。",
    update(root, s) {
      enhanced = s.enhanced !== false;
      const p = aberrations
        ? {
            ...zero,
            ...Object.fromEntries(Object.keys(zero).map((k) => [k, s[k]])),
            diameter: 128,
          }
        : { fNumber: s.fNumber, wavelengthNm: s.wavelengthNm, diameter: 128 };
      const key = JSON.stringify(p);
      if (key !== cachedKey) {
        g = propagate(p);
        truth = aberrations ? polarAmplitude(p) : [1, 0];
        cachedKey = key;
      }
      const point = readingPoint(g, s, aberrations),
        q = point.q,
        full = point.full,
        part = point.partial,
        h = point.h;
      root.querySelector(".wave-process").textContent = aberrations
        ? "固定像面比较：相位变化送入复瞳，点像给强度，OTF另保留方向和相位。"
        : `焦距固定${FOCAL_MM} mm，f/${s.fNumber}的孔径直径${fmt(point.diameterMm, 2)} mm；${s.wavelengthNm} nm下，第一暗环半径${fmt(point.airyRadiusUm, 2)} μm。图幅保持不变。`;
      root.querySelector(".pupil-reading").textContent = aberrations
        ? "颜色表示相位，圆周按连续几何绘制；波前系数以当前波长为单位。"
        : `图宽30 mm，圆孔直径${fmt(point.diameterMm, 2)} mm。${point.strips < 32 ? "橙带标出求和位置，右侧暗罩表示尚未累加的部分；实际孔径没有改变。" : "完整孔径参与成像；缩小光圈会改变这个实际直径。"}`;
      drawPupil(root.querySelector(".pupil-map"), g, point, aberrations);
      root.querySelector(".phasor").innerHTML = phasors(point);
      root.querySelector(".amplitude-reading").textContent =
        `固定像面x=${fmt(point.probeUm, 2)} μm。已累计${point.strips}/32条带：U/A=${complex(part)}；完整和为${complex(full)}。`;
      const slider = root.querySelector(".sum-slider");
      if (slider) {
        slider.value = point.strips;
        root.querySelector(".sum-count").value = `${point.strips}/32`;
      }
      root.querySelector(".probe-overlay").innerHTML = crosshair(point);
      root.querySelector(".psf-reading").textContent = aberrations
        ? `横纵固定为±${HALF_FIELD_UM} μm，黄色十字与复振幅取样点对应；各波前共用同一白点。`
        : `横纵始终为±${HALF_FIELD_UM} μm；黄色十字与复振幅取样点、下方剖面竖线对应。缩小光圈后，点像的物理范围变宽。`;
      root.querySelector(".overlap").innerHTML = overlap(
        point.rho,
        aberrations,
        h,
      );
      root.querySelector(".otf-reading").textContent =
        `ν=${fmt(point.frequency, 1)} lp/mm，ν/νc=${fmt(point.rho, 3)}；H=${complex(h)}，${Math.hypot(...h) < 1e-6 ? "该纹理没有可用调制度" : `MTF=${fmt(Math.hypot(...h), 3)}`}。`;
      root.querySelector(".wave-how").textContent = aberrations
        ? "相位图、点像和两方向剖面使用同一波前；纯彗差反号时可比较OTF虚部与点像的位置。"
        : "条带回放只解释“一个像点的振幅如何相加”。蓝线依次连接各条带贡献，橙线是当前总和；中心同相增长，第一暗环附近会互相抵消。PSF对完整振幅取模平方，OTF则比较整幅点像对纹理的传递。";
      const drawKey = `${key}:${enhanced}`;
      if (drawKey !== drawnKey) {
        drawPsf(root.querySelector(".psf-map"), g, enhanced, aberrations);
        drawnKey = drawKey;
      }
      root.querySelector(".wave-display").textContent = enhanced
        ? "切换为线性强度"
        : "增强暗环显示";
      root.querySelector(".wave-map-scale").textContent = enhanced
        ? "各图共用550 nm、f/8参考白点，以固定对数映射看暗环；增强显示不改变计算能量。"
        : "线性强度，同一参考白点；超过白点的部分显示为白，数值仍保留。";
      root.querySelector(".stats").innerHTML = aberrations
        ? `<div><small>轴上强度比 S₀</small><strong>${fmt(g.onAxisRatio)}</strong><em>固定原点 / 同孔径理想轴上值</em></div><div><small>连续圆瞳 RMS</small><strong>${fmt(g.rms, 3)} λ</strong><em>去piston、tilt；保留defocus</em></div><div><small>截止频率</small><strong>${fmt(g.cutoff, 2)} lp/mm</strong><em>同一物理频率尺度</em></div>`
        : `<div><small>孔径直径</small><strong>${fmt(point.diameterMm, 2)} mm</strong><em>50 mm / f数</em></div><div><small>第一暗环半径</small><strong>${fmt(point.airyRadiusUm, 2)} μm</strong><em>1.21967 λN</em></div><div><small>截止频率</small><strong>${fmt(g.cutoff, 1)} lp/mm</strong><em>1/(λN)，波长换成mm</em></div>`;
      const peak = g.count / (g.size * g.size * g.imageStepUm ** 2),
        count = Math.floor(HALF_FIELD_UM / g.imageStepUm);
      const sampledProfile = Array.from({ length: 2 * count + 1 }, (_, i) => [
        (i - count) * g.imageStepUm,
        g.psf[indexAt(g, i - count)] / peak,
      ]);
      const profileX = Array.from(
        { length: 241 },
        (_, i) => ((i - 120) * HALF_FIELD_UM) / 120,
      );
      const profiles = aberrations
        ? [
            { name: "PSF x 截面", color: "#648cac", points: sampledProfile },
            {
              name: "PSF y 截面",
              color: "#b78952",
              dashed: true,
              points: Array.from({ length: 2 * count + 1 }, (_, i) => [
                (i - count) * g.imageStepUm,
                g.psf[indexAt(g, 0, i - count)] / peak,
              ]),
            },
          ]
        : [
            {
              name: "当前Airy剖面",
              color: "#648cac",
              points: profileX.map((x) => [x, diskIntensity(x / g.scaleUm)]),
            },
            {
              name: "550 nm、f/8参考",
              color: "#b78952",
              dashed: true,
              points: profileX.map((x) => [
                x,
                diskIntensity(x / REFERENCE_SCALE_UM),
              ]),
            },
          ];
      root.querySelector(".psf-chart").innerHTML = plot({
        curves: profiles,
        xMin: -HALF_FIELD_UM,
        xMax: HALF_FIELD_UM,
        xLabel: "像面位置 / μm · 图幅固定",
        yLabel: "强度 / 本次理想峰值",
        yMax: 1,
        title: "固定物理尺度下的归一化点像剖面",
        height: 300,
        width: 480,
        rightPadding: 40,
        topLabelY: 22,
        bottomLabelPadding: 10,
        topPadding: 48,
        bottomPadding: 56,
        markers: [{ value: point.probeUm, label: "黄色取样点" }],
        samples: aberrations ? [] : sampledProfile,
      });
      root.querySelector(".psf-legend").innerHTML =
        legend(profiles) + (aberrations ? "" : "<span>● 独立FFT样点</span>");
      root.querySelector(".wave-profile-note").textContent =
        "剖面按本次理想峰值归一，便于比较宽度；上方点像图保留共同白点。取样点移动只改变读数与标记，不改变光学系统。";
      const xmax = aberrations ? g.cutoff : 400;
      const curves = aberrations
        ? [
            {
              name: "MTF x",
              color: "#648cac",
              points: Array.from({ length: 129 }, (_, j) => [
                j * g.frequencyStep,
                Math.hypot(...otfAt(g, j)),
              ]),
            },
            {
              name: "Re H(x)",
              color: "#b78952",
              points: Array.from({ length: 129 }, (_, j) => [
                j * g.frequencyStep,
                otfAt(g, j)[0],
              ]),
            },
            {
              name: "Im H(x)",
              color: "#9b627a",
              dashed: true,
              points: Array.from({ length: 129 }, (_, j) => [
                j * g.frequencyStep,
                otfAt(g, j)[1],
              ]),
            },
            {
              name: "MTF y",
              color: "#6e8766",
              dashed: true,
              points: Array.from({ length: 129 }, (_, j) => [
                j * g.frequencyStep,
                Math.hypot(...otfAt(g, 0, j)),
              ]),
            },
          ]
        : [
            {
              name: "当前MTF",
              color: "#648cac",
              points: Array.from({ length: 201 }, (_, i) => [
                2 * i,
                circularOtf((2 * i) / g.cutoff),
              ]),
            },
            {
              name: "550 nm、f/8参考",
              color: "#b78952",
              dashed: true,
              points: Array.from({ length: 201 }, (_, i) => [
                2 * i,
                circularOtf((2 * i) / (1000 / REFERENCE_SCALE_UM)),
              ]),
            },
          ];
      const dots = Array.from({ length: 17 }, (_, i) => i * 8)
        .map((j) => [
          j * g.frequencyStep,
          Math.hypot(...directCorrelation(g, j)),
        ])
        .filter(([f]) => f <= xmax);
      root.querySelector(".otf-chart").innerHTML = plot({
        curves,
        xMax: xmax,
        xLabel: "像面空间频率 / lp/mm",
        yLabel: aberrations ? "OTF / MTF" : "纹理调制度保留率",
        yMin: aberrations ? -0.5 : 0,
        yMax: 1,
        title: "固定物理频率下的传递与独立参考",
        height: 310,
        width: 480,
        rightPadding: 40,
        topLabelY: 22,
        bottomLabelPadding: 10,
        topPadding: 48,
        bottomPadding: 56,
        samples: dots,
        markers: [{ value: point.frequency, label: "当前纹理" }],
      });
      root.querySelector(".otf-legend").innerHTML =
        legend(curves) + "<span>● 直接瞳相关的模</span>";
      const ratio = truth[0] ** 2 + truth[1] ** 2,
        pure = aberrations && !s.astigmatism && !s.coma && !s.spherical;
      root.querySelector(".truth-body").innerHTML =
        `<p>归一化前Parseval比=${fmt(g.parseval, 10)}；ΣhΔx²=${fmt(g.integral, 10)}；H(0)=${complex(otfAt(g, 0))}。</p><p>在数值网格频率${fmt(point.sampleRho * g.cutoff, 3)} lp/mm，PSF的FFT给${complex(point.sampled)}，直接瞳相关给${complex(point.direct)}，差${Math.hypot(point.sampled[0] - point.direct[0], point.sampled[1] - point.direct[1]).toExponential(1)}。</p><p>轴上S₀：离散${fmt(g.onAxisRatio)}，连续圆瞳积分${fmt(ratio)}${pure ? `，纯离焦sinc²解析值${fmt(defocusOnAxis(s.defocus))}` : ""}。</p><p>${aberrations ? `Maréchal小误差近似${fmt(Math.exp(-((2 * Math.PI * g.rms) ** 2)))}；S₀取固定原点，不替代偏移后的峰值搜索。` : `当前像点：条带完整和${complex(full)}，连续Airy振幅${fmt(diskAmplitude(q))}；OTF网格频率的圆盘重叠真值${fmt(circularOtf(point.sampleRho))}。`}</p><p>相量按采样瞳面积A归一，显示图按连续孔径或声明的FFT计算；瞳面积${fmt(g.area, 6)}，连续值π。128格瞳、4倍补零；补零不消除孔径离散误差。</p>`;
      Object.assign(root.querySelector(".lab").dataset, {
        onAxis: String(g.onAxisRatio),
        continuous: String(ratio),
        rms: String(g.rms),
        parseval: String(g.parseval),
        integral: String(g.integral),
        otfReal: String(h[0]),
        otfImag: String(h[1]),
        probeUm: String(point.probeUm),
        strips: String(point.strips),
      });
    },
    setup({ root, state, render }) {
      if (!aberrations && !Number.isFinite(state.sumProgress))
        state.sumProgress = 1;
      root.querySelector(".wave-display").addEventListener(
        "click",
        () => {
          state.enhanced = !enhanced;
          render();
        },
        { signal },
      );
      root.querySelector(".sum-slider")?.addEventListener(
        "input",
        (event) => {
          state.sumProgress = Number(event.target.value) / 32;
          render();
        },
        { signal },
      );
      render();
      return replay({
        root,
        state,
        render,
        element,
        signal,
        key: aberrations ? "defocus" : "sumProgress",
        start: aberrations ? -0.25 : 0,
        end: aberrations ? 0.25 : 1,
        label: aberrations ? "回放离焦扫描" : "播放条带相加",
        durationMs: 8000,
      });
    },
  });
}
