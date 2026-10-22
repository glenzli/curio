import { columnStripes, WIDTH, HEIGHT, DISPLAY_DN } from "./model.js";
import { control, curve, number } from "../common/lesson-view.js";
import { imagePanels } from "../common/image-view.js";
let key, cached;
export const spec = {
  title: "列条带与校准后的残差",
  alt: "互动示意：二维列偏置条带、参考输出和校准残差",
  intro:
    "同一列偏置沿各行保持不变。把平场换成纵向渐变，再比较校准前后的误差；蓝框只标正在核对的位置，不改变完整图像或统计。",
  staticCaption:
    "8 bit；曲率0.45；列偏置幅度4理想LSB；最高信号0.6 V；暗场校准；48×32 px，探针位于第16行。",
  note: "复用列ADC的单调弯曲斜坡与12列固定偏置图样，横向重复4次；16理想LSB电压基座。输入电压用归一化V，误差用DN；没有随机读噪或有限暗场误差。均匀校准图像仅按列求均值，并减去4条指定参考列的均值；参考列的偏置定义为零。无偏置图与连续交叉根只用于事后核对，不进入校准器。上两图共用ADC黑白点和Gamma 2.2；误差图统一线性−8…+8 DN，灰色为零，超出该范围仅在显示时截断。饱和与显示截断分别计数；校准不恢复已剪切的信号。改变位深时，偏置与基座仍按理想LSB指定，绝对电压随之改变。回放逐行核对同一幅图的残差。",
  controls: [
    {
      ...control("bits", "ADC位深", 0, 2, 1, 1),
      options: [
        { value: 0, label: "6 bit" },
        { value: 1, label: "8 bit" },
        { value: 2, label: "10 bit" },
      ],
      format: (v) => `${[6, 8, 10][v]} bit`,
    },
    control("curvature", "斜坡曲率", -0.8, 0.8, 0.05, 0.45, "", 2),
    control("offset", "列偏置幅度", 0, 6, 0.25, 4, " 理想LSB", 2),
    control("signal", "最高输入信号", 0, 0.7, 0.025, 0.6, " V", 3),
    control("calSignal", "均匀校准信号", 0, 0.4, 0.025, 0, " V", 3),
    {
      ...control("gradient", "输入图案", 0, 1, 1, 1),
      options: [
        { value: 0, label: "均匀平场" },
        { value: 1, label: "纵向渐变" },
      ],
      format: (v) => (v ? "纵向渐变" : "均匀平场"),
    },
    {
      ...control("row", "核对行", 0, 31, 1, 16, ""),
      numeric: { step: 1, unit: "行" },
    },
  ],
  presets: [
    {
      label: "线性斜坡 · 整码偏置",
      values: {
        bits: 1,
        curvature: 0,
        offset: 4,
        signal: 0.6,
        calSignal: 0,
        gradient: 1,
      },
    },
    {
      label: "弯曲斜坡",
      values: {
        bits: 1,
        curvature: 0.45,
        offset: 4,
        signal: 0.6,
        calSignal: 0,
        gradient: 1,
      },
    },
    {
      label: "均匀平场",
      values: {
        bits: 1,
        curvature: 0.45,
        offset: 4,
        signal: 0.4,
        calSignal: 0,
        gradient: 0,
      },
    },
    {
      label: "改用亮平场校准",
      values: {
        bits: 1,
        curvature: 0.45,
        offset: 4,
        signal: 0.6,
        calSignal: 0.3,
        gradient: 1,
      },
    },
    {
      label: "高端剪切",
      values: {
        bits: 0,
        curvature: 0.45,
        offset: 6,
        signal: 0.7,
        calSignal: 0,
        gradient: 1,
      },
    },
  ],
  replay: {
    key: "row",
    start: 0,
    end: 31,
    durationMs: 9000,
    startOnFirstPlay: true,
    label: "逐行核对残差",
  },
  evaluate(s) {
    const input = { ...s, bits: [6, 8, 10][s.bits], row: Math.floor(s.row) },
      cacheKey = JSON.stringify({ ...input, row: 0 });
    if (cacheKey !== key) {
      cached = columnStripes({ ...input, row: 0 });
      key = cacheKey;
    }
    const m = cached,
      row = input.row,
      L = 2 ** input.bits;
    const errorLimit = Math.max(
      DISPLAY_DN,
      4 *
        Math.ceil(
          Math.max(...m.rawError.map(Math.abs), ...m.residual.map(Math.abs)) /
            4,
        ),
    );
    const signed = (values) =>
      Float64Array.from(values, (v) => 0.5 + v / (2 * DISPLAY_DN));
    const rowValues = (a) =>
      Array.from({ length: WIDTH }, (_, x) => [x, a[row * WIDTH + x]]);
    return {
      ...imagePanels(
        [
          {
            label: "1 无偏置参考输出",
            values: m.reference,
            width: WIDTH,
            height: HEIGHT,
            white: L - 1,
            probe: [8, row],
            detail: `ADC 0…${L - 1} DN`,
            scale: "独立对照，不用于校准",
          },
          {
            label: "2 带列偏置的输出",
            values: m.observed,
            width: WIDTH,
            height: HEIGHT,
            white: L - 1,
            probe: [8, row],
            detail: "各列图样在所有行保持固定",
            scale: "与参考输出共用灰阶",
          },
          {
            label: "3 校准前码差",
            values: signed(m.rawError),
            width: WIDTH,
            height: HEIGHT,
            gamma: 1,
            detail: "负误差暗，零误差灰，正误差亮",
            scale: "固定 −8…+8 DN",
          },
          {
            label: "4 校准后残差",
            values: signed(m.residual),
            width: WIDTH,
            height: HEIGHT,
            gamma: 1,
            detail: "减去校准帧估计的列码差",
            scale: "同一 −8…+8 DN，不逐图伸展",
          },
        ],
        { title: "二维列偏置与固定尺度的校准残差", tileHeight: 225 },
      ),
      figureHeight: 450,
      panels: [
        {
          title: `第${row}行的码差`,
          xMin: 0,
          xMax: 47,
          xLabel: "列坐标 / px",
          yMin: -errorLimit,
          yMax: errorLimit,
          yLabel: "误差 / DN",
          curves: [
            curve("校准前", rowValues(m.rawError), 0),
            curve("校准后", rowValues(m.residual), 1),
            curve(
              "零",
              [
                [0, 0],
                [47, 0],
              ],
              3,
              true,
            ),
          ],
        },
      ],
      stats: [
        [
          "校准前 / 后 RMS",
          `${number(m.rawRms, 3)} / ${number(m.residualRms, 3)}`,
          "DN；固定48×32像素",
        ],
        [
          "输入超出ADC范围",
          `${m.clipped} / ${WIDTH * HEIGHT}`,
          "饱和数据仍计入该幅图的误差",
        ],
        [
          "阈值搜索 / 交叉根差异",
          `${m.mismatches} 个像素`,
          "两种独立计算最终锁存码的方法",
        ],
      ],
      reading: `校准只读取均匀校准帧，参考列为8、20、32、44；当前第${row}行的信号为${number(m.rows[row].signal, 4)} V。误差图显示范围外像素：校准前${m.rawError.filter((v) => Math.abs(v) > DISPLAY_DN).length}，校准后${m.residual.filter((v) => Math.abs(v) > DISPLAY_DN).length}；RMS始终使用未作显示截断的数值。线性斜坡、偏置为理想LSB的整数倍且未饱和时，相同的码差可完全扣除；弯曲斜坡下，同一电压偏置一般不再对应各亮度相同的码差。`,
    };
  },
};
