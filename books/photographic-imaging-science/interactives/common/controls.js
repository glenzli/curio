// One field owns its slider/choice, editable physical value, validation and focus.
// The experiment owns the model coordinate; drawing never quantizes that state.
export const controlStyle = `
.control-field{display:grid;gap:7px;min-width:0;font-size:11px;align-content:start}
.control-field .control-heading{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin:0;font:inherit}
.control-field output{font-variant-numeric:tabular-nums;font-weight:600;text-align:right;overflow-wrap:anywhere}
.control-field .control-entry{display:flex;align-items:center;gap:8px;min-width:0}
.control-field input[type=range]{flex:1;min-width:40px;width:0;margin:0;accent-color:var(--accent,#555)}
.control-field .control-number{width:86px;min-width:0;flex:0 1 100px;padding:5px 6px;font:inherit;font-variant-numeric:tabular-nums;color:inherit;background:var(--paper,#fff);border:1px solid var(--line,#aaa);border-radius:4px}
.control-field select{width:100%;min-width:0;padding:6px 7px;font:inherit;color:inherit;background:var(--paper,#fff);border:1px solid var(--line,#aaa);border-radius:4px}
.control-field .control-unit{font-size:10px;white-space:nowrap;opacity:.7}
.control-field .control-infinity{padding:3px 6px;min-width:27px;font-size:15px;line-height:1.4}
.control-field .control-infinity[aria-pressed=true]{background:color-mix(in srgb,currentColor 9%,transparent);border-color:currentColor}
.control-field :is(input,select,button):focus-visible{outline:2px solid currentColor;outline-offset:3px}
.control-field :disabled{opacity:.45;cursor:not-allowed}
.control-field .control-hint{font-size:10px;line-height:1.5;opacity:.7}
.control-field .control-error{font-size:10px;line-height:1.5;color:var(--text,#262626)}
.control-field [aria-invalid=true]{border-style:dashed;border-width:2px}
.control-field [hidden]{display:none}
`;

export const physicalValue = (control, value) =>
  control.numeric?.toInput ? control.numeric.toInput(value) : value;

export function numericBounds(control) {
  const ends = [
    physicalValue(control, control.min),
    physicalValue(control, control.max),
  ];
  return { min: Math.min(...ends), max: Math.max(...ends) };
}

export function parseControlNumber(control, text) {
  if (String(text).trim() === "")
    return { ok: false, error: "请输入数值；原参数保持不变。" };
  const entered = Number(text);
  if (!Number.isFinite(entered))
    return { ok: false, error: "请输入有限数值；原参数保持不变。" };
  const { min, max } = numericBounds(control);
  const range = `${Number.isFinite(min) ? min : "−∞"} 至 ${Number.isFinite(max) ? max : "∞"}`;
  if (entered < min || entered > max)
    return {
      ok: false,
      error: `可输入范围为 ${range}${control.numeric?.unit ? " " + control.numeric.unit : ""}。`,
    };
  const step = control.numeric?.step ?? (control.discrete ? 1 : "any");
  if (step !== "any" && Number(step) > 0) {
    const count = (entered - (Number.isFinite(min) ? min : 0)) / Number(step);
    if (
      Math.abs(count - Math.round(count)) >
      1e-8 * Math.max(1, Math.abs(count))
    )
      return {
        ok: false,
        error: Number(step) === 1 ? "请输入整数。" : `输入间隔为 ${step}。`,
      };
  }
  const value = control.numeric?.fromInput
    ? control.numeric.fromInput(entered)
    : entered;
  const epsilon =
    1e-12 * Math.max(1, Math.abs(control.min), Math.abs(control.max));
  if (
    !Number.isFinite(value) ||
    value < control.min - epsilon ||
    value > control.max + epsilon
  )
    return { ok: false, error: "该数值超出模型范围；原参数保持不变。" };
  return {
    ok: true,
    value: Math.max(control.min, Math.min(control.max, value)),
  };
}

export function displayedOption(control, value) {
  const target = control.optionValue
    ? control.optionValue(value)
    : control.discrete
      ? Math.floor(value)
      : value;
  return (
    control.options.find((option) => option.value === target) ??
    control.options.reduce((a, b) =>
      Math.abs(a.value - target) <= Math.abs(b.value - target) ? a : b,
    )
  );
}

