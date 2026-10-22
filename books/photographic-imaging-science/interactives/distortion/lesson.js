import { distortion, radialMap } from "./model.js";
import { control, curve, grid, number, colors } from "../common/lesson-view.js";
export const spec = {
  title: "畸变改变坐标，也改变局部采样尺度",
  alt: "互动示意：径向畸变网格、逆映射与局部面积尺度",
  intro:
    "用单一径向系数映射方格。网格弯曲与点像模糊是不同问题；这里计算坐标和Jacobian，不给网格额外加模糊。",
  staticCaption: "归一化方形像场，k=−0.12；探针半径1。",
  note: "径向映射(x,y)→(1+kr²)(x,y)，输入正方形[-1,1]²；k∈[-0.15,0.15]保证全域径向单调。逆映射校正几何坐标，图像还需重采样；采集时的像素积分、混叠与光学模糊仍会影响细节。",
  controls: [
    control("coefficient", "径向系数 k", -0.15, 0.15, 0.01, -0.12, "", 2),
    control("radius", "半径探针", 0, 1.4, 0.05, 1, "", 2),
  ],
  presets: [
    { label: "桶形", values: { coefficient: -0.12, radius: 1 } },
    { label: "无畸变", values: { coefficient: 0, radius: 1 } },
    { label: "枕形", values: { coefficient: 0.12, radius: 1 } },
  ],
  evaluate(s) {
    const m = distortion(s),
      scale = 90,
      center = [
        [170, 160],
        [460, 160],
      ],
      path = (points, c) =>
        points
          .map(
            ([x, y], i) =>
              `${i ? "L" : "M"}${c[0] + scale * x},${c[1] - scale * y}`,
          )
          .join(" ");
    let lines = "";
    for (let j = -4; j <= 4; j++) {
      const v = j / 4;
      for (const vertical of [false, true]) {
        const pts = grid(-1, 1, (u) => u, 40).map(([u]) =>
          vertical ? [v, u] : [u, v],
        );
        lines += `<path d="${path(pts, center[0])}" stroke="#777"/><path d="${path(
          pts.map(([x, y]) => radialMap(x, y, s.coefficient)),
          center[1],
        )}" stroke="${colors[0]}"/>`;
      }
    }
    // Keep the measured radius visible in both coordinate systems. A diagonal
    // probe remains inside the declared square even when r exceeds one.
    const probe = [s.radius / Math.SQRT2, s.radius / Math.SQRT2],
      mappedProbe = radialMap(...probe, s.coefficient);
    const probes = [probe, mappedProbe].map(([x, y], i) =>
      `<circle cx="${center[i][0] + scale * x}" cy="${center[i][1] - scale * y}" r="5" fill="#8b62a5" stroke="white" stroke-width="1.5"/>`,
    ).join("");
    return {
      figure: `<svg class="drawing" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 344" role="img" aria-label="原始方格、径向畸变方格与紫色半径探针"><g fill="none" stroke-width="1.5">${lines}</g>${probes}<text x="170" y="26" text-anchor="middle">原始坐标</text><text x="460" y="26" text-anchor="middle">畸变后坐标</text><text x="320" y="306" text-anchor="middle">紫点：45°方向的同一半径探针</text><text x="320" y="331" text-anchor="middle">两幅图使用相同坐标尺度</text></svg>`,
      figureHeight: 344,
      panels: [
        {
          title: "局部径向与切向放大率",
          xMax: Math.SQRT2,
          xLabel: "归一化半径 r",
          yLabel: "局部尺度",
          yMax: 2,
          markers: [{ value: s.radius, label: "探针" }],
          curves: [
            curve(
              "径向 1+3kr²",
              grid(0, Math.SQRT2, (r) => 1 + 3 * s.coefficient * r * r),
            ),
            curve(
              "切向 1+kr²",
              grid(0, Math.SQRT2, (r) => 1 + s.coefficient * r * r),
              1,
            ),
          ],
        },
      ],
      stats: [
        ["径向位置变化", number(100 * m.relative, 1) + "%", "相对同一理想半径"],
        ["局部面积比例", number(m.jacobian, 3), "径向×切向Jacobian"],
        ["径向 / 切向尺度", `${number(m.radial, 3)} / ${number(m.tangent, 3)}`, "紫色探针处读取"],
        ["逆映射半径", number(m.inverted, 6), `原始 ${number(s.radius, 6)}`],
      ],
      reading:
        "单调域内用二分求逆，并与已知原始坐标对照。面积Jacobian描述采样密度变化；它不是相对照度、通光率或MTF。实际校正后的角落细节还取决于裁剪、插值和原始采样。",
    };
  },
};
