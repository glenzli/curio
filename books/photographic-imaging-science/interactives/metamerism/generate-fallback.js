import { writeFile } from "node:fs/promises";
import { spectralPair, quadratureTruth } from "./model.js";
import { reflectanceFigure, responseFigure, readoutFigure } from "./figures.js";
const m = spectralPair(),
  changed = spectralPair({ tilt: 0.6 }),
  t = quadratureTruth(m.a, m.illuminant, m.response),
  embed = (svg, x, y, w, h) =>
    svg.replace("<svg ", `<svg x="${x}" y="${y}" width="${w}" height="${h}" `);
await writeFile(
  new URL("./fallback.svg", import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="930" viewBox="0 0 800 930" role="img" aria-label="互动示意：四波段相机同色异谱及换照明后的响应差" style="color:#263c33;font:14px sans-serif"><style>text{fill:currentColor;font-family:sans-serif}</style><rect width="800" height="930" fill="#fafbf9"/><text x="30" y="42" font-size="24">两条反射率，三个相同的相机响应</text><text x="30" y="76">四个等宽波段 · 参照照明 E=(1,1,1,1) · a=0.35</text>${embed(reflectanceFigure(m), 30, 100, 740, 312)}${embed(responseFigure(m), 30, 420, 740, 235)}${embed(readoutFigure(m), 30, 655, 740, 200)}<text x="30" y="880">真值 Sq=0；独立积分A=(${t.map((v) => v.toFixed(2)).join(", ")})。</text><text x="30" y="907">换照明 τ=0.6：Δ(R,G,B)=(${changed.cameraA.map((v, k) => (v - changed.cameraB[k]).toFixed(2)).join(", ")})；不表示人眼色差。</text></svg>`,
);
