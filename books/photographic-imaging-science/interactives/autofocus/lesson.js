import {
  control,
  curve,
  chart,
  number,
  escape,
} from "../common/lesson-view.js";
import { memoOne } from "../common/field-view.js";
import { autofocus, geometry, WIDTH } from "./model.js";
const acquire = memoOne(autofocus, ["start", "noise", "gain", "kind", "seed"]);
function trace(panels) {
  const contents = panels
    .map(
      (p, i) =>
        `<text x="18" y="${i * 340 + 28}" font-size="18">${escape(p.title)}</text>${chart({ ...p, width: 740, height: 286 }).replace("<svg ", `<svg x="0" y="${i * 340 + 38}" width="740" height="286" `)}`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 740 ${panels.length * 340}" role="img" aria-label="分瞳图像、观测相关峰和对比度扫描" style="font-size:14px">${contents}</svg>`;
}
export const spec = {
  title: "自动对焦：从分瞳图像到镜组动作",
  alt: "互动示意：分瞳相位差对焦、镜组闭环移动和对比度扫描的独立对照",
  intro:
    "A、B两幅分瞳图像的错位用于估计对焦偏差。回放显示镜组调整过程，最后一图保留完整位置轨迹；改变校正比例可比较收敛与振荡，竖线标出当前步骤。",
  staticCaption:
    "薄透镜f=50 mm、物距550 mm、像距55 mm；镜组初始偏移+0.20 mm。A、B为一维半瞳积分，观测噪声RMS 0.005。",
  note: "局部一维近轴模型：半瞳均为宽5 mm的均匀条带，像素间距4 μm；固定纹理尺度、无像素孔径积分；A、B各按半瞳通量归一，合并图像取(A+B)/2。相关器只读取两幅含噪观测，搜索±8 px；镜组更新使用焦点附近标定斜率22.5 px/mm。已知薄透镜焦点仅作核对。三维支架展示位置指令，驱动机构的动态响应见18.6；对比度扫描使用独立的33次位置采样。停止后冻结该次观测，恢复实验时暂停。",
  scaleNote:
    "镜组轴向位移放大40倍；支架和传感器分瞳标记用于说明连接关系，光线几何由下方公式与曲线核对。",
  legend: [
    ["A半瞳", "#2b82ac"],
    ["B半瞳", "#c1894d"],
    ["已知焦点位置", "#329383"],
  ],
  camera: [55, 28, 48],
  target: [6, 0, 0],
  distance: [30, 120],
  playLabel: "播放对焦调整",
  replay: { key: "step", start: 0, end: 8, seconds: 12, restartOnHalt: true },
  controls: [
    control("start", "镜组初始偏移", -0.3, 0.3, 0.01, 0.2, " mm", 2),
    control("noise", "单幅观测噪声RMS", 0, 0.05, 0.005, 0.005, "", 3),
    {
      ...control("gain", "每次校正比例", 0.2, 1.8, 0.1, 0.8, "", 1),
      hint: "改变下次位置指令与轨迹预览；第0步的初始观测本身不变。",
    },
    {
      ...control("kind", "目标纹理", 0, 2, 1, 0),
      format: (v) => ["多频纹理", "均匀目标", "重复条纹"][v],
      options: [
        { value: 0, label: "多频纹理" },
        { value: 1, label: "均匀目标" },
        { value: 2, label: "重复条纹" },
      ],
    },
    {
      ...control("seed", "观测种子", 1, 999, 1, 41),
      discrete: true, numeric: { step: 1 },
    },
    {
      ...control("step", "调整步骤", 0, 8, 0.01, 0, "", 2),
      discrete: true,
      options: [
        { value: 0, label: "第0步 · 初始观测" },
        { value: 1, label: "第1步 · 校正后观测" },
        { value: 2, label: "第2步 · 校正后观测" },
        { value: 3, label: "第3步 · 校正后观测" },
        { value: 4, label: "第4步 · 校正后观测" },
        { value: 5, label: "第5步 · 校正后观测" },
        { value: 6, label: "第6步 · 校正后观测" },
        { value: 7, label: "第7步 · 校正后观测" },
        { value: 8, label: "第8步 · 校正后观测" },
      ],
    },
  ],
  presets: [
    {
      label: "从焦点后侧开始",
      values: { start: 0.2, kind: 0, noise: 0.005, gain: 0.8, step: 0 },
    },
    { label: "从另一侧开始", values: { start: -0.2, kind: 0, step: 0 } },
    { label: "均匀目标", values: { kind: 1, noise: 0, step: 0 } },
    { label: "重复条纹", values: { kind: 2, noise: 0, step: 0 } },
    {
      label: "校正过大来回摆动",
      values: { start: 0.2, kind: 0, gain: 1.7, noise: 0, step: 0 },
    },
  ],
  evaluate(s) {
    const a = acquire(s),
      k = Math.min(8, Math.floor(s.step)),
      current = a.history[k],
      next = a.history[Math.min(8, k + 1)],
      group = current.group + (next.group - current.group) * (s.step - k),
      m = { ...a, current, group };
    const panels = [
      {
        title: "1 A（蓝）与B（橙）：本次实际观测",
        curves: [
          curve(
            "A",
            Array.from(current.observations.left, (v, i) => [i, v]),
          ),
          curve(
            "B",
            Array.from(current.observations.right, (v, i) => [i, v]),
            1,
          ),
        ],
        xMin: 0,
        xMax: WIDTH - 1,
        yMin: -0.05,
        yMax: 1.05,
        xLabel: "图像位置 / px",
        yLabel: "线性信号",
      },
      {
        title: "2 只用观测图像寻找相关峰",
        curves: [
          curve(
            "相关系数",
            current.estimate.scores.map((v) => [v.shift, v.score]),
          ),
        ],
        markers: current.estimate.valid
          ? [{ value: current.estimate.shift, label: "观测偏移" }]
          : [],
        xMin: -8,
        xMax: 8,
        yMin: -1,
        yMax: 1,
        xLabel: "B图像的取样偏移 / px",
        yLabel: "归一化相关",
      },
      {
        title: "3 独立扫描：观测方差（蓝）与无噪积分（橙虚线）",
        curves: [
          curve(
            "观测方差",
            a.contrast.map((v) => [v.group, v.observed]),
          ),
          curve(
            "无噪积分真值",
            a.contrast.map((v) => [v.group, v.expected]),
            1,
            true,
          ),
        ],
        markers: [{ value: 0, label: "已知焦点", color: "#329383" }],
        samples: a.contrastPeak === null ? [] : [
          [a.contrastPeak, Math.max(...a.contrast.map((v) => v.observed))],
        ],
        xMin: -0.3,
        xMax: 0.3,
        yMin: 0,
        yMax: Math.max(0.06, ...a.contrast.map((v) => v.observed)) * 1.1,
        xLabel: "镜组偏移 / mm",
        yLabel: "A、B合并图像的方差",
      },
      {
        title: "4 完整位置轨迹与当前步骤",
        curves: [
          curve(
            "本次模拟的位置指令",
            a.history.map((h, i) => [i, h.group]),
          ),
          curve(
            "已知焦点（只作对照）",
            [
              [0, 0],
              [8, 0],
            ],
            2,
            true,
          ),
        ],
        xMin: 0,
        xMax: 8,
        yMin: -0.32,
        yMax: 0.32,
        xLabel: "校正步骤 · 竖线为当前回放位置",
        yLabel: "镜组偏移 / mm",
        markers: [{ value: s.step, label: "当前步骤" }],
      },
    ];
    return {
      model: m,
      figure: trace(panels),
      liveFigure: `<style>.focus-trace-hint{display:none}@media(max-width:550px){.focus-trace-hint{display:block;font-size:11px;opacity:.7}}</style><small class="focus-trace-hint">曲线可左右滑动查看</small>${trace(panels)}`,
      figureHeight: 1360,
      halt: current.stopped,
      status: current.stopped
        ? `第${current.iteration}步：${current.reason}。`
        : `第${current.iteration}步：用观测偏移更新镜组，绿色标记保留已知焦点。`,
      stats: [
        [
          "当前观测偏移",
          current.estimate.valid
            ? number(current.estimate.shift, 3) + " px"
            : "停止调整",
          current.estimate.reason,
        ],
        [
          "生成模型的偏移",
          number(current.truth.disparity, 3) + " px",
          "只用于核对，不送给相关器",
        ],
        ["当前镜组位置", number(group, 4) + " mm", "动画在相邻位置指令间插值"],
        [
          "观测扫描最大位置",
          a.contrastPeak === null ? "没有可区分的最大位置" : number(a.contrastPeak, 4) + " mm",
          "独立扫描；已知焦点0 mm仅作对照",
        ],
        ["标定斜率", "22.5 px/mm", "焦点附近的位移关系"],
        [
          "图像采集次数",
          String(
            Math.min(
              current.iteration,
              a.history.find((h) => h.stopped)?.iteration ?? 8,
            ) + 1,
          ),
          "停止后不生成新观测",
        ],
      ],
      reading: `半瞳图像的有符号偏移决定校正方向。当前生成偏移为${number(geometry(group).disparity, 3)} px；相关峰不唯一时保留镜组位置。${a.contrastPeak === null ? "当前对比度扫描为常数，没有可识别的最佳焦位；未把任一端点当成焦点。" : s.kind === 1 ? "均匀目标没有焦位信息；带噪方差扫描的最大位置只反映这次噪声实现。" : "对比度扫描比较整幅合并图像的方差，其最大位置受噪声和位置步长影响。"}`,
    };
  },
};
