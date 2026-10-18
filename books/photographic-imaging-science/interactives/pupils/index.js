import { migrateStageProgress, experiment } from "../common/ui.js";
import { replay } from "../common/replay.js";
import { pupils } from "./model.js";
import { pupilFigure } from "./figures.js";
const number = (v) =>
  v === null ? "∞" : (Math.abs(v) < 1e-9 ? 0 : v).toFixed(3);
const nature = {
  real: "实像",
  virtual: "虚像",
  infinity: "无穷远",
  direct: "光阑本身",
};
export function mount({ element, signal, session }) {
  return experiment({
    version: 2,
    migrate: (saved) => migrateStageProgress(saved, [0, 10, 35, 60, 85], 4),
    element,
    signal,
    session,
    kicker: "第十一章 · 光阑的两侧成像",
    title: "从光阑找到入瞳和出瞳",
    intro:
      "分别从物侧和像侧观察同一个光阑。可分步回放构图，或移动光阑，查看瞳像的位置、大小与正倒。",
    controls: [
      {
        key: "power1",
        label: "前组光焦度",
        min: -25,
        max: 25,
        step: 1,
        value: 10,
        format: (v) => v + " D",
      },
      {
        key: "power2",
        label: "后组光焦度",
        min: -25,
        max: 25,
        step: 1,
        value: 20,
        format: (v) => v + " D",
      },
      {
        key: "stop",
        label: "光阑位置 z",
        min: 5,
        max: 95,
        step: 1,
        value: 25,
        format: (v) => v + " mm",
      },
      {
        key: "diameter",
        label: "光阑直径",
        min: 1,
        max: 4,
        step: 0.1,
        value: 2,
        format: (v) => v.toFixed(1) + " mm",
      },
      {
        key: "progress",
        label: "查看构图环节",
        min: 0,
        max: 4,
        step: 1,
        value: 4,
        discrete: true,
        format: (v) =>
          ["光阑", "向前组作图", "入瞳", "向后组作图", "入瞳与出瞳"][
            Math.min(4, Math.floor(v))
          ],
      },
    ],
    presets: [
      {
        label: "一虚一实",
        values: { power1: 10, power2: 20, stop: 25, progress: 4 },
      },
      {
        label: "两侧实像",
        values: { power1: 25, power2: 25, stop: 50, progress: 4 },
      },
      {
        label: "两侧虚像",
        values: { power1: 10, power2: 10, stop: 50, progress: 4 },
      },
      {
        label: "入瞳在无穷远",
        values: { power1: 20, power2: 10, stop: 50, progress: 4 },
      },
      {
        label: "出瞳在无穷远",
        values: { power1: 10, power2: 20, stop: 50, progress: 4 },
      },
      { label: "从光阑开始", values: { progress: 0 } },
    ],
    content:
      '<style>.pupil-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.pupil-grid>section{min-width:0}.pupil-grid svg{width:100%;height:auto;display:block}.pupil-grid text{fill:currentColor;font:11px ui-sans-serif,sans-serif}.pupil-grid h4{font-size:12px;margin:14px 0 6px}.truth{font-size:11px;line-height:1.9;border:1px solid #9caea255;padding:12px;border-radius:6px;overflow-wrap:anywhere}@media(max-width:850px){.pupil-grid{grid-template-columns:1fr}}</style><p class="reading" data-step></p><div class="pupil-grid"><section><h4>物侧观察 · 经前组</h4><div data-entrance></div><p class="reading" data-entrance-reading></p></section><section><h4>像侧观察 · 经后组</h4><div data-exit></div><p class="reading" data-exit-reading></p></section></div><div class="stats"></div><p class="reading" data-reading></p><div class="truth" data-truth aria-label="瞳成像独立真值对照"></div>',
    note: "空气中两薄镜组，间距固定100 mm，光阑始终位于两组之间。图中从光阑上边缘分别向两侧作共轭构图；实线表示该构图中的光线，虚线为反向延长。瞳像有正倒，直径取绝对值；无穷远单独处理。当前声明中间元件为孔径光阑，其他镜片孔径视为无限，不自动判定实际系统哪个元件限光，也不计算离轴口径蚀。构图回放表示计算步骤，不表示真实传播时间；没有三维像差、衍射或真实镜头处方。",
    update(root, state) {
      const draw = {
          ...state,
          progress: [0, 10, 35, 60, 85][
            Math.min(4, Math.floor(state.progress))
          ],
        },
        m = pupils(draw);
      for (const [side, image, trace] of [
        ["entrance", m.entrance, m.entranceTrace],
        ["exit", m.exit, m.exitTrace],
      ]) {
        root.querySelector("[data-" + side + "]").innerHTML = pupilFigure(
          draw,
          side,
        );
        root.querySelector("[data-" + side + "-reading]").textContent =
          nature[image.nature] +
          "；z = " +
          number(image.z) +
          (image.z === null ? "" : " mm") +
          "；直径 " +
          (image.diameter === null
            ? "无有限值"
            : number(image.diameter) + " mm") +
          "；横向放大率 " +
          number(image.magnification) +
          "。";
      }
      root.querySelector("[data-step]").textContent = [
        "① 标出实际光阑。",
        "② 从光阑上边缘向前组构图。",
        "③ 标出入瞳；虚像由反向延长线定位。",
        "④ 从同一光阑向后组构图。",
        "⑤ 并列比较入瞳与出瞳。",
      ][Math.min(4, Math.floor(state.progress))];
      root.querySelector(".stats").innerHTML =
        "<div><small>实际光阑</small><strong>" +
        state.diameter.toFixed(2) +
        " mm</strong><em>z = " +
        state.stop +
        " mm</em></div><div><small>系统有效焦距</small><strong>" +
        (m.focalLength === null ? "不适用" : number(m.focalLength) + " mm") +
        "</strong><em>仅正总光焦度时显示</em></div><div><small>无穷远 f 数</small><strong>" +
        (m.fNumber === null ? "不适用" : "f/" + m.fNumber.toFixed(2)) +
        "</strong><em>有效焦距 / 入瞳直径</em></div>";
      root.querySelector("[data-reading]").textContent =
        "入瞳是光阑经前组的像，出瞳是经后组的像；" +
        (m.entrance.magnification !== null
          ? "本例入瞳直径为实际光阑的 " +
            Math.abs(m.entrance.magnification).toFixed(3) +
            " 倍。"
          : "入瞳位于无穷远，应使用物侧主光线角度判断远心性。");
      const delta = (a, b) =>
        a === null && b === null
          ? "均无有限交点"
          : a === null || b === null
            ? "边界不一致"
            : Math.abs(a - b).toExponential(2) + " mm";
      root.querySelector("[data-truth]").textContent =
        "独立真值对照：矩阵共轭 / 逐面光线求交。入瞳 z " +
        number(m.entrance.z) +
        " / " +
        number(m.entranceTrace.z) +
        "，差 " +
        delta(m.entrance.z, m.entranceTrace.z) +
        "；出瞳 z " +
        number(m.exit.z) +
        " / " +
        number(m.exitTrace.z) +
        "，差 " +
        delta(m.exit.z, m.exitTrace.z) +
        "。有限共轭的矩阵 B：" +
        number(m.entrance.matrixB) +
        " / " +
        number(m.exit.matrixB) +
        " mm；总矩阵行列式 " +
        m.determinant.toFixed(10) +
        "。光线求交未读取共轭矩阵。";
      Object.assign(root.querySelector(".lab").dataset, {
        entranceZ: String(m.entrance.z),
        exitZ: String(m.exit.z),
        entranceNature: m.entrance.nature,
        exitNature: m.exit.nature,
        stage: String(state.progress),
      });
    },
    setup: ({ root, state, render }) =>
      replay({
        root,
        state,
        render,
        element,
        signal,
        key: "progress",
        end: 4,
        label: "回放瞳成像",
        durationMs: 8000,
      }),
  });
}
