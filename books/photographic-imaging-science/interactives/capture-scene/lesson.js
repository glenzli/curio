import { captureScene, WIDTH, HEIGHT, probePixel } from "./model.js";
import { control, number } from "../common/lesson-view.js";
import { scenePanels } from "./figures.js";
let key, cached;
const stages = ["场景", "RAW", "记录编码", "当前监看", "降低监看与真值对照"];
export const spec = {
  title: "捕获、记录与监看中的白点",
  alt: "互动示意：同一合成场景的捕获、记录、监看与未裁切真值对照",
  intro:
    "窗外的枝叶和帘褶保留了细微的明暗差，杯沿高光更亮。把监看降三档，观察窗外细节能否重新显现，再与已知输入对照。",
  staticCaption:
    "32000 e⁻满阱，14 bit RAW，10 bit教学Log；EI 800基准、曝光不变、硬白点监看。",
  note: "固定288×192单色合成静物，各处EV由几何图案指定，相对基准1000 e⁻均值。复用EI监看链：先满阱裁切和14 bit RAW量化，再作可选的记录前数字增益、教学Log编码；该增益位于RAW量化之后。忽略噪声、暗电流与颜色。监看可用硬白点或C¹肩部，最后Gamma 2.2；场景EV图和Log码值图按显示指数1绘制。各图均以原始采样生成8 bit灰阶，读数保留显示量化前的线性值。真值图跳过捕获与记录的裁切、量化，采用与“降低三档”相同的监看映射。回放突出处理步骤。",
  controls: [
    control("exposure", "实际曝光补偿", -2, 2, 0.5, 0, "档", 1),
    control("eiStops", "EI相对800", -2, 3, 1, 0, "档"),
    {
      ...control("metered", "曝光规则", 0, 1, 1, 0),
      format: (v) => (v ? "按EI少曝" : "固定实际曝光"),
      hint: (s) =>
        s.eiStops === 0
          ? "当前EI 800，两种规则曝光相同；改变EI后再比较。"
          : "按EI少曝会改变捕获电子数；固定实际曝光则保持收光不变。",
    },
    {
      ...control("record", "EI增益的位置", 0, 1, 1, 0),
      format: (v) => (v ? "记录Log之前" : "记录之后监看"),
      hint: (s) =>
        s.eiStops === 0
          ? "当前EI增益为1×，前后位置结果相同；可选“亮窗在记录时合并”比较。"
          : "对照文件Log码与降低监看后的亮区，检查细节是在记录时丢失，还是只在显示时变白。",
    },
    control("bits", "教学Log位深", 8, 12, 1, 10, " bit"),
    control("monitor", "额外监看补偿", -4, 2, 0.5, 0, "档", 1),
    {
      ...control("mapping", "显示高光处理", 0, 1, 1, 0),
      format: (v) => (v ? "连续肩部" : "硬白点"),
    },
    {
      ...control("probeX", "探针横向位置", 0, 47, 1, 34),
      format: (v) => `${number(((v + 0.5) / 48) * 100, 0)}%`,
    },
    {
      ...control("probeY", "探针纵向位置", 0, 31, 1, 12),
      format: (v) => `${number(((v + 0.5) / 32) * 100, 0)}%`,
    },
    {
      ...control("progress", "高亮查看环节", 0, 4, 1, 4),
      discrete: true,
      hint: "只切换处理环节的高亮；六幅图始终保留完整结果。",
      format: (v) => stages[Math.min(4, Math.floor(v))],
    },
  ],
  presets: [
    {
      label: "亮窗只在监看变白",
      values: {
        exposure: 0,
        eiStops: 0,
        metered: 0,
        record: 0,
        monitor: 0,
        mapping: 0,
      },
    },
    {
      label: "亮窗在记录时合并",
      values: {
        exposure: 0,
        eiStops: 3,
        metered: 0,
        record: 1,
        monitor: -3,
        mapping: 0,
      },
    },
    {
      label: "实际曝光已过量",
      values: {
        exposure: 2,
        eiStops: 0,
        metered: 0,
        record: 0,
        monitor: -2,
        mapping: 0,
      },
    },
    {
      label: "用肩部保留层次",
      values: {
        exposure: 0,
        eiStops: 0,
        metered: 0,
        record: 0,
        monitor: 0,
        mapping: 1,
      },
    },
  ],
  replay: {
    key: "progress",
    start: 0,
    end: 4,
    startOnFirstPlay: true,
    label: "查看处理顺序",
    durationMs: 8000,
  },
  evaluate(s) {
    const next = JSON.stringify([
      s.exposure,
      s.eiStops,
      s.bits,
      s.metered,
      s.record,
      s.mapping,
      s.monitor,
    ]);
    if (key !== next) {
      cached = captureScene(s);
      key = next;
    }
    const m = cached,
      [px, py] = probePixel(s.probeX, s.probeY),
      r = m.records[py * WIDTH + px];
    return {
      ...scenePanels(m, s),
      stats: [
        [
          "探针场景 / 实际电子均值",
          `${number(r.ev, 2)} EV\n${number(r.mu, 1)} e⁻`,
          `实际曝光比例 ${number(m.exposureRatio, 3)}`,
        ],
        [
          "RAW / 文件Log",
          `${r.rawCode} / ${r.logCode}`,
          "两种码各有自己的满码",
        ],
        [
          "降低监看：文件 / 真值",
          `${number(r.lowerLinear, 5)} / ${number(r.truthLowerLinear, 5)}`,
          "相同线性显示尺度",
        ],
      ],
      reading: `全图${WIDTH * HEIGHT}个样本：传感器达到满阱${m.counts.sensorClipped}，记录输入达到白点${m.counts.recordClipped}，文件舍入到最高码${m.counts.fileWhite}，当前硬监看阈值以上${m.counts.monitorClipped}。肩部模式也保留这个硬白点阈值计数。物理满阱阈值为场景${number(m.sensorThresholdEV, 2)} EV；捕获与记录均未裁切的连续上限为${number(m.fileThresholdEV, 2)} EV，最高有限码的区间另受舍入影响。图5与图6的差异来自裁切和有限编码；真值参考直接来自已知输入。`,
    };
  },
};
