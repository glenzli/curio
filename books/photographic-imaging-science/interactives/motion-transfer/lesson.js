import { control, curve, number } from "../common/lesson-view.js";
import { imagePanels } from "../common/image-view.js";
import { memoOne } from "../common/field-view.js";
import {
  motionTransfer,
  motionExposure,
  position,
  MODES,
  WIDTH,
  HEIGHT,
} from "./model.js";
const complete = memoOne(
  (s) => motionTransfer({ ...s, progress: 1 }),
  ["mode", "rms", "offset"],
);
export const spec = {
  title: "从残余轨迹到运动点像",
  alt: "互动示意：曝光内轨迹、运动PSF、图像积分与复OTF",
  intro:
    "让一个点在曝光期间沿指定轨迹移动。它在哪里停留得久，点像就在相应位置积累更多能量；下方同时显示一幅纹理的曝光结果。",
  staticCaption:
    "匀速轨迹，中心化RMS 2 px，256个等时样本；两处停留预设保留相同RMS。",
  note: "一维横向像移、局部平移不变模型；输入是三个已知二维正弦的连续周期场景。运动OTF由等时相量平均得到；匀速和两处停留另有sinc与cos解析式，正弦往返另用8192点角积分。点像图按0.5 px分箱，传递计算不使用该直方图。播放按完整曝光刻度积累，未包含光学、像素孔径、颜色和噪声。",
  controls: [
    { ...control("mode", "曝光内运动", 0, 3, 1, 1), format: (v) => MODES[v] },
    control("rms", "中心化 RMS 参数", 0, 4, 0.1, 2, " px", 1),
    control("offset", "平均位置偏移", -4, 4, 0.25, 0, " px", 2),
    control("progress", "曝光进度", 0, 1, "any", 1, "", 3),
  ],
  presets: [
    {
      label: "同样RMS · 匀速",
      values: { mode: 1, rms: 2, offset: 0, progress: 1 },
    },
    {
      label: "同样RMS · 两处停留",
      values: { mode: 2, rms: 2, offset: 0, progress: 1 },
    },
    { label: "正弦往返", values: { mode: 3, rms: 2, offset: 0, progress: 1 } },
    { label: "只有位置偏移", values: { mode: 0, offset: 3, progress: 1 } },
    { label: "完全不动", values: { mode: 0, offset: 0, progress: 1 } },
  ],
  replay: {
    key: "progress",
    start: 0,
    end: 1,
    durationMs: 7000,
    label: "逐段积累曝光",
    startOnFirstPlay: true,
  },
  evaluate(s) {
    const full = complete(s),
      m = motionExposure(s),
      hist = new Float64Array(81 * 41),
      point = hist.slice();
    point[20 * 81 + 40] = 1;
    for (let i = 0; i < Math.round(256 * s.progress); i++) {
      const x = Math.round(position(m.p, (i + 0.5) / 256) / 0.5) + 40;
      if (x >= 0 && x < 81) hist[20 * 81 + x] += 1 / 256;
    }
    const images = imagePanels(
      [
        {
          label: "1 连续场景的已知输入",
          values: m.truth,
          width: WIDTH,
          height: HEIGHT,
          scale: "线性0…1；固定Gamma 2.2",
        },
        {
          label: "2 当前曝光积累",
          values: m.image,
          width: WIDTH,
          height: HEIGHT,
          detail: `已积累${number(100 * m.fraction, 1)}%曝光`,
          scale: "与输入采用同一白点",
        },
        {
          label: "3 运动点像 · 0.5 px分箱",
          values: hist,
          width: 81,
          height: 41,
          scale: "分箱质量0…1；y方向无运动",
        },
        {
          label: "4 不动点参考",
          values: point,
          width: 81,
          height: 41,
          scale: "同一分箱与白点",
        },
      ],
      { title: "运动轨迹形成点像与纹理模糊", tileHeight: 225 },
    );
    return {
      ...images,
      figureHeight: 450,
      panels: [
        {
          title: "完整曝光内的位置",
          curves: [curve("轨迹", full.series, 1)],
          markers: [{ value: s.progress, label: "当前" }],
          xMin: 0,
          xMax: 1,
          yMin: -12,
          yMax: 12,
          xLabel: "曝光时间 / T",
          yLabel: "横向像移 / px",
        },
        {
          title: "完整曝光的OTF与MTF",
          curves: [
            curve(
              "OTF实部",
              full.frequencies.map((v) => [v[0], v[1].re]),
            ),
            curve(
              "OTF虚部",
              full.frequencies.map((v) => [v[0], v[1].im]),
              2,
            ),
            curve(
              "MTF",
              full.frequencies.map((v) => [v[0], v[1].mtf]),
              1,
            ),
            curve(
              "独立参考MTF",
              full.frequencies.map((v) => [v[0], v[2].mtf]),
              3,
              true,
            ),
          ],
          xMin: 0,
          xMax: 0.5,
          yMin: -1.05,
          yMax: 1.05,
          xLabel: "空间频率 / cycles per pixel",
          yLabel: "归一化传递",
        },
      ],
      stats: [
        ["完整曝光均值", number(full.mean, 3) + " px", "固定偏移只改变位置"],
        [
          "中心化轨迹 RMS",
          number(full.centeredRms, 4) + " px",
          `已知值${number(full.targetRms, 4)} px`,
        ],
        ["当前点像总质量", number(m.fraction, 3), "完整曝光时为1"],
      ],
      reading:
        "先比较相同RMS的匀速与两处停留：0.125 cycles/pixel处，两处停留的响应为零，匀速轨迹仍有响应。再只加固定偏移，观察OTF相位变化而MTF保持。点像与曲线都来自同一时间权重。",
    };
  },
};
