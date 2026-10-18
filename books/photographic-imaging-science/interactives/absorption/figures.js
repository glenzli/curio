import { number } from "../common/lesson-view.js";
export function depthFigure(s, m, probe) {
  const x = (z) => 88 + (502 * z) / s.depth,
    cy = 94,
    dead = Math.min(s.dead, s.depth);
  const points = Array.from({ length: 81 }, (_, i) => {
    const z = (s.depth * i) / 80;
    return [x(z), m.survival(z) * 26];
  });
  const band =
    points.map(([a, b], i) => `${i ? "L" : "M"}${a} ${cy - b}`).join(" ") +
    points
      .toReversed()
      .map(([a, b]) => `L${a} ${cy + b}`)
      .join(" ") +
    "Z";
  return `<svg class="drawing" viewBox="0 0 640 215" role="img" aria-label="硅层厚度、入口失效层与随深度衰减的未吸收光子比例"><defs><pattern id="dead-layer" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M-1 1L6 8M6-6L13 1" stroke="currentColor" stroke-opacity=".18"/></pattern></defs><text x="18" y="22" style="font-size:14px">硅层截面 · 厚度按当前参数绘制</text><rect x="88" y="53" width="502" height="83" rx="3" fill="#4b8ba9" fill-opacity=".11" stroke="#4b8ba9" stroke-opacity=".5"/><rect x="88" y="53" width="${x(dead) - 88}" height="83" fill="url(#dead-layer)"/><path d="${band}" fill="#c08a35" fill-opacity=".25" stroke="#c08a35" stroke-width="1.3"/><path d="M18 94H76m-7-5 7 5-7 5" fill="none" stroke="#c08a35" stroke-width="2"/><path d="M88 52V137" stroke="currentColor" opacity=".45"/><path d="M${x(probe)} 43V145" stroke="#397f9f" stroke-width="2" stroke-dasharray="4 3"/><text x="${Math.min(580, Math.max(160, x(probe)))}" y="40" text-anchor="end" style="font-size:12px">探针 ${number(probe, 2)} μm</text><text x="18" y="117" style="font-size:12px">入光</text><text x="580" y="73" text-anchor="end" style="font-size:12px">感光硅</text><text x="88" y="162" style="font-size:12px">斜线区：硅内失效层 ${number(dead, 1)} μm</text><text x="88" y="183" style="font-size:12px">橙带粗细：未吸收光子占入射光子的比例</text><text x="88" y="206" style="font-size:12px">界面反射 ${number(100 * s.reflection, 0)}%</text><text x="590" y="206" text-anchor="end" style="font-size:12px">硅厚度 ${number(s.depth, 1)} μm</text></svg>`;
}
