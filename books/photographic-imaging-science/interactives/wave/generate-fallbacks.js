import { writeFile } from "node:fs/promises";
import {
  propagate,
  indexAt,
  wavefront,
  circularOtf,
  polarAmplitude,
} from "./model.js";
import { diskIntensity } from "./circle-reference.js";
import { readingPoint, REFERENCE_PEAK, HALF_FIELD_UM } from "./reading.js";
import { phasors, overlap, crosshair } from "./figures.js";
import { imagePanels, raster, rasterRgb } from "../common/image-view.js";
import { fallback } from "../common/lesson-view.js";
const body = (svg) => svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
const complex = (z) =>
  `${z[0].toFixed(6)} ${z[1] < 0 ? "−" : "+"} ${Math.abs(z[1]).toFixed(6)}i`;
for (const [folder, p, alt] of [
  ["pupil", {}, "复瞳、复振幅、PSF 和 OTF 的计算关系及圆瞳真值对照"],
  [
    "wavefront",
    { coma: 0.12 },
    "归一化波前模式经复瞳传播后的 PSF、复 OTF 与独立对照",
  ],
]) {
  const aberrations = folder === "wavefront",
    g = propagate({ ...p, diameter: 128 }),
    s = { probeUm: 4.4, frequencyLpMm: 60, sumProgress: 1, rho: 0.5 },
    point = readingPoint(g, s, aberrations);
  let pupil;
  if (!aberrations) {
    const r = (point.diameterMm / 30) * 120;
    pupil = `<rect width="240" height="240" fill="#10171c"/><circle cx="120" cy="120" r="${r}" fill="#35bac0"/><path d="M${120 - r} 207H${120 + r}" stroke="#d3dee4"/><text x="120" y="230" style="fill:#d3dee4" text-anchor="middle" font-size="12">D=${point.diameterMm.toFixed(2)} mm</text>`;
  } else {
    const n = 192,
      colors = new Float64Array(n * n * 3);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const phase =
            2 *
              Math.PI *
              wavefront(
                ((x - (n - 1) / 2) * 2) / (n - 1),
                (((n - 1) / 2 - y) * 2) / (n - 1),
                g.p,
              ) +
            Math.PI,
          k = (y * n + x) * 3;
        for (let c = 0; c < 3; c++)
          colors[k + c] =
            (140 + 105 * Math.cos(phase - (c * 2 * Math.PI) / 3)) / 255;
      }
    pupil = `<defs><clipPath id="pupil-contour"><circle cx="120" cy="120" r="106"/></clipPath></defs><rect width="240" height="240" fill="#10171c"/><g clip-path="url(#pupil-contour)">${rasterRgb(colors, n, n, { size: 212, x: 14, y: 14, gamma: 1 })}</g>`;
  }
  const n = 161,
    values = Float64Array.from({ length: n * n }, (_, k) => {
      const ux = (((k % n) + 0.5) / n - 0.5) * 2 * HALF_FIELD_UM,
        uy = ((Math.floor(k / n) + 0.5) / n - 0.5) * 2 * HALF_FIELD_UM;
      let value;
      if (!aberrations)
        value =
          (Math.PI / (4 * g.scaleUm ** 2)) *
          diskIntensity(Math.hypot(ux, uy) / g.scaleUm);
      else {
        const i = ux / g.imageStepUm,
          j = uy / g.imageStepUm,
          a = Math.floor(i),
          b = Math.floor(j),
          u = i - a,
          v = j - b;
        value =
          (1 - u) * (1 - v) * g.psf[indexAt(g, a, b)] +
          u * (1 - v) * g.psf[indexAt(g, a + 1, b)] +
          (1 - u) * v * g.psf[indexAt(g, a, b + 1)] +
          u * v * g.psf[indexAt(g, a + 1, b + 1)];
      }
      return Math.log1p((1000 * value) / REFERENCE_PEAK) / Math.log(1001);
    });
  const images = imagePanels(
    [
      {
        label: aberrations ? "1 连续圆瞳相位" : "1 圆孔 · 固定毫米尺度",
        vector: pupil,
        width: 240,
        height: 240,
        scale: aberrations
          ? "连续轮廓；相位由同一波前函数给出"
          : "焦距50 mm、f/8；图宽30 mm",
      },
      {
        label: "2 一个像点的复振幅",
        vector: body(phasors(point)),
        width: 260,
        height: 260,
        scale: "32条带完整相加；坐标为U/A",
      },
      {
        label: "3 点像 · 固定微米尺度",
        vector:
          raster(values, n, n, { size: 260, gamma: 1 }) +
          body(crosshair(point)),
        width: 260,
        height: 260,
        scale: "图宽48 μm；黄色十字x=4.4 μm",
      },
      {
        label: "4 选定频率的OTF",
        vector: body(overlap(point.rho, aberrations, point.h)),
        width: 260,
        height: 260,
        scale: `频率${point.frequency.toFixed(1)} lp/mm；MTF=${Math.hypot(...point.h).toFixed(4)}`,
      },
    ],
    { title: "固定物理尺度下的孔径、相量、点像和传递", tileHeight: 330 },
  );
  const svg = fallback({
    title: aberrations
      ? "彗差波前与衍射点像 · 0.12 λ RMS"
      : "从圆孔到一个像点，再到纹理传递",
    alt: "互动示意：" + alt,
    staticCaption: aberrations
      ? "550 nm、f/8；相位图按瞳半径归一，点像固定48 μm窗口，条带在同一像点求和。"
      : "550 nm、f/8；孔径固定毫米尺度，点像固定48 μm窗口，条带在同一像点求和。",
    controls: [],
    evaluate() {
      return {
        ...images,
        figureHeight: 660,
        staticRows: [
          `Parseval比 ${g.parseval.toFixed(10)}；轴上S₀ ${g.onAxisRatio.toFixed(5)}；连续积分S₀ ${polarAmplitude(
            p,
          )
            .reduce((sum, v) => sum + v * v, 0)
            .toFixed(5)}。`,
          `网格频率${(point.sampleRho * g.cutoff).toFixed(3)} lp/mm：PSF Fourier OTF = ${complex(point.sampled)}。`,
          `同一频率直接瞳相关 = ${complex(point.direct)}。`,
        ],
        stats: [
          [
            "第一暗环参考",
            `${point.airyRadiusUm.toFixed(3)} μm`,
            "无像差圆孔1.21967 λN",
          ],
          ["截止频率", `${g.cutoff.toFixed(2)} lp/mm`, "物理频率刻度"],
          ["离散能量积分", g.integral.toFixed(8), "128格瞳，4倍补零"],
        ],
        reading: aberrations
          ? "颜色表示连续圆瞳相位，点像由同一复瞳FFT传播。固定原点S₀=" +
            g.onAxisRatio.toFixed(4) +
            "。PSF为强度；OTF保留实部和虚部，并与直接瞳相关核对。"
          : "孔径缩小会使同一微米窗口中的点像展开。中心各瞳带同相相加；第一暗环附近的贡献互相抵消。灰度图使用共同白点与固定暗环增强；OTF圆盘重叠和FFT样点另行核对。",
      };
    },
  });
  await writeFile(
    new URL(`../${folder}/fallback.svg`, import.meta.url),
    svg + "\n",
  );
}
