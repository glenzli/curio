import { CHANNELS } from "../bayer/model.js";
export function frequencyPanels(terms) {
  const colors = ["#40879a", "#bb7946", "#8b78aa"];
  const bodies = CHANNELS.map((channel) => {
    const x = (v) => 120 + 90 * v,
      y = (v) => 132 - 90 * v;
    const cell =
      channel === "G"
        ? [
            [0.5, 0],
            [0, 0.5],
            [-0.5, 0],
            [0, -0.5],
            [0.5, 0],
          ]
        : [
            [0.25, 0.25],
            [-0.25, 0.25],
            [-0.25, -0.25],
            [0.25, -0.25],
            [0.25, 0.25],
          ];
    let body = `<text x="12" y="24" style="font-size:14px">${channel}采样的等价频率</text><path d="M30 132H210M120 42V222" stroke="currentColor" opacity=".2"/><path d="${cell.map((p, i) => `${i ? "L" : "M"}${x(p[0])} ${y(p[1])}`).join(" ")}" fill="none" stroke="currentColor" stroke-dasharray="4 3"/>`;
    terms.forEach((m, i) => {
      const a = m.aliases[channel];
      for (const sign of [-1, 1])
        body += `<path d="M${x(sign * m.fx)} ${y(sign * m.fy)}L${x(sign * a.fx)} ${y(sign * a.fy)}" stroke="${colors[i]}" opacity=".4"/><circle cx="${x(sign * m.fx)}" cy="${y(sign * m.fy)}" r="3.5" fill="${colors[i]}"/><circle cx="${x(sign * a.fx)}" cy="${y(sign * a.fy)}" r="5.5" fill="none" stroke="${colors[i]}" stroke-width="1.5"/>`;
    });
    body += `<text x="32" y="245" style="font-size:12px">fx、fy：−1…+1 cycle/px</text>${colors.map((color, i) => `<text x="${34 + i * 65}" y="265" style="font-size:12px;fill:${color}">分量${i + 1}</text>`).join("")}`;
    return body;
  });
  const figure = `<svg class="drawing" role="img" aria-label="各颜色采样格点的频率单元与多分量混叠位置" viewBox="0 0 720 270"><style>text{fill:currentColor;font-family:inherit}</style>${bodies.map((b, i) => `<g transform="translate(${i * 240} 0)">${b}</g>`).join("")}</svg>`;
  const liveFigure = `<style>.bayer-frequency{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}.bayer-frequency text{fill:currentColor;font-family:inherit}@media(max-width:550px){.bayer-frequency{grid-template-columns:1fr}}</style><h4>每个分量的正、负频率 · 实心为原频率，空心为等价频率</h4><div class="bayer-frequency">${bodies.map((b, i) => `<svg class="drawing" role="img" aria-label="${CHANNELS[i]}通道的频率单元与混叠位置" viewBox="0 0 240 270">${b}</svg>`).join("")}</div>`;
  return { figure, liveFigure };
}