let nextField = 0;
export function createControl(
  control,
  { signal, onChange, onEdit = () => {} },
) {
  const element = document.createElement("div");
  element.className = "control-field";
  const heading = document.createElement("label"),
    name = document.createElement("span"),
    output = document.createElement("output");
  heading.className = "control-heading";
  name.textContent = control.label;
  heading.append(name, output);
  const input = document.createElement(control.options ? "select" : "input");
  input.id = `experiment-control-${++nextField}`;
  input.dataset.controlKey = control.key;
  input.setAttribute("aria-label", control.label);
  heading.htmlFor = input.id;
  const hint = document.createElement("small"),
    error = document.createElement("small");
  hint.className = "control-hint";
  hint.id = `${input.id}-hint`;
  error.className = "control-error";
  error.id = `${input.id}-error`;
  error.setAttribute("role", "status");
  error.hidden = true;
  input.setAttribute("aria-describedby", hint.id);
  element.append(heading);
  let numberInput,
    infinityButton,
    dirty = false,
    current = control.value;
  const events = signal ? { signal } : undefined;
  if (control.options) {
    output.hidden = true;
    for (const choice of control.options) {
      const option = document.createElement("option");
      option.value = String(choice.value);
      option.textContent = choice.label;
      input.append(option);
    }
    element.append(input);
  } else {
    input.type = "range";
    input.min = control.min;
    input.max = control.max;
    input.step = control.step;
    const entry = document.createElement("div");
    entry.className = "control-entry";
    numberInput = document.createElement("input");
    numberInput.type = "number";
    numberInput.className = "control-number";
    numberInput.setAttribute("aria-label", `${control.label}：数值`);
    numberInput.setAttribute("aria-describedby", `${hint.id} ${error.id}`);
    numberInput.step = control.numeric?.step ?? (control.discrete ? 1 : "any");
    const bounds = numericBounds(control);
    if (Number.isFinite(bounds.min)) numberInput.min = bounds.min;
    if (Number.isFinite(bounds.max)) numberInput.max = bounds.max;
    entry.append(input, numberInput);
    if (control.numeric?.unit) {
      const unit = document.createElement("span");
      unit.className = "control-unit";
      unit.textContent = control.numeric.unit;
      entry.append(unit);
    }
    if (Number.isFinite(control.numeric?.infinity)) {
      infinityButton = document.createElement("button");
      infinityButton.type = "button";
      infinityButton.className = "control-infinity";
      infinityButton.textContent = "∞";
      infinityButton.setAttribute("aria-label", `${control.label}：无穷远`);
      infinityButton.addEventListener(
        "click",
        () => {
          if (input.disabled) return;
          dirty = false;
          onEdit();
          onChange(control.numeric.infinity);
        },
        events,
      );
      entry.append(infinityButton);
    }
    const commit = () => {
      if (!dirty || numberInput.disabled) return;
      const result = parseControlNumber(control, numberInput.value);
      if (!result.ok) {
        error.textContent = result.error;
        error.hidden = false;
        numberInput.setAttribute("aria-invalid", "true");
        return;
      }
      dirty = false;
      error.hidden = true;
      numberInput.removeAttribute("aria-invalid");
      onEdit();
      onChange(result.value);
    };
    numberInput.addEventListener("focus", onEdit, events);
    numberInput.addEventListener(
      "input",
      () => {
        dirty = true;
        onEdit();
      },
      events,
    );
    numberInput.addEventListener("change", commit, events);
    numberInput.addEventListener("blur", commit, events);
    numberInput.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          dirty = false;
          sync(current, undefined, true);
        }
      },
      events,
    );
    element.append(entry);
  }
  element.append(hint, error);
  input.addEventListener(
    "input",
    () => {
      if (input.disabled) return;
      const value = Number(input.value);
      dirty = false;
      onEdit();
      onChange(value);
    },
    events,
  );
  function syncDisabled() {
    if (numberInput) numberInput.disabled = input.disabled;
    if (infinityButton) infinityButton.disabled = input.disabled;
  }
  function sync(value, state, force = false) {
    current = value;
    if (force) dirty = false;
    if (control.options)
      input.value = String(displayedOption(control, value).value);
    else input.value = String(value);
    const shown = control.discrete ? Math.floor(value) : value;
    output.value = control.format ? control.format(shown) : String(shown);
    input.setAttribute("aria-valuetext", output.value);
    if (state) {
      if (control.enabled) input.disabled = !control.enabled(state);
      hint.textContent =
        typeof control.hint === "function"
          ? control.hint(state)
          : (control.hint ?? "");
      hint.hidden = !hint.textContent;
    }
    if (numberInput && !dirty) {
      const physical = physicalValue(control, value);
      numberInput.value = Number.isFinite(physical)
        ? String(Number(physical.toPrecision(14)))
        : "";
      numberInput.placeholder = Number.isFinite(physical) ? "" : "∞";
      numberInput.removeAttribute("aria-invalid");
      error.hidden = true;
    }
    infinityButton?.setAttribute(
      "aria-pressed",
      String(value === control.numeric.infinity),
    );
    syncDisabled();
  }
  return {
    element,
    input,
    numberInput,
    output,
    hint,
    control,
    sync,
    syncDisabled,
  };
}

// Move the real result nodes, preserving their IDs and subsequent model updates.
// Declarative lessons replace their body, so a fresh result block replaces the old one.
export function bringReadingsForward(root, slot) {
  const readings = [
    ...root.querySelectorAll(
      ".stats,[data-stats],[data-numbers],[data-key-reading],.pixel-readings,.cal-summary,.flat-summary",
    ),
  ].filter((node) => !slot.contains(node));
  if (readings.length) slot.replaceChildren(...readings);
  slot.hidden = !slot.children.length;
}
