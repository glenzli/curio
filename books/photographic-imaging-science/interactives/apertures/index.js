import { experiment } from "../common/ui.js";
import { replay } from "../common/replay.js";
import { apertureBudget } from "./model.js";
import { rayFigure, maskFigure } from "./figures.js";
export function mount({ element, signal, session }) {
  let key, m;
  return experiment({
    element,
    signal,
    session,
    kicker: "第十一章 · 有限孔径",
    title: "逐面检查光束的通光范围",
    intro:
      "给前组、中间孔径和后组指定真实通光半径，再改变物方视场。光线在第一次碰到遮挡的位置结束；三孔径投到同一入口平面后，共同区域给出另一条面积对照。",
    controls: [
      {
        key: "field",
        label: "物方近轴视场角",
        min: -3,
        max: 3,
        step: 0.1,
        value: 2,
        format: (v) => v.toFixed(1) + "°",
      },
      {
        key: "frontRadius",
        label: "前组通光半径",
        min: 1,
        max: 4,
        step: 0.1,
        value: 4,
        format: (v) => v.toFixed(2) + " mm",
      },
      {
        key: "middleRadius",
        label: "中间孔径半径",
        min: 0.5,
        max: 2,
        step: 0.1,
        value: 1.5,
        format: (v) => v.toFixed(2) + " mm",
      },
      {
        key: "rearRadius",
        label: "后组通光半径",
        min: 0.5,
        max: 3,
        step: 0.1,
        value: 1.2,
        format: (v) => v.toFixed(2) + " mm",
      },
      {
        key: "progress",
        label: "逐面追迹的展示进度",
        min: 0,
        max: 100,
        step: 0.25,
        value: 100,
        format: (v) => v.toFixed(1) + "%",
      },
    ],
    presets: [
      {
        label: "离轴截光",
        values: {
          field: 2,
          frontRadius: 4,
          middleRadius: 1.5,
          rearRadius: 1.2,
          progress: 100,
        },
      },
      { label: "轴上对照", values: { field: 0, progress: 100 } },
      { label: "扩大后组", values: { rearRadius: 3, progress: 100 } },
      {
        label: "前组成为光阑",
        values: {
          field: 0,
          frontRadius: 1,
          middleRadius: 1.5,
          rearRadius: 3,
          progress: 100,
        },
      },
      {
        label: "后组成为光阑",
        values: {
          field: 0,
          frontRadius: 4,
          middleRadius: 1.5,
          rearRadius: 0.5,
          progress: 100,
        },
      },
      { label: "反向视场", values: (s) => ({ field: -s.field }) },
      { label: "从入射开始", values: { progress: 0 } },
    ],
    content:
      '<style>.actions button{font-size:11px;padding:4px 8px}.ap-rays svg,.ap-mask svg{display:block;width:100%;height:auto}.ap-rays text,.ap-mask text{fill:currentColor;font:12px sans-serif}.ap-area{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:16px;align-items:center}.stats{grid-template-columns:1fr;gap:8px}.stats strong{font-size:20px}.truth{font-size:11px;line-height:1.9;padding:12px;border:1px solid #9caea255;border-radius:6px}.ap-detail{font-size:11px;font-variant-numeric:tabular-nums}@media(max-width:650px){.ap-area{grid-template-columns:1fr}.ap-rays text{font-size:20px}.ap-mask text{font-size:15px}.ap-mask{max-width:420px}.stats{grid-template-columns:1fr}}</style><div class="ap-rays" data-rays></div><p class="reading" data-limiting aria-live="polite"></p><div class="ap-area"><div><div class="ap-mask" data-mask></div><div class="legend"><span><i style="border-color:#40879a"></i>前组</span><span><i style="border-color:#bb7946"></i>中间孔径</span><span><i style="border-color:#8b78aa"></i>后组</span></div></div><div class="stats"></div></div><p class="ap-detail reading" data-counts></p><p class="truth" data-truth></p>',
    note: "无穷远物点，空气中两薄镜组位于z=0、60 mm，光焦度分别为10、20 D；中间孔径位于25 mm，近轴像面位于82.222 mm。输入方向以弧度代入斜率，一阶追迹分别计算两横向坐标。三个孔都是与轴垂直的同心圆，真实孔径面只传光或遮挡，不改变折射。面积观测用120×120入口方格的中点发射，逐面判定，未把角度误作横移。独立真值由ABCD投影的三圆交集作分段圆弧积分；数值面积可有边界格误差。归一化分母是同样三个孔径在轴上通过的面积。图中光线数量为示意，与面积用的光线格不同；回放只沿z展开完整结果。面积比不包含cos⁴θ、透射损失或像素响应，也不是完整照度、PSF、散景或MTF；未含像差、厚度与瞳像畸变。横纵图示比例不同。",
    update(root, s) {
      const k = JSON.stringify([
        s.field,
        s.frontRadius,
        s.middleRadius,
        s.rearRadius,
      ]);
      if (k !== key) {
        m = apertureBudget(s);
        key = k;
        root.querySelector("[data-mask]").innerHTML = maskFigure(m);
        root.querySelector(".stats").innerHTML = [
          [
            "逐面光线格面积",
            m.sample.area.toFixed(5) + " mm²",
            m.sample.passed + " / " + m.sample.launched + " 条入口有效光线通过",
          ],
          [
            "独立三圆交集面积",
            m.truth.toFixed(5) + " mm²",
            "ABCD投影、分段圆弧积分",
          ],
          [
            "相对轴上通光面积",
            (100 * m.relativeArea).toFixed(3) + "%",
            "同孔径轴上面积 " + m.axis.toFixed(5) + " mm²",
          ],
        ]
          .map(
            ([a, b, c]) =>
              `<div><small>${a}</small><strong>${b}</strong><em>${c}</em></div>`,
          )
          .join("");
        root.querySelector("[data-limiting]").textContent =
          "当前轴上限制孔径：" +
          m.limiting.join("、") +
          "。离轴的共同通光区域还要同时满足另外两个孔径。";
        root.querySelector("[data-counts]").textContent =
          `入口有效光线${m.sample.launched}条；首次挡在中间${m.sample.blocked.middle}条，后组${m.sample.blocked.rear}条，通过${m.sample.passed}条。入口方格先限定在前孔径内，所以此统计没有额外的前组拒绝数。侧面示意另含前孔径以外的入射光线。`;
        root.querySelector("[data-truth]").textContent =
          `独立对照：逐面光线格与圆交面积相差 ${(m.sample.area - m.truth).toFixed(6)} mm²。投影圆的(中心hₓ, 半径)依次为 ${m.disks.map((c) => "(" + c.center.toFixed(4) + ", " + c.radius.toFixed(4) + ") mm").join("；")}。轴上只需比较三个投影圆半径的最小值；中间元件不因名称固定成为孔径光阑。蓝色填充为三个圆的公共区域，边界可延伸到视窗之外。`;
      }
      root.querySelector("[data-rays]").innerHTML = rayFigure(m, s.progress);
    },
    setup: ({ root, state, render }) =>
      replay({
        root,
        state,
        render,
        element,
        signal,
        key: "progress",
        label: "回放逐面截光",
        durationMs: 8500,
      }),
  });
}
