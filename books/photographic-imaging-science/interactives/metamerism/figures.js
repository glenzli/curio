import { EDGES } from "./model.js";
const A = "#40879a",
  B = "#bb7946",
  channels = ["#b56561", "#529176", "#597fba"];
const path = (values, X, Y) =>
  values
    .flatMap((v, j) => [
      `${j ? "L" : "M"}${X(EDGES[j])},${Y(v)}`,
      `L${X(EDGES[j + 1])},${Y(v)}`,
    ])
    .join(" ");
function axes(yMax, label) {
  const X = (x) => 48 + ((x - 400) / 300) * 552,
    Y = (y) => 212 - (y / yMax) * 165;
  return {
    X,
    Y,
    svg: `<path d="M48 40V212H600" stroke="currentColor" fill="none" opacity=".4"/>${EDGES.map((x) => `<text x="${X(x)}" y="235" text-anchor="middle">${x}</text>`).join("")}<text x="48" y="22">${label}</text><text x="600" y="258" text-anchor="end">波长 / nm</text>${[0, yMax / 2, yMax].map((y) => `<text x="38" y="${Y(y) + 4}" text-anchor="end">${y.toFixed(1)}</text>`).join("")}`,
  };
}
export function reflectanceFigure(m) {
  const { X, Y, svg } = axes(1, "反射率 ρ · 无单位");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 270" role="img" aria-label="两条反射率及当前积分波段"><rect x="48" y="40" width="${(552 * m.progress) / 100}" height="172" fill="${A}" opacity=".08"/>${svg}<path d="${path(m.a, X, Y)}" fill="none" stroke="${A}" stroke-width="3"/><path d="${path(m.b, X, Y)}" fill="none" stroke="${B}" stroke-width="3" stroke-dasharray="7 4"/><text x="350" y="22" fill="${A}">A 实线</text><text x="470" y="22" fill="${B}">B 虚线</text></svg>`;
}
export function responseFigure(m) {
  const { X, Y, svg } = axes(1, "相机响应 s · 归一化教学值");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 270" role="img" aria-label="三个相机通道的分段响应">${svg}${m.response.map((r, k) => `<path d="${path(r, X, Y)}" fill="none" stroke="${channels[k]}" stroke-width="${4 - k}" stroke-dasharray="${["", "8 4", "2 4"][k]}"/><text x="${470 + k * 45}" y="22" fill="${channels[k]}">${["R", "G", "B"][k]}</text>`).join("")}</svg>`;
}
export function readoutFigure(m) {
  const max = 2,
    X = (v) => 135 + (v / max) * 420;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 232" role="img" aria-label="两条光谱的三个线性相机响应，轮廓为完整积分，实色为当前进度"><text x="20" y="20">相对线性响应 · 各波段贡献相加</text>${[
    0, 1, 2,
  ]
    .map((k) => {
      const y = 48 + k * 54;
      return `<text x="20" y="${y + 18}">${["R", "G", "B"][k]}</text><text x="88" y="${y + 5}">A</text><text x="88" y="${y + 27}">B</text>${[
        [m.cameraA[k], m.partialA[k], A, y - 8],
        [m.cameraB[k], m.partialB[k], B, y + 14],
      ]
        .map(
          ([full, partial, c, yy]) =>
            `<rect x="135" y="${yy}" width="${X(full) - 135}" height="15" fill="none" stroke="${c}"/><rect x="135" y="${yy}" width="${X(partial) - 135}" height="15" fill="${c}"/><text x="${X(full) + 8}" y="${yy + 12}">${full.toFixed(3)}</text>`,
        )
        .join("")}`;
    })
    .join(
      "",
    )}<path d="M135 201H555" stroke="currentColor" opacity=".4"/>${[0, 0.5, 1, 1.5, 2].map((v) => `<text x="${X(v)}" y="222" text-anchor="middle">${v}</text>`).join("")}</svg>`;
}
