import { ghost, surfaces, pairs } from "./model.js";
import { ghostFigures, legNames } from "./figures.js";
import { control, curve, number } from "../common/lesson-view.js";
export const spec = {
  title: "双反射光路：去程、返程与像面",
  alt: "互动示意：两片教学镜片的双反射路径、孔径截断、落点与Fresnel功率",
  intro:
    "S1、S2围成镜片1，S3、S4围成镜片2。按①②选择两处反射面，再沿步骤框追踪同一束光的三段行程；细虚线保留直接透射的主光路作比较。",
  staticCaption:
    "两片球面教学镜片，入射2°、41条等权子午光线；S3→S2反射；像面z=83 mm，光阑半径3 mm。",
  note: "单色几何光学计算：镜片1的折射率取1.52，镜片2取1.60，空气取1；材料无吸收，表面无镀膜。全局坐标(z,y)用mm，R>0表示曲率中心在顶点右侧。各表面净半口径7 mm，光阑位于z=8 mm。方向按Snell定律求解，s/p功率各沿完整路径累乘。光路图抽画5条代表光线，落点与功率使用全部41条。功率百分比以41条等权子午光线为分母；二维瞳积分和像面辐照度需另算。颜色、线型与宽度用于辨认行程，亮度不表示能量。回放按界面步骤推进，表格和功率读数保留完整路径结果。计算范围为所选的双反射组合，散射、衍射和传感器反射未计入。",
  controls: [
    control("angle", "光源入射角", -4, 4, 0.25, 2, "°", 2),
    control("radius", "入射光束半宽", 0.5, 5, 0.1, 3.8, " mm", 1),
    control("stop", "空气光阑半径", 0.5, 6, 0.1, 3, " mm", 1),
    control("sensor", "像面 z", 16, 180, 1, 83, " mm"),
    {
      ...control("pair", "反射界面 · 按发生顺序", 0, 2, 1, 0),
      format: (v) => {
        const [a, b] = pairs[v];
        return `① S${a + 1} → ② S${b + 1}`;
      },
    },
    control("progress", "路径步骤进度", 0, 1, 0.01, 1, "", 2),
  ],
  presets: [
    {
      label: "S3 → S2 · 相邻两面",
      values: { pair: 0, angle: 2, sensor: 83, stop: 3, progress: 1 },
    },
    {
      label: "S4 → S1 · 跨两片镜片",
      values: { pair: 1, angle: 2, sensor: 83, stop: 3, progress: 1 },
    },
    {
      label: "S4 → S2 · 虚交点",
      values: { pair: 2, angle: 0, sensor: 83, stop: 3, progress: 1 },
    },
    {
      label: "S3 → S2 · 像面16 mm",
      values: { pair: 0, angle: 0, sensor: 16, stop: 3, progress: 1 },
    },
    {
      label: "S3 → S2 · 小光阑",
      values: { pair: 0, angle: 3, sensor: 83, stop: 0.8, progress: 1 },
    },
  ],
  replay: {
    key: "progress",
    start: 0,
    end: 1,
    durationMs: 10000,
    startOnFirstPlay: true,
    label: "逐段追迹光路",
  },
  evaluate(s) {
    const m = ghost(s),
      ref = m.ghostReference,
      primary = m.primaryReference;
    const { figure, liveFigure, figureHeight, projection } = ghostFigures(m);
    const center = m.secondary[20];
    const tableRows = surfaces.map((v, i) => [
      `S${i + 1} · 镜片${i < 2 ? 1 : 2}${i % 2 ? "后" : "前"}表面`,
      `${v.z}`,
      `${v.R}`,
      `${v.left} → ${v.right}`,
      "7",
    ]);
    let reflection = 0;
    const pathRows = center.interactions.map((v, i) => {
      if (v.kind === "R") reflection++;
      return [
        `${i + 1}. S${v.index + 1} · ${v.kind === "R" ? `反射${reflection === 1 ? "①" : "②"}` : "透射"}`,
        `${v.before[0] > 0 ? "→" : "←"} ${v.after[0] > 0 ? "→" : "←"}`,
        number(v.point[1], 4),
        `${number(100 * v.Rs, 3)} / ${number(100 * v.Rp, 3)}`,
        number(100 * (v.ws + v.wp), 5),
      ];
    });
    const table = (heads, rows, current = -1) =>
      `<div class="table-scroll"><table><tr>${heads.map((v) => `<th>${v}</th>`).join("")}</tr>${rows.map((row, i) => `<tr ${i === current ? 'aria-current="step" style="font-weight:650;background:color-mix(in srgb,currentColor 6%,transparent)"' : ""}>${row.map((v) => `<td>${v}</td>`).join("")}</tr>`).join("")}</table></div>`;
    const landingBound = Math.max(
      10,
      10 *
        Math.ceil(
          Math.max(
            ...[...m.primary, ...m.secondary]
              .filter((r) => !r.reason)
              .map((r) => Math.abs(r.sensorY)),
            0,
          ) / 10,
        ),
    );
    return {
      figure,
      liveFigure,
      figureHeight,
      panels: [
        {
          title: "41条光线的像面落点",
          xMin: -5,
          xMax: 5,
          xLabel: "入射高度 / mm",
          yMin: -landingBound,
          yMax: landingBound,
          yLabel: "像面高度 / mm",
          curves: [
            {
              ...curve(
                "主光路",
                m.primary.flatMap((r, i) =>
                  r.reason ? [] : [[m.launch[i], r.sensorY]],
                ),
                3,
                true,
              ),
              color: "#969fa6",
            },
            {
              ...curve(
                "双反射光路",
                m.secondary.flatMap((r, i) =>
                  r.reason ? [] : [[m.launch[i], r.sensorY]],
                ),
                0,
              ),
              color: "#42768d",
            },
          ],
        },
      ],
      stats: [
        [
          "主光路 / 双反射功率",
          `${number(100 * m.primaryPower, 3)}% / ${number(100 * m.ghostPower, 5)}%`,
          "相对于同一组等权入射光线",
        ],
        [
          "到达像面的光线 · 主 / 双反射",
          `${m.primary.filter((r) => !r.reason).length} / ${m.secondary.filter((r) => !r.reason).length}`,
          "各41条；孔径截断后终止追迹",
        ],
        [
          "中央光线所在位置",
          projection.location,
          `${legNames[projection.currentLeg]}${center.reason ? `；${center.reason}` : ""}`,
        ],
      ],
      reading: `轴上极限对照：近轴矩阵给出主光路焦点z=${number(primary.focus, 6)} mm，双反射光路${ref.focus < 15 ? "出射线的反向延长交点" : "实焦点"}z=${number(ref.focus, 6)} mm。另以入射高度10⁻⁴ mm、角度0逐面追迹球面，得到z=${number(ref.rayFocus, 6)} mm，差${Math.abs(ref.focus - ref.rayFocus).toExponential(2)} mm。当前有限口径、离轴光束的落点见上图。正入射且无遮挡时，Fresnel乘积给出的双反射功率为${number(100 * ref.normal, 6)}%，轴上追迹为${number(100 * ref.axialWeight, 6)}%。`,
      table: `<h4>镜片与表面参数</h4>${table(["表面归属", "顶点 z / mm", "R / mm", "n左 → n右", "净半口径 / mm"], tableRows)}<h4>中央光线：逐面记录</h4>${table(["步骤", "入射 → 出射方向", "命中 y / mm", "Rs / Rp · %", "累计功率 · %"], pathRows, center.interactions.indexOf(projection.next ?? projection.latest))}`,
      staticRows: [
        "界面 | 顶点z(mm) | R(mm) | n左→n右 | 净半口径(mm)",
        ...tableRows.map((row) => row.join(" | ")),
        "步骤 | 入射/出射方向 | 命中y(mm) | Rs/Rp(%) | 累计功率(%)",
        ...pathRows.map((row) => row.join(" | ")),
      ],
    };
  },
};
