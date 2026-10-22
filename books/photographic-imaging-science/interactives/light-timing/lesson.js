import { control, curve, number } from '../common/lesson-view.js';
import { lightTiming } from './model.js';
import { timingFigure } from './figures.js';

const pwm = { source: 0, scanMs: 8, exposureMs: 2, row: 50,
  frequency: 100, duty: 25, phase: 0,
  flashStartMs: 8.5, flashDurationMs: 1, ambient: 0.2 };
const flash = { ...pwm, source: 1, exposureMs: 12 };
const sourceControl = (c, source) => ({ ...c,
  enabled: (s) => s.source === source,
  hint: (s) => s.source === source ? '' : (source === 0 ? '选择PWM时启用' : '选择单次闪光时启用'),
});

export const spec = {
  title: 'PWM条带与单次闪光的同步窗口',
  alt: '互动示意：矩形PWM、单次闪光与逐行曝光窗口的精确交集',
  intro: '灰条是每行的完整曝光窗口，彩色部分是实际收光时段。PWM保持时间平均辐照度，单闪保持闪光总曝光量，环境光另行相加。PWM对照均从PWM基准出发，单闪对照均从完整同步场景出发，每次只改变按钮所写的条件。',
  staticCaption: '100 Hz、25%占空比；每行曝光2 ms，首末行起始差8 ms。PWM时间平均辐照度固定为E_ref，峰值为4 E_ref。',
  note: '静止均匀表面、理想矩形行窗、从顶行到底行匀速扫描；时间统一为ms。PWM在所有时间周期重复，时间平均辐照度E_ref固定，占空比d的峰值为E_ref/d。单闪总曝光量固定为8 E_ref·ms，持续δ ms时峰值为8/δ E_ref；环境光为a E_ref，只在单闪模式加入。图示脉冲条高不表示强度；曝光量纵轴按E_ref·T_e归一化，虚线1保留固定照明参照。行曲线显示129条等距代表行，逐行采用精确区间积分并与独立分段积分核对。未加入噪声、饱和、触发延迟、真实闪光衰减或帘幕运动误差。',
  controls: [
    { ...control('source', '照明模式', 0, 1, 1, 0),
      discrete: true, format: (x) => ['PWM', '单次闪光'][x] },
    control('scanMs', '首末行起始时间差', 0, 20, 0.25, 8, ' ms', 2),
    control('exposureMs', '每行曝光时间', 0.25, 20, 0.25, 2, ' ms', 2),
    control('row', '取样行位置（顶为0）', 0, 100, 1, 50, '%'),
    sourceControl(control('frequency', 'PWM频率', 50, 2000, 50, 100, ' Hz'), 0),
    sourceControl(control('duty', 'PWM占空比', 10, 100, 5, 25, '%'), 0),
    { ...sourceControl(control('phase', '脉冲起点相位', 0, 100, 1, 0, '%周期'), 0),
      hint: (s) => s.source === 0 ? '100%与0%是同一相位' : '选择PWM时启用' },
    sourceControl(control('flashStartMs', '闪光开始时刻', -5, 35, 0.25, 8.5, ' ms', 2), 1),
    sourceControl(control('flashDurationMs', '闪光持续时间', 0.1, 8, 0.1, 1, ' ms', 1), 1),
    sourceControl(control('ambient', '恒定环境光 / E_ref', 0, 1, 0.05, 0.2, '', 2), 1),
  ],
  presets: [
    { label: 'PWM基准', values: pwm },
    { label: 'PWM只减占空比至10%', values: { ...pwm, duty: 10 } },
    { label: 'PWM只延长至整周期', values: { ...pwm, exposureMs: 10 } },
    { label: 'PWM只令扫描差为零', values: { ...pwm, scanMs: 0 } },
    { label: '单闪完整放入共同窗口', values: flash },
    { label: '单闪只推迟至11.5 ms', values: { ...flash, flashStartMs: 11.5 } },
    { label: '单闪只缩短曝光至2 ms', values: { ...flash, exposureMs: 2 } },
  ],
  evaluate(s) {
    const m = lightTiming(s), isFlash = m.p.source === 1;
    const total = m.rows.map((r) => [r.row * 100, r.ratio]);
    const base = isFlash ? m.p.ambient : 1;
    const yMax = Math.max(2, Math.ceil(1.1 * Math.max(m.max, 1)));
    const curves = [
      curve(isFlash ? '环境光＋单闪' : 'PWM行积分', total, isFlash ? 1 : 0),
      curve(isFlash ? '只有环境光' : '相同平均辐照度的恒定光',
        [[0, base], [100, base]], 3, true),
    ];
    if (isFlash && base !== 1) curves.push(curve('E_ref恒定光参照',
      [[0, 1], [100, 1]], 0, true));
    const readout = isFlash
      ? `本次闪光区间${number(m.p.flashStartMs, 2)}…${number(m.p.flashStartMs + m.p.flashDurationMs, 2)} ms，${m.allFlashCaptured ? '完整位于共同窗口内，所有行接收相同完整闪光量' : '没有完整放入共同窗口，至少一部分行未收齐这次闪光'}。恒定环境光对各行的贡献均为${number(m.p.ambient * m.p.exposureMs, 3)} E_ref·ms；缩短曝光只会降低这一项，闪光项还要看区间交集。`
      : `PWM每周期的平均辐照度固定为E_ref；占空比${number(m.p.duty, 0)}%时峰值为${number(m.peak, 3)} E_ref。曝光窗口覆盖整数周期时，每行均回到虚线1；扫描差为零只让所有行相同，不保证该帧等于时间平均值。`;
    return {
      figure: timingFigure(m), figureHeight: 390,
      panels: [{
        title: '逐行曝光量（纵轴可扩展，虚线1为固定参照）',
        xMin: 0, xMax: 100, xLabel: '行位置 / %（顶0，底100）',
        yMin: 0, yMax, yLabel: 'H / (E_ref T_e)',
        curves, markers: [{ value: m.p.row, label: '取样行' }],
        samples: [[m.p.row, m.selected.ratio]],
      }],
      stats: [
        ['全幅共同窗口长度', number(m.window.duration, 3) + ' ms',
          m.window.duration > 0 ? `从${number(m.window.start, 2)}到${number(m.window.end, 2)} ms` : '有限时长的单闪无法完整放入'],
        ['光源峰值 / E_ref', number(m.peak, 3),
          isFlash ? '固定单闪总量8 E_ref·ms，不含环境光' : '固定时间平均辐照度E_ref'],
        ['取样行归一化曝光量', number(m.selected.ratio, 4),
          `窗口${number(m.selected.start, 2)}…${number(m.selected.end, 2)} ms`],
        ['代表行最小—最大', `${number(m.min, 4)} — ${number(m.max, 4)}`, '同一E_ref T_e刻度'],
        ['取样行实际受光时长', number(m.selected.illuminated, 4) + ' ms',
          isFlash ? '闪光与本行窗口的交集' : '窗口内累计PWM导通时间'],
        ['独立积分最大差', m.referenceError.toExponential(2), '曝光量单位E_ref·ms，129行核对'],
      ],
      reading: readout + ' 取样行框与曲线标记对应同一位置。',
    };
  },
};
