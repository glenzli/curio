import { experiment } from "../common/ui.js";
import { replay } from "../common/replay.js";
import { lessonBody } from "../common/lesson-view.js";
import { GROUP_COLORS } from "./drawing.js";
import { spec, evaluate } from "./lesson.js";
export function mount(context) {
  let root, state, render, lastType;
  return experiment({
    ...context,
    kicker: "摄影成像科学 · 镜片与镜组",
    ...spec,
    content:
      '<style>.atlas-groups{display:flex;flex-wrap:wrap;gap:7px;margin:16px 0}.atlas-groups button{font-size:11px;padding:5px 9px}.atlas-groups [aria-pressed=true]{background:color-mix(in srgb,var(--group-color) 12%,transparent);border-color:var(--group-color)}.atlas-body .drawing{width:100%;height:auto;display:block}.atlas-body .drawing-scroll{overflow-x:auto}.atlas-body table{border-collapse:collapse;width:100%;font-size:11px}.atlas-body th,.atlas-body td{padding:7px;border-bottom:1px solid #9caea244;text-align:left}.atlas-body .selected{background:color-mix(in srgb,currentColor 5%,transparent)}.atlas-body .table-scroll{overflow-x:auto}.atlas-body details{font-size:11px;margin-top:16px}.atlas-body summary{cursor:pointer}.atlas-body .drawing-hint{font-size:10px;opacity:.6}.atlas-body .reading{font-size:13px}</style><nav class="atlas-groups" aria-label="选择镜组"></nav><div class="atlas-body"></div>',
    update(dom, s) {
      const allowed = new Set([...spec.controls.map((c) => c.key), "selected"]);
      for (const key of Object.keys(s)) if (!allowed.has(key)) delete s[key];
      for (const c of spec.controls)
        if (c.step === 1) s[c.key] = Math.round(s[c.key]);
      if (lastType !== undefined && lastType !== s.type) s.selected = 0;
      lastType = s.type;
      s.selected = Number.isInteger(s.selected)
        ? Math.max(0, Math.min(5, s.selected))
        : 0;
      const r = evaluate(s);
      s.selected = r.model.selected;
      dom.querySelector(".atlas-groups").innerHTML = [
        ["全部组", 0, "#555"],
        ...r.model.d.groups.map((g) => [
          "G" +
            (g.index + 1) +
            " · " +
            g.elements.map((e) => "L" + e.lens).join("+"),
          g.index + 1,
          GROUP_COLORS[g.index],
        ]),
      ]
        .map(
          ([label, i, color]) =>
            `<button type="button" data-group="${i}" aria-pressed="${s.selected === i}" style="--group-color:${color}">${label}</button>`,
        )
        .join("");
      dom.querySelector(".atlas-body").innerHTML = lessonBody(r);
    },
    setup(c) {
      ({ root, state, render } = c);
      const select = (e) => {
        const b = e.target.closest("button[data-group]");
        if (!b) return;
        state.selected = Number(b.dataset.group);
        render();
      };
      root
        .querySelector(".atlas-groups")
        .addEventListener("click", select, { signal: context.signal });
      return replay({ ...context, root, state, render, ...spec.replay });
    },
  });
}
