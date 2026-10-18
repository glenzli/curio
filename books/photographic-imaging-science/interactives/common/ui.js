const style = `
:host{display:block;color:var(--text,#262626);font:13px/1.7 ui-sans-serif,-apple-system,"PingFang SC",sans-serif}*{box-sizing:border-box}.lab{padding:24px}.kicker{font-size:10px;letter-spacing:.09em;opacity:.6}h3{font-size:22px;line-height:1.4;margin:8px 0}p{margin:8px 0;opacity:.72}.controls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin:20px 0}.controls label{font-size:11px;display:grid;gap:8px}.controls output{float:right;font-variant-numeric:tabular-nums;font-weight:600}input{width:100%;accent-color:var(--accent,#555)}button{font:inherit;color:inherit;background:transparent;border:1px solid var(--line,#aaa);border-radius:5px;padding:6px 10px;cursor:pointer}button:focus-visible,input:focus-visible{outline:2px solid currentColor;outline-offset:3px}.actions{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.chart{margin:16px 0;min-width:0}.chart svg{width:100%;height:auto;display:block}.chart text{font-family:inherit;fill:currentColor;font-size:11px}.legend{display:flex;flex-wrap:wrap;gap:8px 16px;font-size:10px;margin:8px 0}.legend i{display:inline-block;width:18px;border-top:2px solid;vertical-align:middle;margin-right:5px}.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;border-block:1px solid #9caea244;padding:15px 0;margin:18px 0}.stats small{font-size:10px;opacity:.65}.stats>div{min-width:0}.stats strong{overflow-wrap:anywhere;font-size:22px;line-height:1.5;font-variant-numeric:tabular-nums;display:block}.stats em{font-style:normal;font-size:10px;opacity:.65}.note{font-size:10px;line-height:1.85;opacity:.65}.reading{font-size:12px}.stripes{display:grid;grid-template-columns:1fr 1fr;gap:12px}.stripes svg{width:100%;height:54px;border-radius:4px;display:block}.stripes small{font-size:10px}.field-grid{display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:14px;align-items:center}.psf svg{width:100%;height:auto}.psf p{font-size:10px;text-align:center}.chart-wrap{border-radius:6px;background:color-mix(in srgb,currentColor 3%,transparent);padding:10px}.criterion{font-size:12px;font-weight:600}@media(max-width:550px){.stats{grid-template-columns:1fr}.lab{padding:18px}h3{font-size:19px}.controls{grid-template-columns:1fr;gap:12px}.stats>div{min-width:0}.stats strong{overflow-wrap:anywhere;font-size:18px}.stripes{grid-template-columns:1fr}.field-grid{grid-template-columns:1fr}.psf{max-width:180px;margin:auto}}`;

// Preserve derived values and paused animation positions; step="any" is not numeric.
export function restoredControlValue(control, value) {
  return Number.isFinite(value)
    ? Math.max(control.min, Math.min(control.max, value))
    : control.value;
}

// Legacy explanatory playheads were percentages although only whole stages
// changed. Preserve the selected stage when replacing them with discrete steps.
export function migrateStageProgress(saved, oldStep, lastStage) {
  if (saved?.version !== 1 || !saved.parameters) return saved;
  const previous = saved.parameters.progress;
  const progress = Number.isFinite(previous)
    ? Math.max(
        0,
        Math.min(
          lastStage,
          Array.isArray(oldStep)
            ? oldStep.findLastIndex((start) => previous >= start)
            : Math.floor(previous / oldStep),
        ),
      )
    : lastStage;
  return {
    ...saved,
    version: 2,
    parameters: { ...saved.parameters, progress },
  };
}

