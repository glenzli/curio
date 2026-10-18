import { control, number } from "../common/lesson-view.js";
import { plot } from "../common/ui.js";
import { stepperState, voiceCoilState, waveState, WAVE } from "./model.js";
const C = {
  blue: "#2b82ac",
  amber: "#c1894d",
  green: "#329383",
  purple: "#9268ad",
  red: "#bc6066",
  gray: "#84909d",
};
const ALT = "互动示意：步进丝杠、音圈制动和环形超声驱动的运动与数值对照";
const phaseControl = (value) =>
  control("phase", "往返或脉冲进度", 0, 1, "any", value, "", 4);
const samples = (fn, n = 100) =>
  Array.from({ length: n + 1 }, (_, i) => fn(i / n));

export const stepperSpec = {
  title: "步进、丝杠与换向间隙",
  alt: ALT,
  intro:
    "转子转动丝杠，螺母带着镜组沿导轨移动。到中点后反转，留意丝杠与镜组是否立刻一起返回。",
  scaleNote:
    "轴向长度采用mm；转子极数、镜片外形和支架为机构示意，未画200个实际齿。",
  staticCaption:
    "200整步/转、16细分，导程0.5 mm，往返峰值4转，换向间隙0.08 mm。起点已贴紧正向接触面。",
  note: "单轴丝杠的给定运动学：每转200整步，细分指令四舍五入到整微步；起点无正向空行程，反向需先走完设定间隙。忽略失步、弹性和摩擦；位置没有闭环修正。",
  legend: [
    ["旋转与固定极", C.blue],
    ["丝杠、螺母", C.amber],
    ["镜组运动", C.green],
    ["换向空行程", C.red],
  ],
  camera: [9, 6, 12],
  target: [0.2, 0.5, 0],
  distance: [8, 45],
  playLabel: "播放一次往返",
  replay: { key: "phase", start: 0, end: 1, seconds: 12 },
  controls: [
    phaseControl(0.2),
    control("lead", "丝杠导程", 0.25, 1, 0.25, 0.5, " mm/转", 2),
    control("turns", "单程转数", 1, 4, 0.5, 4, " 转", 1),
    {
      ...control("sublevel", "每整步细分", 0, 4, 1, 4),
      format: (v) => [1, 2, 4, 8, 16][v] + "细分",
    },
    control("backlash", "换向间隙", 0, 0.2, 0.001, 0.08, " mm", 3),
  ],
  presets: [
    { label: "前进两圈", values: { phase: 0.25, turns: 4, lead: 0.5 } },
    {
      label: "换向，螺母尚未退回",
      values: { phase: 0.51, turns: 4, lead: 0.5, backlash: 0.08 },
    },
    { label: "完成往返", values: { phase: 1 } },
    {
      label: "原文8 μm回差",
      values: { phase: 1, lead: 0.5, sublevel: 4, backlash: 0.008 },
    },
    { label: "消除间隙作对照", values: { backlash: 0 } },
  ],
  evaluate(s) {
    const input = { ...s, subdivisions: [1, 2, 4, 8, 16][s.sublevel ?? 4] },
      m = stepperState(input);
    const curves = [
      {
        name: "丝杠对应理论位移",
        color: C.blue,
        dashed: true,
        points: samples((phase) => [
          phase,
          stepperState({ ...input, phase }).ideal,
        ]),
      },
      {
        name: "带间隙的镜组位置",
        color: C.amber,
        points: samples((phase) => [
          phase,
          stepperState({ ...input, phase }).position,
        ]),
      },
    ];
    return {
      model: m,
      figure: plot({
        curves,
        xMin: 0,
        xMax: 1,
        xLabel: "一次往返进度",
        yLabel: "位移 / mm",
        yMax: m.peak + 0.15,
        height: 200,
        title: "同一往返中丝杠和镜组的位置",
        markers: [{ value: m.phase, label: "当前" }],
      }),
      figureHeight: 200,
      stats: [
        [
          "当前转角",
          number(m.rotation / (2 * Math.PI), 3) + " 转",
          "从起点累计",
        ],
        [
          "指令间隔",
          number(m.commandIntervalUm, 5) + " μm",
          "每个细分步；另有机械间隙",
        ],
        [
          "理论 / 镜组位移",
          number(m.ideal, 4) + " / " + number(m.position, 4) + " mm",
          "分别读取指令和螺母位置",
        ],
        ["换向位置差", number(m.error * 1000, 2) + " μm", "相对当前理论位置"],
        ["当前微步位置", String(m.steps), "以200×细分数为每转刻度"],
        [
          "指令取整误差",
          number(m.quantizationError * 1000, 4) + " μm",
          "与机械位置差分别计算",
        ],
      ],
      status: m.takingUp
        ? "换向间隙尚未走完：丝杠已反转，螺母暂时不动。"
        : m.phase === 1
          ? "已回到起始转角；镜组是否回到起点，取决于间隙。"
          : m.returning
            ? "螺母已贴住反向接触面，开始返回。"
            : "正向接触面已贴紧，转角按导程换成位移。",
      reading:
        "蓝虚线是转角对应的理论位置，赭色线是带间隙的镜组位置。增加细分可以缩小指令间隔；本例的换向间隙仍按设定值保留。",
    };
  },
};

