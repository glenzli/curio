import { captureScene, WIDTH, HEIGHT } from "./model.js";
import { control, number } from "../common/lesson-view.js";
import { imagePanels } from "../common/image-view.js";
let key, cached;
const stages = ["场景", "RAW", "记录编码", "当前监看", "降低监看与真值对照"];
export const spec = {
  title: "捕获、记录与监看中的白点",
  alt: "互动示意：同一合成场景的捕获、记录、监看与未裁切真值对照",
  intro:
    "亮窗包含两种相近的亮度，灯斑的输入更高。把监看降三档，检查哪些细节仍在文件里，哪些早已合并成同一个值。",
  staticCaption:
    "32000 e⁻满阱，14 bit RAW，10 bit教学Log；EI 800基准、曝光不变、硬白点监看。",
  note: "固定48×32单色合成场景，EV相对基准1000 e⁻均值。复用EI监看链：先满阱裁切和14 bit RAW量化，再作可选的记录前数字增益、教学Log编码；该增益在RAW量化之后，不是ADC前模拟增益。忽略噪声、暗电流与颜色。监看可用硬白点或C¹肩部，最后Gamma 2.2；图像显示再取8 bit，读数保留显示量化前的线性值。真值图使用已知场景绕过裁切和量化，采用与“降低三档”相同的监看映射；这一路直接使用场景输入作对照。回放只突出处理步骤。",
  controls: [
    control("exposure", "实际曝光补偿", -2, 2, 0.5, 0, "档", 1),
    control("eiStops", "EI相对800", -2, 3, 1, 0, "档"),
    {
      ...control("metered", "曝光规则", 0, 1, 1, 0),
      format: (v) => (v ? "按EI少曝" : "固定实际曝光"),
    },
    {
      ...control("record", "EI增益的位置", 0, 1, 1, 0),
      format: (v) => (v ? "记录Log之前" : "记录之后监看"),
    },
    control("bits", "教学Log位深", 8, 12, 1, 10, " bit"),
    control("monitor", "额外监看补偿", -4, 2, 0.5, 0, "档", 1),
    {
      ...control("mapping", "显示高光处理", 0, 1, 1, 0),
      format: (v) => (v ? "连续肩部" : "硬白点"),
    },
    control("probeX", "探针横坐标", 0, 47, 1, 34),
    control("probeY", "探针纵坐标", 0, 31, 1, 12),
    {
      ...control("progress", "处理步骤", 0, 4, 0.01, 4),
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
      r = m.records[s.probeY * WIDTH + s.probeX],
      stage = Math.min(4, Math.floor(s.progress));
    const panel = (
      label,
      values,
      detail,
      scale,
      active = false,
      gamma = 2.2,
    ) => ({
      label,
      values,
      width: WIDTH,
      height: HEIGHT,
      detail,
      scale,
      active,
      gamma,
      probe: [s.probeX, s.probeY],
    });
    return {
      figureHeight: 720,
      ...imagePanels(
        [
          panel(
            "1 场景EV标尺",
            m.evMap,
            "按已知场景值画图，不是监看照片",
            "固定 −5…+8 EV 灰阶；显示指数1",
            stage === 0,
            1,
          ),
          panel(
            "2 RAW码值图",
            m.raw,
            "RAW / 16383；标尺固定",
            "与记录Log之前的增益分开",
            stage === 1,
          ),
          panel(
            "3 文件Log码值图",
            m.file,
            `${s.bits} bit码归一；未经Log解码`,
            `码值图不是正确监看；显示指数1`,
            stage === 2,
            1,
          ),
          panel(
            "4 当前监看",
            m.monitor,
            `${s.mapping ? "连续肩部" : "硬白点"}；额外补偿 ${number(s.monitor, 1)} 档`,
            "线性0…1；Gamma 2.2",
            stage === 3,
          ),
          panel(
            "5 同一文件，监看降三档",
            m.lower,
            "文件码不变，只改变显示输入",
            "线性0…1；Gamma 2.2",
            stage === 4,
          ),
          panel(
            "6 未裁切、无量化的真值参考",
            m.truth,
            "与图5使用相同监看设置",
            "已知输入计算，未从RAW或Log反推",
            stage === 4,
          ),
        ],
        { title: "捕获、记录与监看在同一场景中的分离", tileHeight: 240 },
      ),
      stats: [
        [
          "探针场景 / 实际电子均值",
          `${number(r.ev, 2)} EV / ${number(r.mu, 1)} e⁻`,
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
      reading: `全图${WIDTH * HEIGHT}格：传感器达到满阱${m.counts.sensorClipped}，记录输入达到白点${m.counts.recordClipped}，文件舍入到最高码${m.counts.fileWhite}，当前硬监看阈值以上${m.counts.monitorClipped}。肩部模式也保留这个硬白点阈值计数。物理满阱阈值为场景${number(m.sensorThresholdEV, 2)} EV；捕获与记录均未裁切的连续上限为${number(m.fileThresholdEV, 2)} EV，最高有限码的区间另受舍入影响。图5与图6的差异包含裁切和有限编码，不把真值参考称为可恢复数据。`,
    };
  },
};
