import { bayerTexture, SIZE, FINE } from "./model.js";
import { control, number } from "../common/lesson-view.js";
import { imagePanels } from "../common/image-view.js";
import { frequencyPanels } from "./figures.js";
export const spec = {
  title: "多频纹理经过Bayer采样",
  alt: "互动示意：多频灰度纹理、Bayer观测、插值与等价低频图案",
  intro:
    "输入是三组方向不同的正弦，三个理想颜色通道完全相同。改变纹理尺度和方向，看插值后何时出现颜色；在成像后的有效通道图像上，另构造一幅RGB图案，核对全部CFA采样点的观测。",
  staticCaption:
    "48×48 px；三组已知正弦，频率放大1.6倍、方向0°、横移0 px；方形像素宽1 px，无额外光学低通。",
  note: "理想RGGB，单色线性场景，三通道响应相等；没有噪声、白平衡、颜色矩阵或锐化。光学Gaussian低通后按方形像素面积平均，各频率使用精确响应；0宽度为点采样极限。双线性插值只读取同一幅马赛克。等价低频RGB由已知分量逐项折返构造，与双线性估计分别计算。前五图共用0…1和Gamma 2.2，RGB直接映射到屏幕三原色，供通道比较；相机色度标定在此省略。第六图固定0…0.25线性通道差幅值。RMSE与通道差均在46×46共同内部评估，排除边界。播放横移同一纹理，采样格点不动；像素积分抑制高频幅度，不改变采样格点边界。",
  controls: [
    control("scale", "纹理频率倍率", 0.5, 3, 0.05, 1.6, "×", 2),
    control("angle", "整组纹理旋转", 0, 90, 1, 0, "°"),
    control("shift", "纹理横移", 0, 2, 0.025, 0, " px", 3),
    control("width", "方形像素积分宽度", 0, 1, 0.05, 1, " px", 2),
    control("blur", "光学低通 σ", 0, 1, 0.05, 0, " px", 2),
  ],
  presets: [
    {
      label: "低频纹理",
      values: { scale: 0.5, angle: 0, shift: 0, width: 1, blur: 0 },
    },
    {
      label: "多频混叠",
      values: { scale: 1.6, angle: 0, shift: 0, width: 1, blur: 0 },
    },
    {
      label: "转到对角方向",
      values: { scale: 1.6, angle: 45, shift: 0, width: 1, blur: 0 },
    },
    {
      label: "加入光学低通",
      values: { scale: 1.6, angle: 0, shift: 0, width: 1, blur: 0.8 },
    },
    {
      label: "点采样极限",
      values: { scale: 1.6, angle: 0, shift: 0, width: 0, blur: 0 },
    },
  ],
  replay: {
    key: "shift",
    start: 0,
    end: 2,
    durationMs: 10000,
    startOnFirstPlay: true,
    label: "缓慢平移纹理",
  },
  evaluate(s) {
    const m = bayerTexture(s),
      images = imagePanels(
        [
          {
            label: "1 积分前的已知图案",
            values: m.rawFine,
            width: FINE,
            height: FINE,
            detail: "三个理想通道相同的灰度纹理",
            scale: "同一48×48 px像面范围",
          },
          {
            label: "2 成像后已知真值",
            values: m.filteredFine,
            width: FINE,
            height: FINE,
            detail: "光学低通与像素平均后的连续像",
            scale: "0.5 px细格；共用0…1显示",
          },
          {
            label: "3 RGGB观测",
            values: m.cfaRgb,
            width: SIZE,
            height: SIZE,
            rgb: true,
            detail: "每处只画实际测到的那个颜色",
            scale: "其他两通道留黑，不是补全RGB",
          },
          {
            label: "4 双线性插值",
            values: m.rgb,
            width: SIZE,
            height: SIZE,
            rgb: true,
            detail: "输入仅为第三幅的观测和CFA布局",
            scale: "与真值共用0…1和Gamma 2.2",
          },
          {
            label: "5 等价低频RGB图案",
            values: m.aliases,
            width: SIZE,
            height: SIZE,
            rgb: true,
            detail: "另一组图案，与原图给出相同CFA观测",
            scale: "由已知频率构造，不是估计结果",
          },
          {
            label: "6 插值后的通道差",
            values: m.chroma,
            width: SIZE,
            height: SIZE,
            white: 0.25,
            gamma: 1,
            detail: "√{[(R−G)²+(B−G)²]/2}",
            scale: "固定0…0.25；真实灰度场景为零",
          },
        ],
        { title: "多频图案的采样与混叠对照", tileHeight: 245 },
      ),
      frequencies = frequencyPanels(m.terms);
    const figure = `<svg xmlns="http://www.w3.org/2000/svg" class="drawing" role="img" aria-label="多频Bayer图像与频率位置对照" viewBox="0 0 720 1035">${images.figure.replace("<svg ", '<svg x="0" y="0" width="720" height="735" ')}${frequencies.figure.replace("<svg ", '<svg x="0" y="755" width="720" height="270" ')}</svg>`;
    return {
      figure,
      figureHeight: 1035,
      liveFigure: images.liveFigure + frequencies.liveFigure,
      stats: [
        [
          "双线性 / 等价图案 RMSE",
          `${number(m.rmse, 5)} / ${number(m.aliasRmse, 5)}`,
          "相对成像后真值；46×46内部，线性刻度",
        ],
        [
          "插值后的通道差 RMS",
          number(m.colorRms, 5),
          "已知灰度真值的通道差为0",
        ],
        [
          "等价图案 / 原图 CFA最大差",
          m.sampleDifference.toExponential(2),
          "在全部2304个真实采样位置核对",
        ],
      ],
      reading: `三组分量在R/B采样单元外的个数为${m.terms.filter((t) => t.aliases.R.location === "outside").length}/3，在G采样单元外为${m.terms.filter((t) => t.aliases.G.location === "outside").length}/3。低频情况下仍可能有双线性滤波误差，不能把所有差异都算作混叠；等价图案用各通道的采样格点构造，是观测不唯一的已知反例。光学低通σ=${number(s.blur, 2)} px、横移${number(s.shift, 3)} px；横移只改变各分量的相位。若额外保证三通道相同，可另加联合先验；当前插值器没有这个条件。`,
      table: `<div class="table-scroll"><table><tr><th>分量</th><th>fx, fy / cycle/px</th><th>幅度</th><th>光学响应</th><th>像素响应</th></tr>${m.terms.map((t, i) => `<tr><td>${i + 1}</td><td>${number(t.fx, 4)}, ${number(t.fy, 4)}</td><td>${number(t.a, 3)}</td><td>${number(t.opticalGain, 4)}</td><td>${number(t.pixelGain, 4)}</td></tr>`).join("")}</table></div>`,
    };
  },
};