export const voiceSpec = {
  title: "音圈：先加速，再用反向电流制动",
  alt: ALT,
  intro:
    "线圈中的电流先产生力，镜组的速度再随时间改变。播放一个正、负电流脉冲，比较力的方向与镜组正在移动的方向。",
  scaleNote:
    "镜组的轴向位移放大4倍；磁路采用剖面，镜组经支架放在线圈上方。读数使用实际mm、N、ms。",
  staticCaption:
    "0.5 N/A、20 g；+0.2 A通10 ms，再反向通10 ms，理想终点0.5 mm、零速。",
  note: "恒力常数0.5 N/A、无阻尼/弹性/外力的单轴模型，起点静止；正电流维持T，再以反向电流制动T，或继续同向。脉冲终点电流归零。忽略线圈电感、驱动限压、气隙边缘与真实位置反馈。",
  legend: [
    ["径向B", C.blue],
    ["环向I", C.purple],
    ["电磁力F", C.red],
    ["镜组速度", C.green],
  ],
  camera: [19, 11, 17],
  target: [3, 0, 0],
  distance: [12, 65],
  playLabel: "播放电流脉冲",
  replay: { key: "phase", start: 0, end: 1, seconds: 10 },
  controls: [
    phaseControl(0.7),
    control("mass", "移动镜组质量", 10, 40, 5, 20, " g", 0),
    control("current", "电流幅值", 0.05, 0.2, 0.01, 0.2, " A", 2),
    control("halfPulse", "每段通电时间 T", 5, 10, 1, 10, " ms", 0),
    {
      ...control("brake", "第二段电流", 0, 1, 1, 1),
      format: (v) => (v ? "反向制动" : "保持同向"),
    },
  ],
  presets: [
    { label: "刚通电", values: { phase: 0 } },
    {
      label: "10 ms · 准备反向",
      values: { phase: 0.5, mass: 20, current: 0.2, halfPulse: 10, brake: 1 },
    },
    { label: "反向电流，仍向前运动", values: { phase: 0.7, brake: 1 } },
    {
      label: "20 ms · 制动终点",
      values: { phase: 1, mass: 20, current: 0.2, halfPulse: 10, brake: 1 },
    },
    { label: "持续同向作对照", values: { phase: 1, brake: 0 } },
  ],
  evaluate(s) {
    const m = voiceCoilState(s),
      other = 1 - m.brake;
    const full = voiceCoilState({ ...s, phase: 1, brake: 0 });
    const curves = [
      {
        name: m.brake ? "反向制动" : "持续同向",
        color: C.green,
        points: samples((phase) => {
          const p = voiceCoilState({ ...s, phase });
          return [p.time * 1000, p.positionMm];
        }),
      },
      {
        name: other ? "反向制动参考" : "持续同向参考",
        color: C.gray,
        dashed: true,
        points: samples((phase) => {
          const p = voiceCoilState({ ...s, phase, brake: other });
          return [p.time * 1000, p.positionMm];
        }),
      },
    ];
    return {
      model: m,
      figure: plot({
        curves,
        xMax: 2 * m.halfPulse,
        xLabel: "物理时间 / ms",
        yLabel: "轴向位移 / mm",
        yMax: full.positionMm * 1.1,
        height: 200,
        title: "反向制动与继续通电的位移对照",
        markers: [{ value: m.time * 1000, label: "当前" }],
      }),
      figureHeight: 200,
      stats: [
        ["物理时间", number(m.time * 1000, 2) + " ms", "播放为慢动作"],
        [
          "电流 / 电磁力",
          number(m.activeCurrent, 2) + " A / " + number(m.force, 3) + " N",
          "先由电流决定力",
        ],
        ["镜组速度", number(m.velocity * 1000, 2) + " mm/s", "正号表示仍向前"],
        ["实际轴向位移", number(m.positionMm, 4) + " mm", "三维显示放大4倍"],
        ["当前加速度", number(m.acceleration, 3) + " m/s²", "由力和质量计算"],
        [
          "速度 / 冲量对照",
          Math.abs(m.velocity - m.impulseVelocity).toExponential(2) + " m/s",
          "积分F dt与运动学独立核对",
        ],
      ],
      status: m.stopped
        ? "两段脉冲结束，理想镜组速度回到零。"
        : m.phase === 1
          ? "电流已归零，镜组仍有速度；这个无阻力模型会继续滑行。"
          : m.activeCurrent < 0
            ? "力已反向，镜组仍在前进，速度正在减小。"
            : "电流、力与加速度同向；位移和速度从初始状态积累。",
      reading:
        number(m.mass, 0) +
        " g镜组在" +
        number(m.forceConstant * m.current, 3) +
        " N推力下的加速度为" +
        number(m.accelerationMagnitude, 3) +
        " m/s²。第一段走过" +
        number(m.accelerationMagnitude * m.duration ** 2 * 500, 4) +
        " mm；" +
        (m.brake
          ? "等长反向脉冲先减速，到终点速度为零。"
          : "第二段仍同向加速，到脉冲终点也不会自行停下。") +
        "真实镜头还要处理阻力、弹性、限流和位置闭环。",
    };
  },
};

