import { signalChain } from "./model.js";
import { control, number, escape } from "../common/lesson-view.js";
export const spec = {
  title: "沿着同一次曝光往后看",
  alt: "互动示意：同一次曝光从能量、光子、电子到码值与显示",
  intro:
    "每一步保留自己的单位。播放只逐步突出处理环节；数值始终对应一次完整曝光的期望值。",
  staticCaption: "4 μm像素，550 nm，曝光量10⁻⁴ J/m²，QE 70%，模拟增益1。",
  note: "单色、均匀像面曝光、均值流程；满阱32000 e⁻，电子→电压为1 V满量程，14 bit ADC、零黑电平，Gamma 2.2显示。没有生成随机计数，也未包含色彩变换。显示端读数是无量纲码值；换成cd/m²需另给显示器的光度标定。",
  controls: [
    control(
      "exposure",
      "曝光量的10进对数",
      -6,
      -2,
      0.25,
      -4,
      " log₁₀(J/m²)",
      2,
    ),
    control("qe", "外量子效率", 0, 1, 0.05, 0.7, "", 2),
    control("gain", "模拟增益", 1, 8, 0.5, 1, "倍", 1),
    control("step", "查看环节", 0, 5, 1, 0),
  ],
  presets: [
    {
      label: "本书起始曝光",
      values: { exposure: -4, qe: 0.7, gain: 1, step: 0 },
    },
    {
      label: "固定曝光提高增益",
      values: { exposure: -4, qe: 0.7, gain: 4, step: 3 },
    },
    {
      label: "光电二极管已饱和",
      values: { exposure: -2, qe: 0.7, gain: 1, step: 2 },
    },
  ],
  replay: {
    key: "step",
    start: 0,
    end: 5,
    label: "逐步查看",
    startOnFirstPlay: true,
    durationMs: 10000,
  },
  evaluate(s) {
    const m = signalChain(s),
      stages = [
        [
          "像素收到能量",
          m.energy.toExponential(3) + " J",
          "第1章：面积×曝光量",
        ],
        ["入射光子", number(m.photons, 0) + " 个", "第1—2章：能量÷光子能量"],
        ["信号电子", number(m.electrons, 0) + " e⁻", "第2—4章：期望值×QE"],
        ["读出电压", number(m.volts, 4) + " V", "第3、5章：满阱后再加增益"],
        ["记录码值", String(m.code) + " DN", "第3、10章：14 bit ADC"],
        ["显示信号", number(m.display, 3), "第9章：归一化及Gamma"],
      ];
    const active = Math.min(5, Math.floor(s.step));
    return {
      figure: `<svg class="drawing" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 310" role="img" aria-label="六个处理环节与各自的单位">${stages
        .map(([label, value], i) => {
          const x = 10 + (i % 3) * 212,
            y = 12 + Math.floor(i / 3) * 148;
          return `<rect x="${x}" y="${y}" width="196" height="126" rx="7" fill="currentColor" fill-opacity="${i === active ? 0.12 : 0.025}" stroke="currentColor" stroke-opacity="${i === active ? 0.8 : 0.2}"/><text x="${x + 12}" y="${y + 32}">${escape(label)}</text><text x="${x + 12}" y="${y + 76}">${escape(value)}</text><text x="${x + 12}" y="${y + 108}">${i + 1} / 6</text>`;
        })
        .join("")}</svg>`,
      stats: [
        ["当前环节", stages[active][0], stages[active][2]],
        ["捕获的电子均值", number(m.captured, 1) + " e⁻", "上限32000 e⁻"],
        ["光子能量", m.photonEnergy.toExponential(4) + " J", "550 nm；λ固定"],
      ],
      reading: `${stages[active][2]}。模拟增益为 ${s.gain} 倍，改变电压进入ADC的尺度；它不改变 ${number(m.photons, 1)} 个平均入射光子。查看下一步不会重新曝光或重新采样，因而可以追踪同一组输入。`,
    };
  },
};
