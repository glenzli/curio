import { experiment } from "./ui.js";
import { replay } from "./replay.js";
import { lessonBody } from "./lesson-view.js";

export function mountLesson(context, spec) {
  return experiment({
    ...context,
    kicker: "摄影成像科学 · 模型与对照",
    title: spec.title,
    intro: spec.intro,
    controls: spec.controls,
    presets: spec.presets,
    note: spec.note,
    content:
      '<style>.lesson h4{font-size:13px;margin:20px 0 6px}.lesson .chart text{font-size:14px}.lesson .legend{font-size:11px}.lesson table{width:100%;border-collapse:collapse;font-size:11px}.lesson td,.lesson th{padding:6px;border-bottom:1px solid var(--line,#aaa);text-align:left}.lesson .table-scroll{overflow:auto}.lesson .drawing{width:100%;height:auto}.lesson .drawing text{font-size:18px}.stats>div{min-width:0}.stats strong{overflow-wrap:anywhere}@media(max-width:550px){.lesson .chart text{font-size:20px}}</style><div class="lesson" data-lesson></div>',
    update(root, state) {
      // A lesson's persisted state consists only of its declared scalar controls.
      // Discrete modes are integers; an animation's physical position may be fractional.
      const keys = new Set(spec.controls.map((c) => c.key));
      for (const key of Object.keys(state))
        if (!keys.has(key)) delete state[key];
      for (const c of spec.controls)
        if (c.step === 1 && c.key !== spec.replay?.key)
          state[c.key] = Math.round(state[c.key]);
      root.querySelector("[data-lesson]").innerHTML = lessonBody(
        spec.evaluate(state),
      );
    },
    setup: spec.replay
      ? ({ root, state, render }) =>
          replay({ ...context, root, state, render, ...spec.replay })
      : undefined,
  });
}