export function experiment({
  element,
  signal,
  session,
  kicker,
  title,
  intro,
  controls,
  content,
  note,
  presets = [],
  update,
  setup,
  version = 1,
  migrate,
}) {
  const root = element.shadowRoot ?? element.attachShadow({ mode: "open" });
  root.innerHTML = `<style>${style}</style><section class="lab"><div class="kicker">${kicker}</div><h3>${title}</h3><p>${intro}</p><div class="controls"></div><div class="actions"></div>${content}<p class="note">${note}</p></section>`;
  const stored = session?.load();
  const saved = migrate ? migrate(stored) : stored;
  const restored =
    saved?.version === version &&
    saved.parameters &&
    typeof saved.parameters === "object";
  const state = restored
    ? Object.fromEntries(
        Object.entries(saved.parameters).filter(
          ([k, v]) =>
            k.length < 64 &&
            ["number", "string", "boolean"].includes(typeof v) &&
            (typeof v !== "number" || Number.isFinite(v)),
        ),
      )
    : {};
  let presetLabel = restored ? (saved.preset ?? null) : null;
  const fields = new Map();
  let snapshot;
  session?.describe(() => snapshot);
  for (const control of controls) {
    const label = document.createElement("label"),
      name = document.createElement("span"),
      output = document.createElement("output"),
      input = document.createElement("input");
    input.type = "range";
    input.min = control.min;
    input.max = control.max;
    input.step = control.step;
    input.value = control.value;
    input.setAttribute("aria-label", control.label);
    input.dataset.controlKey = control.key;
    name.textContent = control.label;
    name.append(output);
    label.append(name, input);
    const hint = document.createElement("small");
    hint.id = `hint-${control.key}`;
    hint.style.opacity = ".7";
    hint.style.fontSize = "10px";
    input.setAttribute("aria-describedby", hint.id);
    label.append(hint);
    root.querySelector(".controls").append(label);
    const previous = state[control.key];
    state[control.key] = restoredControlValue(control, previous);
    fields.set(control.key, { input, output, hint, control });
    input.addEventListener(
      "input",
      () => {
        state[control.key] = Number(input.value);
        presetLabel = null;
        render();
      },
      { signal },
    );
  }
  function render() {
    for (const [key, { input, output, hint, control }] of fields) {
      const shown = control.discrete ? Math.floor(state[key]) : state[key];
      input.value = shown;
      if (control.enabled) input.disabled = !control.enabled(state);
      hint.textContent =
        typeof control.hint === "function"
          ? control.hint(state)
          : (control.hint ?? "");
      hint.hidden = !hint.textContent;
      output.value = control.format ? control.format(shown) : String(shown);
    }
    update(root, state);
    for (const button of root.querySelectorAll("button[data-replay-key]")) {
      const field = fields.get(button.dataset.replayKey);
      if (field) button.disabled = field.input.disabled;
    }
    const parameters = Object.fromEntries(
      Object.entries(state).filter(
        ([, v]) =>
          ["number", "boolean", "string"].includes(typeof v) &&
          (typeof v !== "number" || Number.isFinite(v)),
      ),
    );
    session?.save({ version, parameters, preset: presetLabel });
    snapshot = {
      title,
      preset: presetLabel,
      parameters: [...fields.values()].map(({ control }) => ({
        label: control.label,
        value: control.format
          ? control.format(state[control.key])
          : String(state[control.key]),
      })),
      options: Object.fromEntries(
        Object.entries(parameters).filter(([key]) => !fields.has(key)),
      ),
      readings: {
        stats: [...root.querySelectorAll("small")]
          .filter((node) =>
            node.parentElement?.querySelector(":scope > strong"),
          )
          .map((node) => ({
            label: node.textContent,
            value:
              node.parentElement.querySelector(":scope > strong").textContent,
            detail:
              node.parentElement.querySelector(":scope > em")?.textContent ??
              "",
          })),
        notes: [
          ...root.querySelectorAll(
            ".reading,[data-reading],[data-truth],.wave-truth",
          ),
        ]
          .map((node) => node.textContent.replace(/\s+/g, " ").trim())
          .join("\n")
          .slice(0, 1800),
      },
      assumptions: note,
    };
    for (const button of root.querySelectorAll(".actions button[data-preset]"))
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.preset === presetLabel),
      );
  }
  for (const preset of presets) {
    const button = document.createElement("button");
    button.textContent = preset.label;
    button.dataset.preset = preset.label;
    button.addEventListener(
      "click",
      () => {
        Object.assign(
          state,
          typeof preset.values === "function"
            ? preset.values(state)
            : preset.values,
        );
        presetLabel = typeof preset.values === "function" ? null : preset.label;
        render();
      },
      { signal },
    );
    root.querySelector(".actions").append(button);
  }
  if (session) {
    const reset = document.createElement("button");
    reset.type = "button";
    reset.textContent = "重置参数";
    reset.addEventListener(
      "click",
      () => {
        for (const key of Object.keys(state)) delete state[key];
        for (const control of controls) state[control.key] = control.value;
        presetLabel = null;
        render();
      },
      { signal },
    );
    root.querySelector(".actions").append(reset);
  }
  if (!presets.length && !session) root.querySelector(".actions").remove();
  render();
  const teardown = setup?.({ root, state, render, restored });
  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    teardown?.();
    root.replaceChildren();
  }
  signal?.addEventListener("abort", dispose, { once: true });
  return dispose;
}

