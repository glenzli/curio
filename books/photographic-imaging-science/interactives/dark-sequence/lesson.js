import { control, curve, number } from "../common/lesson-view.js";
import { imagePanels } from "../common/image-view.js";
import { signedColors, memoOne } from "../common/field-view.js";
import {
  captureDarkFrames,
  darkSequence,
  probeBudget,
  HOT,
  WIDTH,
  HEIGHT,
} from "./model.js";
const capture = memoOne(captureDarkFrames, [
  "exposure",
  "dark",
  "read",
  "seed",
]);
export const spec = {
  title: "逐帧平均与同一张主暗场",
  alt: "互动示意：热像素、独立目标曝光、有限主暗场和已知暗均值对照",
  intro:
    "先拍一组暗场，再将同一张平均暗场用于越来越多的目标帧。普通像素和热像素可以分别查看，目标噪声与固定的校准残差也分别读数。",
  staticCaption:
    "10 s曝光，普通暗电流0.1 e⁻/s，读噪3 e⁻；16张主暗场，8张目标帧。标记热像素的暗电流为80倍。",
  note: "64×40指定信号率与固定暗电流图；目标计数、暗计数为Poisson，读出为独立Gaussian。预生成64张目标与暗场的独立采集，改变N/M只选相同前缀。热像素倍率是本例输入。重复整套采集的方差包含主暗场项；固定一次主暗场时，它的误差是条件偏差。图像除以曝光时长显示电子率；无饱和与量化。",
  controls: [
    control("exposure", "曝光时长", 1, 120, 1, 10, " s"),
    control("dark", "普通像素暗电流率", 0, 0.3, 0.01, 0.1, " e⁻/s", 2),
    control("read", "单次读噪", 0, 6, 0.25, 3, " e⁻", 2),
    control("frames", "目标帧数 N", 1, 64, 1, 8),
    control("masters", "主暗场张数 M", 1, 64, 1, 16),
    {
      ...control("probe", "查看像素", 0, 1, 1, 1),
      format: (v) => (v ? "标记热像素" : "普通像素"),
    },
    control("seed", "采集种子", 1, 999, 1, 31),
  ],
  presets: [
    { label: "一张暗场", values: { masters: 1 } },
    { label: "平均64张暗场", values: { masters: 64 } },
    { label: "继续平均目标", values: { frames: 64 } },
    { label: "查看普通像素", values: { probe: 0 } },
    { label: "重拍整套采集", values: (s) => ({ seed: (s.seed % 999) + 1 }) },
  ],
  replay: {
    key: "frames",
    start: 1,
    end: 64,
    durationMs: 10000,
    label: "依次加入目标帧",
    startOnFirstPlay: true,
  },
  evaluate(s) {
    const n = Math.round(s.frames),
      data = capture(s),
      m = darkSequence(data, n, s.masters),
      i = s.probe ? HOT : 20 * WIDTH + 32,
      b = probeBudget(data, i, n, s.masters),
      rate = (v) => Float64Array.from(v, (x) => x / s.exposure),
      point = [i % WIDTH, Math.floor(i / WIDTH)];
    const masterError = Float64Array.from(
      m.master,
      (v, k) => (v - data.dark[k]) / s.exposure,
    );
    const images = imagePanels(
      [
        {
          label: "1 目标帧平均",
          values: rate(m.raw),
          width: WIDTH,
          height: HEIGHT,
          probe: point,
          scale: "电子率0…24 e⁻/s；Gamma 2.2",
          white: 24,
        },
        {
          label: "2 固定的主暗场",
          values: rate(m.master),
          width: WIDTH,
          height: HEIGHT,
          probe: point,
          scale: "同一电子率刻度",
          white: 24,
        },
        {
          label: "3 减去有限主暗场",
          values: rate(m.corrected),
          width: WIDTH,
          height: HEIGHT,
          probe: point,
          scale: "保留当前目标计数的涨落",
          white: 24,
        },
        {
          label: "4 减去已知暗均值",
          values: rate(m.oracle),
          width: WIDTH,
          height: HEIGHT,
          probe: point,
          scale: "与图3使用同一批目标帧",
          white: 24,
        },
        {
          label: "5 主暗场的固定误差",
          values: signedColors(masterError, 2),
          width: WIDTH,
          height: HEIGHT,
          rgb: true,
          gamma: 1,
          probe: point,
          scale: "蓝负、橙正；固定±2 e⁻/s",
        },
        {
          label: "6 已知信号率",
          values: rate(data.signal),
          width: WIDTH,
          height: HEIGHT,
          probe: point,
          scale: "评价参考；不用于观测校准",
          white: 24,
        },
      ],
      { title: "同一主暗场的校准与真实信号", tileHeight: 225 },
    );
    const points = Array.from({ length: 64 }, (_, j) => {
      const b = probeBudget(data, i, j + 1, s.masters);
      return [j + 1, b];
    });
    return {
      ...images,
      figureHeight: 675,
      panels: [
        {
          title: "重新拍完整套采集时的误差预算",
          curves: [
            curve(
              "目标平均项",
              points.map(([n, b]) => [n, Math.sqrt(b.target) / s.exposure]),
            ),
            curve(
              "共享主暗场项",
              points.map(([n, b]) => [n, Math.sqrt(b.master) / s.exposure]),
              2,
              true,
            ),
            curve(
              "两项合成",
              points.map(([n, b]) => [n, Math.sqrt(b.total) / s.exposure]),
              1,
            ),
          ],
          markers: [{ value: n, label: "当前N" }],
          xMin: 1,
          xMax: 64,
          yMin: 0,
          yMax: Math.max(0.1, Math.sqrt(points[0][1].total) / s.exposure) * 1.1,
          xLabel: "目标帧数 N",
          yLabel: "RMS / e⁻每秒",
        },
      ],
      stats: [
        [
          "当前校准偏差",
          number((data.dark[i] - m.master[i]) / s.exposure, 3) + " e⁻/s",
          "固定此主暗场后不随N下降",
        ],
        [
          "重复采集的总 RMS",
          number(Math.sqrt(b.total) / s.exposure, 3) + " e⁻/s",
          "把目标和暗场都看作随机",
        ],
        [
          "已知暗电流率",
          number(data.dark[i] / s.exposure, 2) + " e⁻/s",
          s.probe ? "标记热像素" : "普通像素",
        ],
      ],
      reading: `图3与图4之差始终等于“已知暗均值−当前主暗场”，当前探针为${number(data.dark[i] - m.master[i], 4)} e⁻。目标帧继续增加会降低独立噪声；主暗场项的方差仍为${number(b.master, 4)} (e⁻)²。换N或M不重新生成已有观测。`,
    };
  },
};
