import { control, number } from "../common/lesson-view.js";
import { imagePanels } from "../common/image-view.js";
import { signedColors, withMissing } from "../common/field-view.js";
import { parallax, WIDTH, HEIGHT, FOCAL, NEAR, FAR } from "./model.js";
function plan(m) {
  const x = (z) => 54 + z * 100,
    y = (v) => 130 + v * 42,
    origin = [x(0), y(m.pose.translation)],
    points = [
      [0.3, NEAR],
      [-2, FAR],
    ];
  const rays = points
    .map(
      ([u, z]) =>
        `<path d="M54,130L${x(z)},${y(u)}" stroke="#40879a" opacity=".5"/><path d="M${origin[0]},${origin[1]}L${x(z)},${y(u)}" stroke="#bb7946"/>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 740 260" role="img" aria-label="参考相机与移动相机看到2米前景板和6米背景"><path d="M54 130H700" stroke="currentColor" opacity=".15"/><path d="M254 ${y(-0.55)}V${y(0.55)}" stroke="#40879a" stroke-width="7"/><path d="M654 18V242" stroke="#777" stroke-width="5"/>${rays}<circle cx="54" cy="130" r="5" fill="#40879a"/><circle cx="${origin[0]}" cy="${origin[1]}" r="4" fill="#bb7946"/><text x="20" y="30" font-size="17">俯视：参考相机（蓝）与移动相机（橙）</text><text x="185" y="220" font-size="16">前景 Z=2 m</text><text x="552" y="255" font-size="16">背景 Z=6 m</text><text x="20" y="250" font-size="14">纵横方向均按米缩放；图像补偿另由针孔投影计算</text></svg>`;
}
export const spec = {
  title: "前景与背景：配准后的视差和遮挡",
  alt: "互动示意：前后景场景的相机位姿、单平面补偿和逐深度真值对照",
  intro:
    "相机横移时，近处物体在画面中移动得更多。先把背景对齐，再改为前景深度；只做绕投影中心旋转时，比较结果有什么变化。",
  staticCaption:
    "针孔相机f=80 px；前景2 m、背景6 m；相机横移0.15 m并偏转1°。单平面补偿按6 m背景计算。",
  note: "96×64像素中心点采样，理想针孔、静态两平面、瞬时全局曝光。补偿器读取给定的准确相机位姿与一个平面深度，从移动观测双线性取样。逐深度对照额外读取已知场景深度，仅作评价；遮挡处保留缺失。RMSE在两条路径共同可见且插值邻域不跨深度边界的像素上计算。图像线性0…1、显示Gamma 2.2；误差图Gamma 1。",
  scaleNote:
    "三维场景各方向均为1 m → 8绘图单位；前景板1.10×0.84 m。相机和线宽为便于观察而放大。",
  legend: [
    ["2 m前景", "#2b82ac"],
    ["6 m背景", "#777"],
    ["移动相机", "#c1894d"],
  ],
  camera: [58, 36, 66],
  target: [24, 0, 0],
  distance: [30, 160],
  playLabel: "播放相机位移",
  replay: { key: "progress", start: 0, end: 1, seconds: 9 },
  controls: [
    control("translation", "横向平移", -0.3, 0.3, 0.01, 0.15, " m", 2),
    control("yaw", "绕投影中心偏转", -3, 3, 0.1, 1, "°", 1),
    { ...control("plane", "补偿采用的平面深度", 2, 6, 0.25, 6, " m", 2),
      enabled: s => Math.abs(s.translation * s.progress) > 1e-12,
      hint: s => s.progress === 0 ? "当前位姿与参考相同。" :
        s.translation === 0 ? "绕投影中心纯旋转时，映射与平面深度无关。" : "" },
    control("progress", "位姿变化进度", 0, 1, 0.01, 1, "", 2),
  ],
  presets: [
    {
      label: "对齐背景",
      values: { translation: 0.15, yaw: 0, plane: 6, progress: 1 },
    },
    { label: "对齐前景", values: { plane: 2, progress: 1 } },
    { label: "只有旋转", values: { translation: 0, yaw: 2, progress: 1 } },
    {
      label: "横移露出遮挡区域",
      values: { translation: 0.3, yaw: 0, plane: 6, progress: 1 },
    },
    { label: "零位姿差", values: { translation: 0, yaw: 0, progress: 1 } },
  ],
  evaluate(s) {
    const m = parallax(s),
      images = imagePanels(
        [
          {
            label: "1 参考位姿的已知场景",
            values: m.reference.values,
            width: WIDTH,
            height: HEIGHT,
            scale: "参考图由连续场景直接采样",
          },
          {
            label: "2 移动相机的实际观测",
            values: m.moving.values,
            width: WIDTH,
            height: HEIGHT,
            scale: "前景边缘会改变背景可见范围",
          },
          {
            label: "3 单平面补偿",
            values: withMissing(m.global.values, m.global.valid),
            width: WIDTH,
            height: HEIGHT,
            rgb: true,
            scale: `按Z=${number(s.plane, 2)} m重采样`,
          },
          {
            label: "4 逐深度真值对照",
            values: withMissing(m.oracle, m.visible),
            width: WIDTH,
            height: HEIGHT,
            rgb: true,
            scale: "已知深度；缺失处仍标为紫色",
          },
          {
            label: "5 单平面补偿误差",
            values: signedColors(m.error, 0.3, m.common),
            width: WIDTH,
            height: HEIGHT,
            rgb: true,
            gamma: 1,
            scale: "共同区域；蓝负、橙正，固定±0.30",
          },
          {
            label: "6 已知参考深度",
            values: Float64Array.from(m.reference.depth, (z) =>
              z === NEAR ? 0.15 : 0.8,
            ),
            width: WIDTH,
            height: HEIGHT,
            gamma: 1,
            scale: "深灰2 m，浅灰6 m",
          },
        ],
        { title: "前后景场景的观测、补偿和已知参考", tileHeight: 220 },
      );
    return {
      model: m,
      figure: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 740 920" role="img" aria-label="前后景配准静态对照">${plan(m).replace("<svg ", '<svg x="0" y="0" width="740" height="260" ')}${images.figure.replace("<svg ", '<svg x="0" y="260" width="740" height="660" ')}</svg>`,
      liveFigure:
        `<style>@media(max-width:550px){.parallax-plan{display:none}}</style><div class="parallax-plan">${plan(m)}</div>` +
        images.liveFigure,
      figureHeight: 920,
      status: `当前横移${number(m.pose.translation, 3)} m、偏转${number(m.pose.yaw, 2)}°；补偿共用准确位姿，只改变采用的深度。`,
      stats: [
        [
          "前景 / 背景 RMSE",
          `${number(m.nearRmse, 4)} / ${number(m.farRmse, 4)}`,
          "同一共同区域，线性0…1",
        ],
        [
          "单平面 / 逐深度 RMSE",
          `${number(m.rmse, 4)} / ${number(m.oracleRmse, 4)}`,
          "逐深度对照仍有双线性取样误差",
        ],
        ["共同评价像素", String(m.count), `总像素${WIDTH * HEIGHT}`],
        ["缺少四邻域支持", String(m.outside), "投影越界或落在最外行列"],
        ["被前景遮挡", String(m.occluded), "相同方向先击中近处板"],
        ["跨深度的插值邻域", String(m.boundary), "单独剔除，避免混入两层颜色"],
      ],
      reading: `纯横移下，两层像移的差为fΔX(1/Z近−1/Z远)，当前横移对应${number(FOCAL * m.pose.translation * (1 / NEAR - 1 / FAR), 2)} px；叠加偏转后按完整投影计算。紫色表示该路径缺少可用观测；单平面变换可以选定一层，无法同时消除两层之间的视差。`,
    };
  },
};
