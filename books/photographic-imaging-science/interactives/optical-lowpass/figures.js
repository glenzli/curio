import { number, escape } from "../common/lesson-view.js";

function kernelPlot(m) {
  const cx = 177, cy = 130, scale = 58,
    points = m.kernel.map((b, i) => `<circle cx="${cx + scale * b.x}" cy="${cy - scale * b.y}" r="7" fill="#40879a" stroke="white" stroke-width="1.5"/><text x="${cx + scale * b.x + (b.x < 0 ? -12 : 12)}" y="${cy - scale * b.y + (b.y < 0 ? 22 : -12)}" text-anchor="${b.x < 0 ? "end" : "start"}" style="font-size:12px">${i + 1} · ${number(b.weight, 2)}</text>`).join("");
  return `<path d="M82,${cy}H272M${cx},45V215" stroke="currentColor" stroke-opacity=".23"/><rect x="${cx - scale / 2}" y="${cy - scale / 2}" width="${scale}" height="${scale}" fill="#bb7946" fill-opacity=".08" stroke="#bb7946" stroke-dasharray="4 3"/><circle cx="${cx}" cy="${cy}" r="3" fill="currentColor"/>${points}<path d="M${cx - scale / 2},217v6h${scale}v-6" fill="none" stroke="#bb7946"/><text x="${cx}" y="239" text-anchor="middle" style="font-size:12px">1 px = 4 μm</text>`;
}
function kernelNotes(m) {
  return [
    ["单点", "水平方向两点", "水平、垂直各分一次"][m.mode],
    `两点中心间隔 d = ${number(m.mode ? m.separation : 0, 2)} px`,
    "蓝点数字是各副像的通量权重",
    "橙框：一个像素节距；各方向同一比例",
    "理想点核，尚未加入镜头PSF或像素面积",
  ];
}
export function kernelFigure(m) {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="drawing" role="img" aria-label="分光核的点位置与一个像素节距参照" viewBox="0 0 720 245"><rect x="3" y="3" width="714" height="238" rx="7" fill="none" stroke="currentColor" stroke-opacity=".2"/><text x="18" y="27" style="font-size:16px;font-weight:600">等权移位核：点像中心的位置</text>${kernelPlot(m)}${kernelNotes(m).map((line,i)=>`<text x="330" y="${75+i*30}" style="font-size:13px">${escape(line)}</text>`).join("")}</svg>`;
}
export function liveKernel(m) {
  return `<style>.olpf-kernel{border:1px solid var(--line,#aaa);border-radius:8px;padding:12px}.olpf-kernel h4{margin:0 0 8px!important;font-size:14px!important}.olpf-kernel-grid{display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);align-items:center;gap:16px}.olpf-kernel svg{display:block;width:100%;max-width:300px;margin:auto;fill:currentColor}.olpf-kernel-notes{font-size:12px;line-height:1.8}.olpf-kernel-notes p{opacity:1;margin:7px 0}@media(max-width:550px){.olpf-kernel-grid{grid-template-columns:1fr;gap:4px}}</style><section class="olpf-kernel"><h4>等权移位核：点像中心的位置</h4><div class="olpf-kernel-grid"><svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="分光点位置和一个像素节距" viewBox="35 36 285 209">${kernelPlot(m)}</svg><div class="olpf-kernel-notes">${kernelNotes(m).map(line=>`<p>${escape(line)}</p>`).join("")}</div></div></section>`;
}
