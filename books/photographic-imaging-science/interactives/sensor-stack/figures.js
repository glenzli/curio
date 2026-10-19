import { crossSection, routePoint } from "./model.js";
const colors = {
  silicon: "#568eae",
  metal: "#b6843d",
  signal: "#247d91",
  light: "#b77b20",
};
const path = (points) => "M" + points.map((v) => v.join(",")).join("L");
const text = (x, y, value, size = 10, attrs = "") =>
  `<text x="${x}" y="${y}" font-size="${size}" ${attrs}>${value}</text>`;
// Endpoints and layer order come from the functional model. Material details
// identify the layers without adding a process or an optical simulation.
export function structureFigure(input) {
  const m = crossSection(input),
    p = m.progress;
  const light = routePoint(m.photonRoute, Math.min(1, p / 40));
  const electronic = routePoint(
    m.signalRoute,
    Math.max(0, Math.min(1, (p - 60) / 40)),
  );
  const silicon = m.layers.find((l) => l.kind === "silicon"),
    metal = m.layers.find((l) => l.kind === "metal");
  const waferTop = Math.min(silicon.y, metal.y),
    waferBottom = Math.max(silicon.bottom, metal.bottom);
  const layers = m.layers
    .map((l) => {
      const rect = (fill, stroke) =>
        `<rect x="30" y="${l.y}" width="200" height="${l.height}" rx="2" fill="${fill}" stroke="${stroke}" stroke-width=".9"/>`;
      if (l.kind === "optics")
        return `<g data-layer="optics"><defs><clipPath id="stack-optics-clip"><rect x="30" y="30" width="200" height="60"/></clipPath></defs><g clip-path="url(#stack-optics-clip)">${[22, 92, 162, 232].map((x, i) => `<path d="M${x - 33} ${l.y + 11}Q${x} ${l.y - 13} ${x + 33} ${l.y + 11}Z" fill="#dfeaf1" stroke="#82a7bf" stroke-width=".8"/><rect x="${x - 33}" y="${l.y + 15}" width="66" height="9" rx="1" fill="${["#b87168", "#6b9b7b", "#6f95b5", "#6b9b7b"][i]}" fill-opacity=".7"/>`).join("")}</g>${text(160, l.y - 10, "微透镜", 11)}${text(238, l.bottom - 1, "CFA", 9, 'fill="#6c7a83"')}</g>`;
      if (l.kind === "silicon") {
        const surface = l.y;
        return `<g data-layer="silicon">${rect("#e8f1f6", colors.silicon)}<path d="M31 ${surface}H229" stroke="${colors.silicon}" stroke-width="2.5"/><path d="M54 ${l.y + 5}V${l.bottom - 5}M130 ${l.y + 5}V${l.bottom - 5}" stroke="${colors.silicon}" stroke-width=".7" stroke-dasharray="2 3" opacity=".45"/><rect x="62" y="${m.diode.y - 12}" width="60" height="24" rx="11" fill="#c2dfeb" stroke="${colors.silicon}"/>${text(92, m.diode.y + 27, "PPD", 11, 'text-anchor="middle" fill="#265c77"')}${text(176, l.y + 18, "感光硅", 12, 'fill="#265c77"')}${text(176, l.y + 55, m.illumination === "bsi" ? "背面入光" : "前侧入光", 10, 'fill="#4f7488"')}</g>`;
      }
      if (l.kind === "metal")
        return `<g data-layer="metal">${rect("#faf3e8", "#c69a59")}<path d="M35 ${l.y + 6}H69V${l.y + 14}M45 ${l.y + 6}V${l.y + 13}H65" fill="none" stroke="${colors.metal}" stroke-width="2"/><rect x="118" y="${l.y + 5}" width="27" height="8" rx="1" fill="#8a7457"/>${text(35, l.y + 25.5, "前侧布线", 9.5, 'fill="#775a2d"')}${text(118, l.y + 25.5, "晶体管", 9.5, 'fill="#775a2d"')}</g>`;
      if (l.kind === "bond")
        return `<g data-layer="bond">${rect("#f2edf5", "#b49abd")}${[53, 198, 218].map((x) => `<rect x="${x - 3}" y="${l.y + 2}" width="6" height="${l.height - 4}" rx="1" fill="#b49365"/>`).join("")}${text(87, l.center + 3.5, "键合互连", 9, 'fill="#765d80"')}</g>`;
      if (l.kind === "logic")
        return `<g data-layer="logic">${rect("#e7f1eb", "#70a28b")}${[42, 58, 74].map((x) => `<rect x="${x}" y="${l.y + 12}" width="10" height="18" rx="1" fill="#c3dbcd" stroke="#80a991" stroke-width=".6"/>`).join("")}<path d="M41 ${l.y + 8}H86M41 ${l.bottom - 8}H86" stroke="#80a991" stroke-width=".7"/>${text(107, l.y + 13, "独立逻辑晶圆", 11, 'fill="#30694f"')}${text(107, l.y + 39, "信号处理 / ADC 等", 9, 'fill="#4e7660"')}</g>`;
      return `<g data-layer="support">${rect("#edf0f0", "#a5b1af")}<path d="M35 ${l.bottom - 5}l12 -12m0 12l12 -12m0 12l12 -12m0 12l12 -12" stroke="#bac4c1" stroke-width=".8"/>${text(167, l.center + 3.5, "承载基底", 11, 'text-anchor="middle" fill="#647570"')}</g>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 385" fill="currentColor" style="font-family:ui-sans-serif,-apple-system,'PingFang SC',sans-serif;color:var(--text,#293744)" role="img" aria-label="${m.illumination.toUpperCase()}${m.stacked ? "逻辑堆栈" : "同片电路"}功能截面，入光和电子路径分开"><defs><marker id="stack-light-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L6 3L0 6Z" fill="${colors.light}"/></marker><marker id="stack-signal-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L6 3L0 6Z" fill="${colors.signal}"/></marker></defs>${text(31, 21, "入射光", 10, 'fill="currentColor"')}<path d="M92 9V31" stroke="${colors.light}" stroke-width="1.5" marker-end="url(#stack-light-arrow)"/>${layers}<path d="M240 ${waferTop}h5V${waferBottom}h-5" fill="none" stroke="${colors.silicon}" stroke-width=".8"/><text x="261" y="${(waferTop + waferBottom) / 2}" text-anchor="middle" font-size="9" fill="currentColor" transform="rotate(90 261 ${(waferTop + waferBottom) / 2})">像素晶圆</text><path data-route="photon" d="${path(m.photonRoute)}" fill="none" stroke="${colors.light}" stroke-width="1.5" stroke-dasharray="4 3" opacity=".75" marker-end="url(#stack-light-arrow)"/><path data-route="electronic" d="${path(m.signalRoute)}" fill="none" stroke="${colors.signal}" stroke-width="1.7" stroke-linejoin="round" opacity="${p < 60 ? ".3" : ".8"}" marker-end="url(#stack-signal-arrow)"/>${p <= 40 ? `<circle cx="${light[0]}" cy="${light[1]}" r="3.5" fill="${colors.light}" stroke="#fff"/>` : p < 60 ? `<circle cx="${m.diode.x}" cy="${m.diode.y}" r="${7 + (p - 40) / 3}" fill="${colors.light}" fill-opacity=".2"/><circle cx="${m.diode.x}" cy="${m.diode.y}" r="3.5" fill="${colors.light}"/>` : `<circle cx="${electronic[0]}" cy="${electronic[1]}" r="3.5" fill="${colors.signal}" stroke="#fff"/>`}<path d="M30 353H245" stroke="currentColor" stroke-width=".5" opacity=".15"/>${text(30, 369, m.stacked ? "信号经键合互连进入逻辑晶圆" : "像素与本图读出电路位于同一晶圆", 10, 'fill="currentColor"')}</svg>`;
}
