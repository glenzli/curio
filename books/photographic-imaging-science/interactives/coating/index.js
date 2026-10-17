import { experiment } from "../common/ui.js";
import { film, quarterWave } from "./model.js";

const fmt = (x, digits = 2) =>
  x.toLocaleString("zh-CN", { maximumFractionDigits: digits });
const colors = { front: "#b47b43", returning: "#448b98", total: "#8b78aa" };
const svg = (label, content, width = 420, height = 250) =>
  `<svg role="img" aria-label="${label}" viewBox="0 0 ${width} ${height}">${content}</svg>`;

function spectrum(state, values) {
  const selected = film(state),
    max = Math.max(0.05, ...values.map((v) => v.R), selected.bare) * 1.12;
  const x = (w) => 48 + ((w - 400) / 300) * 350,
    y = (r) => 202 - (r / max) * 166;
  let content = `<text x="48" y="16">强度反射率 / %</text>`;
  for (let i = 0; i <= 4; i++) {
    const value = (max * i) / 4;
    content += `<path d="M48 ${y(value)}H398" stroke="currentColor" opacity=".1"/><text x="42" y="${y(value) + 4}" text-anchor="end">${fmt(value * 100, 1)}</text>`;
  }
  for (const w of [400, 450, 500, 550, 600, 650, 700])
    content += `<text x="${x(w)}" y="222" text-anchor="middle">${w}</text>`;
  content += `<path d="M48 ${y(selected.bare)}H398" stroke="currentColor" opacity=".5" stroke-dasharray="5 4"/><path d="${values.map((v, i) => `${i ? "L" : "M"}${x(400 + i)},${y(v.R)}`).join(" ")}" stroke="${colors.returning}" stroke-width="2.2" fill="none"/><path d="M${x(state.wavelength)} 30V202" stroke="${colors.total}" opacity=".6"/><circle cx="${x(state.wavelength)}" cy="${y(selected.R)}" r="4" fill="${colors.total}"/><text x="225" y="246" text-anchor="middle">真空波长 / nm</text>`;
  return svg("单层膜与未镀膜界面的可见光反射率", content);
}

function phasor(m) {
  // Both axes share one amplitude scale; arrow geometry is quantitatively meaningful.
  const size =
    Math.max(
      0.12,
      Math.abs(m.front[0]),
      ...m.returning.map(Math.abs),
      ...m.r.map(Math.abs),
    ) * 1.4;
  const scale = 90 / size,
    x = (a) => 148 + a * scale,
    y = (b) => 124 - b * scale;
  let content = `<defs><marker id="coating-front" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="${colors.front}"/></marker><marker id="coating-return" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="${colors.returning}"/></marker><marker id="coating-total" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="${colors.total}"/></marker></defs><path d="M25 124H273M148 30V218" stroke="currentColor" opacity=".17"/><circle cx="148" cy="124" r="${0.1 * scale}" fill="none" stroke="currentColor" opacity=".13"/><text x="270" y="141" text-anchor="end">Re</text><text x="157" y="36">Im</text><text x="15" y="16">相对入射场的复振幅</text>`;
  const arrows = [
    [0, 0, m.front[0], m.front[1], "front"],
    [m.front[0], m.front[1], m.r[0], m.r[1], "return"],
    [0, 0, m.r[0], m.r[1], "total"],
  ];
  for (const [a, b, c, d, key] of arrows) {
    const color = key === "return" ? colors.returning : colors[key];
    if (Math.hypot(c - a, d - b) > 1e-10)
      content += `<path d="M${x(a)} ${y(b)}L${x(c)} ${y(d)}" stroke="${color}" fill="none" stroke-width="${key === "total" ? 2.8 : 1.7}" marker-end="url(#coating-${key})" ${key === "total" ? 'stroke-dasharray="4 3"' : ""}/>`;
  }
  content += `<circle cx="${x(m.r[0])}" cy="${y(m.r[1])}" r="3" fill="${colors.total}"/><text x="148" y="238" text-anchor="middle">圆半径 = 0.1；两轴等比例</text>`;
  return svg(
    "上界面反射振幅加膜内全部返回振幅等于总反射振幅",
    content,
    300,
    250,
  );
}

