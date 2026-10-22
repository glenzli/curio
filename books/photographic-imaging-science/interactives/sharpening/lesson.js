import { control, curve, number } from "../common/lesson-view.js";
import { imagePanels } from "../common/image-view.js";
import { signedColors } from "../common/field-view.js";
import { sharpening, WIDTH, HEIGHT } from "./model.js";
export const spec = {
  title: "锐化后的边缘、噪声和MTF",
  alt: "互动示意：同一观测经水平锐化后的图像、过冲、噪声与传递函数",
  intro:
    "同一张图保持曝光和噪声样本不变，只增加锐化强度。把边缘轮廓、纹理和频率曲线一起看，再比较噪声的变化。",
  staticCaption:
    "有效离散Gaussian模糊σ=1.2 px；水平三点锐化，a=0.8、r=1 px；独立输入噪声RMS 0.015。",
  note: "水平离散线性模型，输出=(1+a)X−a[X(x−r)+X(x+r)]/2；有效模糊核截于5σ并归一。白噪声在模糊之后加入，锐化输入共用同一观测。MTF真值来自核的DTFT，独立对照来自无噪声阶跃输出的前向差分。图像显示裁切到0…1，统计与传递始终使用未裁切浮点值。",
  controls: [
    control("sigma", "有效模糊 σ", 0, 3, 0.1, 1.2, " px", 1),
    control("amount", "锐化强度 a", 0, 2, 0.1, 0.8, "", 2),
    {
      ...control("radius", "水平半径 r", 1, 4, 1, 1, " px"),
      options: [
        { value: 1, label: "1 px" },
        { value: 2, label: "2 px" },
        { value: 3, label: "3 px" },
        { value: 4, label: "4 px" },
      ],
    },
    control("noise", "输入噪声 RMS", 0, 0.05, 0.005, 0.015, "", 3),
    {
      ...control("seed", "观测种子", 1, 999, 1, 23),
      discrete: true, numeric: { step: 1 },
    },
  ],
  presets: [
    { label: "保持原观测", values: { amount: 0 } },
    { label: "中等锐化", values: { amount: 0.8 } },
    { label: "MTF抬到1以上", values: { sigma: 0.7, amount: 1.5, radius: 1 } },
    { label: "较大的光晕半径", values: { radius: 3, amount: 1.2 } },
    { label: "去掉噪声作对照", values: { noise: 0 } },
  ],
  replay: {
    key: "amount",
    start: 0,
    end: 2,
    durationMs: 9000,
    label: "逐渐增加锐化",
    startOnFirstPlay: true,
  },
  evaluate(s) {
    const m = sharpening(s),
      images = imagePanels(
        [
          {
            label: "1 已知离散图案",
            values: m.truth,
            width: WIDTH,
            height: HEIGHT,
            scale: "所有信号图共用0…1白点",
          },
          {
            label: "2 模糊后加入噪声",
            values: m.capture,
            width: WIDTH,
            height: HEIGHT,
            scale: "改变锐化参数不重新拍摄",
          },
          {
            label: "3 当前锐化结果",
            values: m.output,
            width: WIDTH,
            height: HEIGHT,
            detail: `显示范围外${m.clipped}个样点`,
            scale: "计算保留负值与超过1的值",
          },
          {
            label: "4 相对输入的误差",
            values: signedColors(m.error, 0.15),
            width: WIDTH,
            height: HEIGHT,
            rgb: true,
            gamma: 1,
            scale: "蓝负、橙正；固定±0.15",
          },
        ],
        { title: "固定观测的锐化和误差", tileHeight: 225 },
      );
    return {
      ...images,
      figureHeight: 450,
      panels: [
        {
          title: "无噪声阶跃的边缘轮廓",
          curves: [
            curve(
              "模糊边缘",
              m.edge.map((v) => [v[0], v[1]]),
            ),
            curve(
              "锐化边缘",
              m.edge.map((v) => [v[0], v[2]]),
              1,
            ),
          ],
          xMin: -12,
          xMax: 12,
          yMin: -0.6,
          yMax: 1.6,
          xLabel: "相对边缘位置 / px",
          yLabel: "归一化阶跃响应",
        },
        {
          title: "核的传递与边缘差分的独立核对",
          curves: [
            curve(
              "模糊MTF",
              m.frequencies.map((v) => [v.f, v.optical]),
            ),
            curve(
              "锐化后MTF",
              m.frequencies.map((v) => [v.f, v.combined]),
              1,
            ),
            curve(
              "由阶跃差分重算",
              m.frequencies.map((v) => [v.f, v.edge]),
              3,
              true,
            ),
          ],
          xMin: 0,
          xMax: 0.5,
          yMin: 0,
          yMax: Math.max(1.2, ...m.frequencies.map((v) => v.combined)) * 1.05,
          xLabel: "空间频率 / cycles per pixel",
          yLabel: "MTF",
        },
      ],
      stats: [
        ["理论输出噪声 RMS", number(m.noiseTruth, 4), "输入噪声乘核能量平方根"],
        [
          "本幅图的噪声 RMS",
          number(m.noiseObserved, 4),
          "复用噪声样本的观测统计",
        ],
        ["阶跃过冲", number(100 * m.overshoot, 2) + "%", "相对0…1阶跃幅度"],
      ],
      reading: `三点核的权重和为1；白噪声方差乘以(1+a)²+a²/2。当前边缘差分和核DTFT的最大偏差${Math.max(...m.frequencies.map((v) => Math.abs(v.edge - v.combined))).toExponential(2)}。提高曲线时也要检查过冲、噪声和误差图。`,
    };
  },
};
