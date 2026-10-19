import { tone, shoulder } from "./model.js";
import { control, curve, grid, number } from "../common/lesson-view.js";
export const spec = {
  title: "高光压缩、显示变白和传感器裁切",
  alt: "互动示意：连续色调肩部、有限显示码与捕获裁切的分离",
  intro:
    "先固定捕获上限，再改变显示曝光和肩部起点。探针比较连续映射与有限位深；最高码不能唯一反解成场景值。",
  staticCaption: "捕获上限4，肩部起点0.6，显示曝光0档，10 bit线性显示码。",
  note: "非负标量亮度、全局C¹指数肩部，随后Gamma 2.2。它是教学色调映射，不是厂商Log、PQ、HLG或完整色貌模型。未加入色域变换、局部对比或传感器噪声；显示曝光不改变已捕获信号。",
  controls: [
    control("exposure", "显示曝光", -2, 3, 0.25, 0, "档", 2),
    control("knee", "肩部起点", 0.2, 0.8, 0.05, 0.6, "", 2),
    control("bits", "显示线性量化位深", 4, 12, 1, 10, " bit"),
    control("capacity", "捕获上限", 1, 8, 0.5, 4),
    control("probe", "场景探针", 0, 8, 0.1, 2, "", 1),
  ],
  presets: [
    {
      label: "保留高光层次",
      values: { exposure: 0, knee: 0.6, bits: 10, capacity: 8, probe: 2 },
    },
    {
      label: "捕获已经裁切",
      values: { exposure: -1, knee: 0.6, bits: 10, capacity: 2, probe: 6 },
    },
    {
      label: "有限码合并高光",
      values: { exposure: 2, knee: 0.6, bits: 4, capacity: 8, probe: 2 },
    },
  ],
  evaluate(s) {
    const m = tone(s);
    return {
      panels: [
        {
          title: "Gamma编码前的线性显示亮度",
          xMax: 8,
          xLabel: "场景线性输入",
          yLabel: "显示线性亮度 / 归一化",
          curves: [
            curve(
              "硬白点",
              grid(0, 8, (x) => Math.min(1, Math.min(x, s.capacity) * m.gain)),
              1,
            ),
            curve(
              "连续肩部",
              grid(0, 8, (x) => m.at(x).mapped),
            ),
            curve(
              "肩部后有限码",
              grid(0, 8, (x) => m.at(x).code / (2 ** s.bits - 1)),
              2,
            ),
          ],
          markers: [
            { value: s.capacity, label: "", color: "#777" },
            { value: s.probe, label: "", color: "#bb7946" },
          ],
        },
      ],
      stats: [
        ["捕获值", number(m.current.captured), "捕获白点之外已合并"],
        [
          "显示线性码",
          String(m.current.code),
          `共 ${2 ** s.bits} 码，Gamma后 ${number(m.current.encoded, 3)}`,
        ],
        ["反解场景值", number(m.current.decoded, 3), "最高码无有限唯一逆"],
      ],
      reading: `连续肩部在x≤${s.knee}时为恒等映射，其后单调趋近1；未量化时有显式逆。舍入到最高码的连续输入阈值为 ${number(m.whiteInput, 4)}，再与捕获上限 ${s.capacity} 比较。传感器裁切后调低显示曝光只能改变同一裁切值，不能恢复被合并的差别。`,
    };
  },
};