function layer(state, m) {
  const d = state.thickness;
  let content = `<rect x="92" y="52" width="112" height="58" fill="#448b9819"/><path d="M20 52H280M20 110H280" stroke="currentColor" opacity=".35"/><text x="18" y="26">空气 · n₀ = 1</text><text x="18" y="82">薄膜</text><text x="18" y="139">基底 · nₛ = ${fmt(state.ns, 3)}</text><text x="210" y="78">n꜀ = ${fmt(state.nc, 4)}</text><text x="210" y="97">${fmt(d)} nm</text><path d="M118 29V52L145 28M118 52L145 110L173 52L200 28" stroke="${colors.returning}" stroke-width="1.6" fill="none"/><path d="M118 52L92 28" stroke="${colors.front}" stroke-width="1.6" fill="none"/><text x="18" y="184">膜内往返相位</text><text x="18" y="214" class="phase-value">${fmt(m.roundTripPhase / Math.PI, 3)} π</text><text x="18" y="239">只计传播；界面反射相位另在振幅中</text>`;
  return svg("单层膜的传播光程和往返相位", content, 300, 250);
}

export function mount({ element, signal }) {
  let cachedKey = "",
    values = [];
  return experiment({
    element,
    signal,
    kicker: "增透膜 · 传播相位与复振幅",
    title: "膜厚改变了反射光怎样相加",
    intro:
      "先把膜厚设为当前波长的四分之一波光学厚度，再改变波长或膜材折射率。比较复振幅的合成与整段可见光反射谱。",
    controls: [
      {
        key: "wavelength",
        label: "观察波长",
        min: 400,
        max: 700,
        step: 1,
        value: 550,
        format: (x) => `${x} nm`,
      },
      {
        key: "thickness",
        label: "薄膜物理厚度",
        min: 0,
        max: 300,
        step: "any",
        value: quarterWave(1.38),
        format: (x) => `${fmt(x, 3)} nm`,
      },
      {
        key: "nc",
        label: "薄膜折射率 n꜀",
        min: 1,
        max: 2.2,
        step: "any",
        value: 1.38,
        format: (x) => fmt(x, 4),
      },
      {
        key: "ns",
        label: "基底折射率 nₛ",
        min: 1.2,
        max: 2,
        step: 0.01,
        value: 1.52,
        format: (x) => fmt(x, 2),
      },
    ],
    presets: [
      { label: "未镀膜对照", values: { thickness: 0 } },
      {
        label: "按当前波长配膜厚",
        values: (s) => ({ thickness: quarterWave(s.nc, s.wavelength) }),
      },
      {
        label: "理想匹配",
        values: (s) => {
          const nc = Math.sqrt(s.ns);
          return { nc, thickness: quarterWave(nc, s.wavelength) };
        },
      },
      {
        label: "固定膜厚看蓝光",
        values: {
          nc: Math.sqrt(1.52),
          ns: 1.52,
          wavelength: 400,
          thickness: quarterWave(Math.sqrt(1.52), 550),
        },
      },
      {
        label: "n꜀ = 1.38 示例",
        values: {
          nc: 1.38,
          ns: 1.52,
          wavelength: 550,
          thickness: quarterWave(1.38),
        },
      },
    ],
    content: `<style>
      .actions button{font-size:11px;padding:4px 8px}.coating-numbers{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;border-block:1px solid #9caea244;padding:14px 0;margin:20px 0}.coating-numbers small{display:block;font-size:10px;opacity:.65}.coating-numbers strong{display:block;font-size:23px;font-weight:500;font-variant-numeric:tabular-nums}.coating-numbers em{font-style:normal;display:block;font-size:10px;opacity:.65}.film-plot{margin:18px 0}.film-plot svg,.film-panels svg{display:block;width:100%;height:auto}.film-plot text,.film-panels text{fill:currentColor;font:12px ui-sans-serif,sans-serif}.film-key{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:11px;margin:10px 0}.film-key i{display:inline-block;width:17px;border-top:2px solid;vertical-align:middle;margin-right:5px}.film-panels{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:20px 0}.film-panels section{border:1px solid #9caea255;border-radius:6px;min-width:0;padding:10px}.film-panels h4{font-size:12px;font-weight:500;margin:0 0 8px}.film-panels .phase-value{font-size:21px}.phasor-values{font-size:10px;font-variant-numeric:tabular-nums;line-height:1.9}.phasor-values span{display:block}.film-reading{font-size:12px;line-height:1.85}.film-note{font-size:11px}
      @media(max-width:650px){.film-panels{grid-template-columns:1fr;gap:12px}.coating-numbers{gap:7px}.coating-numbers strong{font-size:18px}.coating-numbers small{font-size:9px}.film-panels svg{max-width:360px;margin:auto}}
    </style><div class="coating-numbers" data-numbers></div><div class="film-key"><span><i style="border-color:#448b98"></i>单层膜</span><span><i style="border-color:currentColor;border-top-style:dashed"></i>未镀膜</span><span><i style="border-color:#8b78aa"></i>观察波长</span></div><div class="film-plot" data-spectrum></div><p class="film-reading" data-reading aria-live="polite"></p><div class="film-panels"><section><h4>传播光程</h4><div data-layer></div></section><section><h4>反射复振幅 · 首尾相接</h4><div data-phasor></div><div class="film-key"><span><i style="border-color:#b47b43"></i>上界面</span><span><i style="border-color:#448b98"></i>膜内全部返回</span><span><i style="border-color:#8b78aa;border-top-style:dashed"></i>总反射</span></div><div class="phasor-values" data-values></div></section></div><p class="film-note">青色箭头已合并膜内所有往返路径，首尾接在上界面反射箭头之后。紫色箭头从原点指向合成终点；它的模平方才是强度反射率，两个分量的强度不能直接相加。</p>`,
    note: "正入射、无吸收、单层膜与半无限基底；三种折射率均取实常数，忽略材料色散、表面粗糙、背面反射和厚度不均。传播图中的斜线用于分开路径，实际计算角度为 0°，图示厚度不按比例。复相位采用与式 (15.7) 相同的特征矩阵约定，振幅按入射电场归一化；T = (nₛ/n₀)|t|²。这里的理想零反射只在匹配波长成立，不能据此推断宽角偏振性能或整支镜头的抗眩光。",
    update(root, state) {
      const m = film(state),
        key = [state.nc, state.ns, state.thickness].join(":");
      if (key !== cachedKey) {
        values = Array.from({ length: 301 }, (_, i) =>
          film({ ...state, wavelength: 400 + i }),
        );
        cachedKey = key;
      }
      const percent = (value) =>
        value < 1e-12 ? "0.0000%" : `${fmt(value * 100, 4)}%`;
      root.querySelector("[data-numbers]").innerHTML = [
        ["当前反射率 R", percent(m.R), `${state.wavelength} nm`],
        ["未镀膜反射率", percent(m.bare), "单个空气—基底界面"],
        ["当前透射率 T", percent(m.T), `R + T = ${(m.R + m.T).toFixed(6)}`],
      ]
        .map(
          ([name, value, note]) =>
            `<div><small>${name}</small><strong>${value}</strong><em>${note}</em></div>`,
        )
        .join("");
      root.querySelector("[data-spectrum]").innerHTML = spectrum(state, values);
      const ideal = Math.sqrt(state.ns),
        target = quarterWave(state.nc, state.wavelength),
        isQuarter = Math.abs(state.thickness - target) < 1e-6;
      root.querySelector("[data-reading]").textContent =
        `当前波长的四分之一波膜厚为 ${fmt(target, 3)} nm，理想匹配折射率为 ${fmt(ideal, 6)}。${state.thickness === 0 ? "零厚度时，两界面合成的反射与未镀膜界面一致。" : isQuarter ? (Math.abs(state.nc - ideal) < 1e-8 ? "厚度与折射率同时匹配，总反射振幅为零；换一个波长，抵消条件便会改变。" : "膜内往返传播相位为 π，但折射率尚未满足几何平均条件，反射没有完全抵消；界面反射的相位也取决于折射率关系。") : "厚度偏离当前波长的四分之一波条件，返回振幅的方向随相位旋转。"}${m.R > m.bare + 1e-10 ? " 当前反射率高于未镀膜界面，这组薄膜参数增加了反射。" : ""}`;
      root.querySelector("[data-layer]").innerHTML = layer(state, m);
      root.querySelector("[data-phasor]").innerHTML = phasor(m);
      const complex = (a) =>
        `${a[0].toFixed(5)} ${a[1] < 0 ? "−" : "+"} ${Math.abs(a[1]).toFixed(5)}i`;
      root.querySelector("[data-values]").innerHTML = [
        ["上界面", m.front],
        ["膜内全部返回", m.returning],
        ["总反射 r", m.r],
      ]
        .map(([name, value]) => `<span>${name}：${complex(value)}</span>`)
        .join("");
    },
  });
}