export const ultrasonicSpec = {
  title: "环形超声：行波、表面椭圆与转子",
  alt: ALT,
  intro:
    "蓝箭头沿环指示行波传播，红点标记同一小块材料。波峰绕环行进，材料点则在原位置附近做椭圆运动，通过接触摩擦带动转子。",
  scaleNote: "表面位移与转子参考转角均放大500倍；拆解距离只便于查看层次。",
  staticCaption:
    "平均半径16 mm、半厚1.2 mm、周向6阶，振幅2 μm、40 kHz。给定一阶弯曲运动学，转角采用峰顶切速的无滑移参考。",
  note: "给定行波w=A cos(nφ−σωt)，表面切向位移u=−h/(2R)∂w/∂φ；γ=hn/(2R)=0.45。两驻波相加独立核对行波，材料点轨迹由同一式生成。转子按峰顶切速/R给无滑移运动学参考；预压、接触分布、滑移、负载和实际转速需另建动力学模型。",
  legend: [
    ["弹性定子", C.amber],
    ["压电陶瓷", C.purple],
    ["同一材料点", C.red],
    ["转子参考方向", C.green],
    ["行波传播", C.blue],
  ],
  camera: [48, 29, 42],
  target: [2, 0, 0],
  distance: [35, 150],
  playLabel: "慢放四个振动周期",
  replay: { key: "phase", start: 0, end: 1, seconds: 12 },
  controls: [
    {
      ...phaseControl(0.2),
      label: "振动相位进度",
      format: (v) => number(4 * v, 2) + " 周期",
    },
    control("amplitude", "法向振幅", 0.5, 4, 0.5, 2, " μm", 1),
    control("frequency", "给定驱动频率", 20, 60, 5, 40, " kHz", 0),
    {
      ...control("reverse", "行波方向", 0, 1, 1, 0),
      format: (v) => (v ? "反向" : "正向"),
    },
    control("separation", "拆解距离", 0, 1, 0.1, 0.4, "", 1),
  ],
  presets: [
    { label: "波峰经过标记点", values: { phase: 0 } },
    { label: "四分之一周期", values: { phase: 0.0625 } },
    { label: "反转行波", values: { reverse: 1 } },
    { label: "恢复正向", values: { reverse: 0 } },
    { label: "分开看定子与转子", values: { separation: 1 } },
  ],
  evaluate(s) {
    const m = waveState({ ...s, direction: s.reverse ? -1 : 1 });
    const curves = [
      {
        color: C.blue,
        points: samples(
          (t) => [360 * t, 1000 * m.point(2 * Math.PI * t).normal],
          180,
        ),
      },
      {
        color: C.purple,
        dashed: true,
        points: samples(
          (t) => [360 * t, 1000 * m.standingComponents(2 * Math.PI * t)[0]],
          180,
        ),
      },
      {
        color: C.gray,
        dashed: true,
        points: samples(
          (t) => [360 * t, 1000 * m.standingComponents(2 * Math.PI * t)[1]],
          180,
        ),
      },
    ];
    const waveform = plot({
      curves,
      xMax: 360,
      xLabel: "环上材料角坐标 / °",
      yLabel: "法向位移 / μm",
      yMin: -m.amplitude * 1.2,
      yMax: m.amplitude * 1.2,
      width: 480,
      height: 215,
      title: "两驻波相加得到当前行波",
    });
    const cx = 590,
      cy = 100,
      scale = 65 / m.A;
    const ellipse =
      '<path d="M510 100H670M590 20V180" stroke="currentColor" opacity=".18"/><ellipse cx="590" cy="100" rx="' +
      65 * m.gamma +
      '" ry="65" fill="none" stroke="' +
      C.red +
      '"/><circle cx="' +
      (cx + m.materialPoint.tangent * scale) +
      '" cy="' +
      (cy - m.materialPoint.normal * scale) +
      '" r="4" fill="' +
      C.red +
      '"/><text x="590" y="15" text-anchor="middle" font-size="12">固定材料点 φ=0</text><text x="590" y="201" text-anchor="middle" font-size="11">横轴u · 纵轴w / μm</text>';
    const figure =
      '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="行波与固定材料点的局部椭圆轨迹" viewBox="0 0 700 220">' +
      waveform.replace("<svg ", '<svg x="0" y="0" width="480" height="215" ') +
      ellipse +
      "</svg>";
    return {
      model: m,
      figure,
      figureHeight: 220,
      stats: [
        [
          "物理时间 / 周期",
          number(m.timeUs, 2) + " / " + number(m.periodUs, 2) + " μs",
          "给定频率决定物理时间",
        ],
        [
          "标记点 u / w",
          number(m.materialPoint.tangent * 1000, 3) +
            " / " +
            number(m.materialPoint.normal * 1000, 3) +
            " μm",
          "同一材料点的切向与法向位移",
        ],
        [
          "峰顶切向速度",
          number(m.crestVelocity, 2) + " mm/s",
          "与行波传播方向相反",
        ],
        [
          "参考转子转角",
          number((m.rotorAngle * 180) / Math.PI, 5) + "°",
          "三维仅将此参考角放大500倍",
        ],
        [
          "峰顶无滑移参考",
          number(m.referenceRpm, 1) + " rpm",
          "由切速/R换算，非实测转速",
        ],
        [
          "两驻波 / 行波误差",
          Math.abs(
            m.standingComponents(0).reduce((a, b) => a + b, 0) -
              m.materialPoint.normal,
          ).toExponential(2) + " mm",
          "三角恒等式与当前材料点核对",
        ],
      ],
      status:
        "行波绕环传播；红色材料点在局部椭圆上往复。转子箭头采用峰顶接触面的切向运动方向。",
      reading:
        "蓝实线为行波，两条虚线为驻波；右图标同相位材料点。" +
        number(m.frequency, 0) +
        " kHz时，每周期" +
        number(m.periodUs, 2) +
        " μs，画面按相位慢放。",
    };
  },
};
export const specs = [stepperSpec, voiceSpec, ultrasonicSpec];
