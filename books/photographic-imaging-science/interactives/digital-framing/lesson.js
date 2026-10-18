import { digitalFrame, WIDTH, HEIGHT } from "./model.js";
import { control, number } from "../common/lesson-view.js";
import { imagePanels } from "../common/image-view.js";
let key, cached;
export const spec = {
  title: "数字防抖、呼吸补偿与裁切余量",
  alt: "互动示意：数字平移和呼吸尺度校正、有效画幅与曝光拖影的真值对照",
  intro:
    "同一张带定位标记的已知纹理随镜头尺度和相机位置变化。用给定的平移与尺度估计重采样，再与固定输出视角的无模糊真值比较；紫色区域表示原帧没有覆盖。",
  staticCaption:
    "160×100像素；当前真实平移6 px、尺度1.10，固定目标尺度1.20；估计无误差、曝光内运动为零。",
  note: "局部平面场景、全局曝光、二维等比例缩放与水平平移。四个已知正弦分量与黑方块、亮圆定位标记组成线性强度图；沿匀速曝光轨迹分段精确积分。补偿器只使用给定估计值，从离散原帧双线性取样；无模糊连续场景仅用于评价。像素中心点采样，未加像素孔径积分。图像统一线性0…1、显示Gamma 2.2；不模拟颜色、噪声、景深、视差或滚动快门。回放改变帧间位置和呼吸尺度，恢复后暂停。",
  controls: [
    control("shift", "帧间平移幅度", 0, 18, 1, 6, " px"),
    control("breathing", "呼吸尺度幅度", 0, 15, 1, 10, " %"),
    control("crop", "固定目标尺度 K", 1, 1.5, 0.02, 1.2, "", 2),
    control("blur", "曝光内匀速像移宽度", 0, 12, 1, 0, " px"),
    control("shiftError", "平移估计误差", -6, 6, 0.5, 0, " px", 1),
    control("scaleError", "尺度估计相对误差", -3, 3, 0.5, 0, " %", 1),
    control("phase", "帧间动作进度", 0, 1, 0.01, 0.25, "", 2),
  ],
  presets: [
    {
      label: "纯平移 · 理想估计",
      values: {
        shift: 8,
        breathing: 0,
        crop: 1.2,
        blur: 0,
        shiftError: 0,
        scaleError: 0,
        phase: 0.25,
      },
    },
    {
      label: "呼吸 · 固定输出视角",
      values: {
        shift: 0,
        breathing: 10,
        crop: 1.2,
        blur: 0,
        shiftError: 0,
        scaleError: 0,
        phase: 0.25,
      },
    },
    {
      label: "补偿后仍有曝光拖影",
      values: {
        shift: 8,
        breathing: 0,
        crop: 1.2,
        blur: 10,
        shiftError: 0,
        scaleError: 0,
        phase: 0.25,
      },
    },
    {
      label: "裁切余量不足",
      values: {
        shift: 15,
        breathing: 10,
        crop: 1,
        blur: 0,
        shiftError: 0,
        scaleError: 0,
        phase: 0.25,
      },
    },
    {
      label: "给定估计偏差",
      values: {
        shift: 6,
        breathing: 10,
        crop: 1.4,
        blur: 0,
        shiftError: 3,
        scaleError: 2,
        phase: 0.25,
      },
    },
  ],
  replay: {
    key: "phase",
    start: 0,
    end: 1,
    durationMs: 10000,
    startOnFirstPlay: true,
    label: "播放平移与呼吸",
  },
  evaluate(s) {
    const k = JSON.stringify(s);
    if (k !== key) {
      cached = digitalFrame(s);
      key = k;
    }
    const m = cached,
      p = m.p;
    const display = new Float64Array(WIDTH * HEIGHT * 3);
    for (let i = 0; i < m.corrected.length; i++) {
      if (m.valid[i]) {
        for (let c = 0; c < 3; c++) display[3 * i + c] = m.corrected[i];
      } else {
        const parity =
          (Math.floor((i % WIDTH) / 6) +
            Math.floor(Math.floor(i / WIDTH) / 6)) %
          2;
        const color = parity ? [0.3, 0.22, 0.4] : [0.45, 0.36, 0.57];
        display.set(color, 3 * i);
      }
    }
    const images = imagePanels(
      [
        {
          label: "1 原始帧",
          values: m.raw,
          width: WIDTH,
          height: HEIGHT,
          detail: `平移${number(p.displacement, 2)} px；尺度${number(p.scale, 3)}`,
          scale: "曝光内像移已积分到像素值",
        },
        {
          label: "2 数字补偿后",
          values: display,
          rgb: true,
          width: WIDTH,
          height: HEIGHT,
          detail: `原帧取样窗口${number(m.sourceWidth, 1)}×${number(m.sourceHeight, 1)} px`,
          scale: "紫色格表示缺失范围；保留双线性取样误差",
          active: true,
        },
        {
          label: "3 固定输出视角真值",
          values: m.truth,
          width: WIDTH,
          height: HEIGHT,
          detail: `目标尺度K=${number(s.crop, 2)}；无曝光运动`,
          scale: "从已知连续场景直接计算，不经补偿器",
        },
      ],
      {
        title: "同一已知纹理的捕获、几何补偿与真值",
        columns: 3,
        tileHeight: 195,
      },
    );
    return {
      ...images,
      figureHeight: 205,
      stats: [
        [
          "当前真实尺度 / 平移",
          `${number(p.scale, 3)} / ${number(p.displacement, 2)} px`,
          "二者随动作进度变化",
        ],
        [
          "数字放大倍率",
          number(p.crop / p.estimatedScale, 3) + "×",
          "K / 给定尺度估计",
        ],
        [
          "有原帧支持的输出像素",
          (100 * m.coverage).toFixed(1) + " %",
          `${m.count} / ${WIDTH * HEIGHT}；缺失像素不补真值`,
        ],
        [
          "有效区域RMSE",
          m.rmse === null ? "无共同区域" : m.rmse.toExponential(3),
          "固定线性0…1；含双线性取样误差",
        ],
        ["曝光运动MTF", number(m.motionMtf, 3), "传感器上0.10 cycles/pixel"],
        ["该频率运动OTF", number(m.motionOtf, 3), "匀速盒积分的有符号sinc"],
      ],
      reading: `补偿读取的平移为${number(p.estimatedShift, 2)} px，尺度为${number(p.estimatedScale, 3)}；已知真实值仅用于对照。数字重定位能稳定帧间构图，曝光内${number(s.blur, 1)} px像移造成的平均仍留在原始帧里。减小K可以保留更宽视角，但可能使边缘失去原帧支持。`,
    };
  },
};