const escape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
export function tickLabel(value) {
  if (value === 0) return "0";
  const v = Number(value.toPrecision(4));
  return Math.abs(v) < 1e-3 || Math.abs(v) >= 1e6
    ? v
        .toExponential(2)
        .replace(/\.?0+e/, "e")
        .replace("e+", "e")
    : String(v);
}
export function plot({
  curves,
  xMin = 0,
  xMax,
  xLabel,
  yLabel = "MTF",
  yMin = 0,
  yMax = 1,
  markers = [],
  samples = [],
  title,
  width = 640,
  height = 260,
  topPadding = 38,
  bottomPadding = 40,
  leftPadding = 48,
  rightPadding = 18,
  topLabelY = 12,
  bottomLabelPadding = 2,
}) {
  const W = width,
    H = height,
    left = Math.max(
      leftPadding,
      ...Array.from(
        { length: 5 },
        (_, i) => tickLabel(yMin + ((yMax - yMin) * i) / 4).length * 7 + 12,
      ),
    ),
    right = rightPadding,
    top = topPadding,
    bottom = bottomPadding;
  const x = (v) => left + ((v - xMin) / (xMax - xMin)) * (W - left - right),
    y = (v) => H - bottom - ((v - yMin) / (yMax - yMin)) * (H - top - bottom);
  const path = (points) =>
    points
      .map(
        ([a, b], index) =>
          `${index ? "L" : "M"}${x(a).toFixed(2)},${y(b).toFixed(2)}`,
      )
      .join(" ");
  let inner = "";
  for (let i = 0; i <= 4; i++) {
    const v = yMin + ((yMax - yMin) * i) / 4,
      u = xMin + ((xMax - xMin) * i) / 4;
    inner += `<path d="M${left},${y(v)}H${W - right}" stroke="currentColor" opacity=".10"/><text x="${left - 8}" y="${y(v) + 4}" text-anchor="end">${tickLabel(v)}</text><text x="${x(u)}" y="${H - bottom + 20}" text-anchor="${i === 0 ? "start" : i === 4 ? "end" : "middle"}">${tickLabel(u)}</text>`;
  }
  const labels = [];
  for (const marker of markers.filter(
    (marker) => marker.value >= xMin && marker.value <= xMax,
  )) {
    const column = x(marker.value);
    const stacked = labels.some((previous) => Math.abs(previous - column) < 90);
    labels.push(column);
    inner += `<path d="M${column},${top}V${H - bottom}" stroke="${marker.color ?? "#a27640"}" stroke-dasharray="3 5"/><text x="${column}" y="${top - 9 - (stacked ? 13 : 0)}" text-anchor="middle">${escape(marker.label)}</text>`;
  }
  let field = "";
  for (const curve of curves)
    field += `<path d="${path(curve.points)}" fill="none" stroke="${curve.color}" stroke-width="2.1" ${curve.dashed ? 'stroke-dasharray="6 4"' : ""}/>`;
  for (const [a, b] of samples)
    field += `<circle cx="${x(a)}" cy="${y(b)}" r="3.6" fill="#9b703c" stroke="white" stroke-width="1"/>`;
  // A nested viewport clips curves to the axes without shared SVG ids. Outlying
  // samples must not cover labels or look as though they remain in range.
  inner += `<svg x="${left}" y="${top}" width="${W - left - right}" height="${H - top - bottom}" viewBox="${left} ${top} ${W - left - right} ${H - top - bottom}" overflow="hidden" data-plot-field="true" style="width:${W - left - right}px;height:${H - top - bottom}px;overflow:hidden">${field}</svg>`;
  inner += `<text x="${left}" y="${topLabelY}">${escape(yLabel)}</text><text x="${(left + W - right) / 2}" y="${H - bottomLabelPadding}" text-anchor="middle">${escape(xLabel)}</text>`;
  return `<svg role="img" aria-label="${escape(title)}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}
export const points = (max, fn, count = 200) =>
  Array.from({ length: count + 1 }, (_, i) => [
    (max * i) / count,
    fn((max * i) / count),
  ]);
export function legend(curves) {
  return curves
    .map(
      (curve) =>
        `<span><i style="border-color:${curve.color};${curve.dashed ? "border-top-style:dashed" : ""}"></i>${curve.name}</span>`,
    )
    .join("");
}
export function stripe(frequency, gain = 1, widthMm = 0.24) {
  let rectangles = "";
  for (let i = 0; i < 384; i++) {
    const intensity =
      0.5 +
      0.4 *
        gain *
        Math.cos((2 * Math.PI * frequency * widthMm * (i + 0.5)) / 384);
    const encoded =
      intensity <= 0.0031308
        ? 12.92 * intensity
        : 1.055 * intensity ** (1 / 2.4) - 0.055;
    const value = Math.round(255 * Math.max(0, Math.min(1, encoded)));
    rectangles += `<rect x="${i}" width="1.05" height="54" fill="rgb(${value} ${value} ${value})"/>`;
  }
  return `<svg role="img" aria-label="正弦条纹，线性输入调制度0.8" viewBox="0 0 384 54" preserveAspectRatio="none">${rectangles}</svg>`;
}
