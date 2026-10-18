import { crossSection, routePoint } from "./model.js";
const colors = {
  optics: "#a7bfae",
  silicon: "#6ba1ba",
  metal: "#c19c71",
  support: "#9caaa5",
  bond: "#bda2bd",
  logic: "#85aa94",
};
export function structureFigure(input) {
  const m = crossSection(input),
    p = m.progress,
    light = routePoint(m.photonRoute, Math.min(1, p / 40)),
    electronic = routePoint(
      m.signalRoute,
      Math.max(0, Math.min(1, (p - 60) / 40)),
    );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 420" style="font:12px sans-serif" role="img" aria-label="${m.illumination.toUpperCase()}${m.stacked ? "逻辑堆栈" : "同片电路"}功能截面，入光和电子路径分开"><text x="30" y="17">入光 ↓</text>${m.layers
    .map((l) => {
      const body = `<rect x="30" y="${l.y}" width="200" height="${l.height}" rx="3" fill="${colors[l.kind]}" fill-opacity=".18" stroke="${colors[l.kind]}"/>`;
      if (l.kind === "silicon")
        return (
          body +
          `<text x="148" y="${l.y + 15}">${m.illumination === "bsi" ? "背面入光" : "感光硅"}</text><rect x="62" y="${m.diode.y - 12}" width="60" height="24" rx="10" fill="${colors.silicon}" fill-opacity=".35" stroke="${colors.silicon}"/><text x="92" y="${m.diode.y + 25}" text-anchor="middle">PPD</text>`
        );
      if (l.kind === "metal")
        return (
          body +
          `<rect x="34" y="${l.y + 5}" width="38" height="${l.height - 10}" fill="${colors.metal}"/><rect x="113" y="${l.y + 5}" width="113" height="${l.height - 10}" fill="${colors.metal}" fill-opacity=".5"/><text x="169" y="${l.center + 4}" text-anchor="middle">晶体管 / 金属</text>`
        );
      if (l.kind === "optics")
        return (
          body +
          `<path d="M43 ${l.y + 10}Q74 ${l.y - 13}105 ${l.y + 10}M132 ${l.y + 10}Q163 ${l.y - 13}194 ${l.y + 10}" fill="none" stroke="${colors.optics}"/><text x="130" y="${l.bottom - 4}" text-anchor="middle">微透镜 / CFA</text>`
        );
      if (l.kind === "bond")
        return (
          body +
          `<path d="M53 ${l.y}V${l.bottom}M198 ${l.y}V${l.bottom}" stroke="${colors.bond}" stroke-width="4"/><text x="124" y="${l.center + 4}" text-anchor="middle">键合互连</text>`
        );
      return (
        body +
        `<text x="130" y="${l.center + 4}" text-anchor="middle">${l.kind === "logic" ? "独立逻辑晶圆" : "承载基底"}</text>`
      );
    })
    .join(
      "",
    )}<path d="M${m.photonRoute.map((v) => v.join(",")).join("L")}" fill="none" stroke="#c89235" stroke-width="2" stroke-dasharray="4 3" opacity=".65"/><path d="M${m.signalRoute.map((v) => v.join(",")).join("L")}" fill="none" stroke="#40879a" stroke-width="2" stroke-dasharray="3 3" opacity=".6"/>${p <= 40 ? `<circle cx="${light[0]}" cy="${light[1]}" r="5" fill="#c89235"/>` : p < 60 ? `<circle cx="${m.diode.x}" cy="${m.diode.y}" r="${7 + (p - 40) / 3}" fill="#c89235" fill-opacity=".3"/>` : `<circle cx="${electronic[0]}" cy="${electronic[1]}" r="5" fill="#40879a"/>`}<text x="30" y="398">${m.stacked ? "电信号跨键合界面到逻辑晶圆" : "本图读出链留在像素晶圆"}</text><text x="30" y="416">非工艺比例 · 不计算QE或读速</text></svg>`;
}
