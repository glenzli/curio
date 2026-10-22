import { experiment, plot, legend } from "../common/ui.js";
import { adc, compare, FULL_WELL, ADC_SPAN } from "./model.js";

const colors = { ideal: "#8b8e91", analog: "#3f8b98", digital: "#b98447" };
const number = (x) => x.toLocaleString("zh-CN", { maximumFractionDigits: 2 });

function stairs(bits, gain, maximum) {
  const step = adc(0, bits, gain).step;
  const result = [[0, step / 2]];
  for (let edge = step; edge < maximum; edge += step) {
    result.push([edge, edge - step / 2], [edge, edge + step / 2]);
  }
  result.push([maximum, adc(maximum, bits, gain).estimate]);
  return result;
}

export function mount({ element, signal, session }) {
  return experiment({
    element,
    signal,
    session,
    kicker: "CMOS · 读出与量化",
    title: "增益放在 ADC 前后",
    intro:
      "两个通道接收相同的电子数。一个先放大再量化，另一个先量化再做等倍数字乘法。增益和位深改变响应曲线；输入电荷只移动取样标记，上图看暗部码阶，下图看高光裁切。",
    controls: [
      {
        key: "gainEV",
        numeric: {
          toInput: (v) => 2 ** v,
          fromInput: (v) => Math.log2(v),
          step: "any",
          unit: "倍",
        },
        label: "增益",
        min: 0,
        max: 4,
        step: 0.25,
        value: 2,
        format: (x) => `${number(2 ** x)}×`,
      },
      {
        key: "bits",
        numeric: { step: 1, unit: "bit" },
        label: "ADC 位深",
        min: 8,
        max: 14,
        step: 1,
        value: 12,
        format: (x) => `${x} bit`,
      },
      {
        key: "electrons",
        label: "输入电荷取样",
        min: 0,
        max: 64000,
        step: 25,
        value: 100,
        format: (x) => `${number(x)} e⁻`,
        hint: "只移动图中取样点；超出暗部图时，在下方全范围图查看。",
      },
    ],
    presets: [
      {
        label: "暗部：100 e⁻",
        values: { electrons: 100, bits: 10, gainEV: 2 },
      },
      {
        label: "高光：40,000 e⁻",
        values: { electrons: 40000, bits: 12, gainEV: 2 },
      },
      { label: "满阱先饱和", values: { electrons: 50000, gainEV: 0 } },
    ],
    content: `<style>@media(max-width:550px){.stats{grid-template-columns:1fr;gap:10px}.stats>div{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 10px;align-items:baseline}.stats em{grid-column:1/-1}}</style><div class="stats"><div><small>ADC 前增益：输入步长</small><strong data-step></strong><em>e⁻ / 码</em></div><div><small>输入端噪声 rms（近似）</small><strong data-noise></strong><em>前增益 / 数字增益，e⁻</em></div><div><small>有效输入上限</small><strong data-limit></strong><em>前增益 / 数字增益，e⁻</em></div></div><div class="chart" data-chart></div><div class="legend" data-legend></div><div class="chart" data-full-chart></div><p class="reading" data-probe aria-live="polite"></p><p class="reading" data-clipping></p>`,
    note: `教学参数：满阱 ${number(FULL_WELL)} e⁻，1× 时 ADC 满量程折合 ${number(ADC_SPAN)} e⁻；上游读噪 2 e⁻、下游读噪在 1× 时折合 8 e⁻，二者独立。改变位深保持 ADC 电压范围不变。阶梯采用区间中点重建，因此零输入也会重建为半步长；图中未叠加随机噪声。rms 合成包含步长 / √12，仅在量化相位充分变化的近似下成立，不含光子噪声。数字乘法使用浮点输出，不另加容器裁切；图中已除去各自增益，统一回到电子尺度。`,
    update(root, state) {
      const gain = 2 ** state.gainEV,
        result = compare(state.electrons, state.bits, gain);
      const { analog, digital } = result;
      root.querySelector("[data-step]").textContent = number(analog.step);
      root.querySelector("[data-noise]").textContent =
        `${number(result.analogNoise)} / ${number(result.digitalNoise)}`;
      root.querySelector("[data-limit]").textContent =
        `${number(analog.limit)} / ${number(digital.limit)}`;
      const maximum = Math.max(128, 8 * digital.step);
      const curves = [
        {
          name: "理想输入",
          color: colors.ideal,
          dashed: true,
          points: [
            [0, 0],
            [maximum, maximum],
          ],
        },
        {
          name: "先量化，再做数字乘法",
          color: colors.digital,
          points: stairs(state.bits, 1, maximum),
        },
        {
          name: "ADC 前增益",
          color: colors.analog,
          points: stairs(state.bits, gain, maximum),
        },
      ];
      root.querySelector("[data-chart]").innerHTML = plot({
        curves,
        xMax: maximum,
        yMax: maximum + digital.step,
        xLabel: "输入电荷 / e⁻（暗部局部放大）",
        yLabel: "重建值 / e⁻",
        title: "两种增益位置的暗部量化阶梯",
        markers: [{ value: state.electrons, label: "当前取样" }],
        samples: [
          [state.electrons, analog.estimate],
          [state.electrons, digital.estimate],
        ],
      });
      const full = [
        {
          name: "理想输入",
          color: colors.ideal,
          dashed: true,
          points: [
            [0, 0],
            [ADC_SPAN, ADC_SPAN],
          ],
        },
        ...[
          ["前增益", gain, colors.analog],
          ["数字增益", 1, colors.digital],
        ].map(([name, g, color]) => ({
          name,
          color,
          points: Array.from({ length: 129 }, (_, i) => {
            const x = (ADC_SPAN * i) / 128;
            return [x, adc(x, state.bits, g).estimate];
          }),
        })),
      ];
      root.querySelector("[data-full-chart]").innerHTML = plot({
        curves: full,
        xMax: ADC_SPAN,
        yMax: ADC_SPAN,
        xLabel: "输入电荷 / e⁻（全范围）",
        yLabel: "重建值 / e⁻",
        title: "取样电荷与两个通道的裁切位置",
        markers: [{ value: state.electrons, label: "当前取样" }],
        samples: [
          [state.electrons, analog.estimate],
          [state.electrons, digital.estimate],
        ],
      });
      root.querySelector("[data-legend]").innerHTML = legend(curves);
      root.querySelector("[data-probe]").textContent =
        `输入 ${number(state.electrons)} e⁻：前增益通道读出 ${analog.code} 码，重建 ${number(analog.estimate)} e⁻；数字通道读出 ${digital.code} 码，乘法后为 ${number(digital.output)}，除去显示增益后重建 ${number(digital.estimate)} e⁻。`;
      const warnings = [];
      if (analog.fullWellClipped)
        warnings.push("输入已达到像素满阱，电荷被截断。");
      if (analog.adcClipped)
        warnings.push("前增益通道已达到 ADC 满量程，高光被截断。");
      if (!warnings.length)
        warnings.push("当前输入低于满阱和两个通道的 ADC 上限。");
      root.querySelector("[data-clipping]").textContent = warnings.join(" ");
    },
  });
}
