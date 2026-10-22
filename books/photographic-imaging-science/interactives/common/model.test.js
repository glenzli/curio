import test from "node:test";
import assert from "node:assert/strict";
import { restoredControlValue } from "./ui.js";
import { replay } from "./replay.js";
import {
  parseControlNumber,
  numericBounds,
  displayedOption,
} from "./controls.js";

test("exact physical inputs keep values between slider ticks", () => {
  const linear = { min: 0, max: 2, step: 0.01 };
  assert.equal(parseControlNumber(linear, "0.71237").value, 0.71237);
  const exposure = {
    min: -2,
    max: 6,
    step: 0.25,
    numeric: { toInput: (v) => 2 ** v, fromInput: Math.log2 },
  };
  const raw = parseControlNumber(exposure, "3").value;
  assert.equal(2 ** raw, 3);
  assert.notEqual(raw / exposure.step, Math.round(raw / exposure.step));
  const aperture = { ...exposure, min: 0.5, max: 4 };
  assert.ok(
    Math.abs(2 ** parseControlNumber(aperture, "2.8").value - 2.8) < 1e-14,
  );
});

test("reciprocal distances accept finite metres and reserve zero raw state for infinity", () => {
  const distance = {
    min: 0,
    max: 2,
    step: 0.05,
    numeric: { toInput: (v) => 1 / v, fromInput: (v) => 1 / v, infinity: 0 },
  };
  assert.deepEqual(numericBounds(distance), { min: 0.5, max: Infinity });
  assert.equal(parseControlNumber(distance, "3").value, 1 / 3);
  assert.equal(parseControlNumber(distance, "0").ok, false);
  assert.equal(parseControlNumber(distance, "Infinity").ok, false);
  assert.equal(restoredControlValue(distance, 0), 0);
});

test("physical range and integer constraints reject invalid edits instead of clamping", () => {
  const count = { min: 1, max: 100, step: 1, numeric: { step: 1 } };
  for (const text of ["", " ", "NaN", "Infinity", "0", "101", "2.5"])
    assert.equal(parseControlNumber(count, text).ok, false, text);
  assert.equal(parseControlNumber(count, "17").value, 17);
  const percentage = {
    min: 0,
    max: 1,
    step: 0.1,
    numeric: { toInput: (v) => 100 * v, fromInput: (v) => v / 100 },
  };
  assert.equal(parseControlNumber(percentage, "42.123").value, 0.42123);
});

test("named playback choices describe a continuous stored playhead without changing it", () => {
  const steps = {
    discrete: true,
    options: [0, 1, 2].map((value) => ({ value, label: `stage ${value}` })),
  };
  const raw = 1.375;
  assert.equal(displayedOption(steps, raw).value, 1);
  assert.equal(raw, 1.375);
  const irregular = {
    ...steps,
    optionValue: (v) => (v < 25 ? 0 : v < 80 ? 1 : 2),
  };
  assert.equal(displayedOption(irregular, 79.99).value, 1);
  assert.equal(displayedOption(irregular, 80).value, 2);
});
test("stored continuous optical values preserve ideal matching and quarter-wave thickness with step any", () => {
  const index = Math.sqrt(1.52),
    thickness = 550 / (4 * index);
  assert.equal(
    restoredControlValue({ min: 1, max: 2.2, step: "any", value: 1.38 }, index),
    index,
  );
  assert.equal(
    restoredControlValue(
      { min: 0, max: 300, step: "any", value: 100 },
      thickness,
    ),
    thickness,
  );
});
test("restored replay coefficients are not requantized into a different wavefront", () => {
  const coefficient = 0.123456789;
  assert.equal(
    restoredControlValue(
      { min: -0.25, max: 0.25, step: 0.005, value: 0 },
      coefficient,
    ),
    coefficient,
  );
});
test("out-of-range stored controls clamp and nonfinite values use authored defaults", () => {
  const control = { min: 0, max: 2, step: 0.01, value: 1 };
  assert.equal(restoredControlValue(control, -1), 0);
  assert.equal(restoredControlValue(control, 3), 2);
  for (const value of [undefined, null, "1", NaN, Infinity])
    assert.equal(restoredControlValue(control, value), 1);
});

test("a first frame older than the click keeps strict progress valid; finite replay and pause still work", (t) => {
  const pending = new Map();
  let nextId = 0,
    button,
    clock = 1000,
    dispose;
  class Button extends EventTarget {
    dataset = {};
    attributes = {};
    textContent = "";
    setAttribute(k, v) {
      this.attributes[k] = v;
    }
  }
  const actions = new EventTarget();
  actions.prepend = (b) => {
    button = b;
  };
  const root = new EventTarget();
  root.querySelector = () => actions;
  const doc = new EventTarget();
  doc.hidden = false;
  doc.createElement = () => new Button();
  const replacements = {
    document: doc,
    requestAnimationFrame: (fn) => {
      const id = ++nextId;
      pending.set(id, fn);
      return id;
    },
    cancelAnimationFrame: (id) => pending.delete(id),
    IntersectionObserver: class {
      observe() {}
      disconnect() {}
    },
  };
  const descriptors = Object.fromEntries(
    Object.keys(replacements).map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  t.after(() => {
    dispose?.();
    for (const [key, descriptor] of Object.entries(descriptors))
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
  });
  for (const [key, value] of Object.entries(replacements)) {
    Object.defineProperty(globalThis, key, {
      value,
      writable: true,
      configurable: true,
    });
  }
  t.mock.method(performance, "now", () => clock);
  const state = { progress: 1 },
    drawn = [];
  dispose = replay({
    root,
    state,
    key: "progress",
    start: 0,
    end: 1,
    durationMs: 100,
    element: {},
    signal: new AbortController().signal,
    label: "追迹",
    startOnFirstPlay: true,
    render() {
      assert.ok(state.progress >= 0 && state.progress <= 1);
      drawn.push(state.progress);
    },
  });
  const frame = (time) => {
    assert.equal(pending.size, 1);
    const [id, fn] = pending.entries().next().value;
    pending.delete(id);
    fn(time);
  };
  button.dispatchEvent(new Event("click"));
  frame(999);
  assert.equal(state.progress, 0);
  frame(1049);
  assert.ok(state.progress > 0 && state.progress < 1);
  frame(1200);
  assert.equal(state.progress, 1);
  assert.equal(pending.size, 0);
  assert.equal(button.textContent, "追迹");
  clock = 2000;
  button.dispatchEvent(new Event("click"));
  frame(1999);
  assert.equal(state.progress, 0);
  frame(2010);
  assert.ok(state.progress > drawn.at(-1));
  root.dispatchEvent(new Event("input"));
  assert.equal(pending.size, 0);
  assert.equal(button.attributes["aria-pressed"], "false");
  assert.equal(drawn.at(-1), state.progress);
  assert.ok(drawn.includes(1));
  button.dispatchEvent(new Event("click"));
  assert.equal(pending.size, 1);
  root.dispatchEvent(new Event("mb-control-edit"));
  assert.equal(pending.size, 0);
  assert.equal(button.attributes["aria-pressed"], "false");
});

test("legacy explanatory percentages restore to named stages without changing physical controls", async () => {
  const { migrateStageProgress } = await import("./ui.js");
  const old = {
    version: 1,
    parameters: { progress: 67, red: 2, blue: 2.5, seed: 17 },
    preset: "saved",
  };
  const wb = migrateStageProgress(old, 34, 2);
  assert.deepEqual(wb, {
    ...old,
    version: 2,
    parameters: { ...old.parameters, progress: 1 },
  });
  assert.equal(old.parameters.progress, 67);
  assert.equal(
    migrateStageProgress({ version: 1, parameters: { progress: 100 } }, 20, 4)
      .parameters.progress,
    4,
  );
  assert.equal(
    migrateStageProgress({ version: 1, parameters: { progress: -4 } }, 20, 4)
      .parameters.progress,
    0,
  );
  assert.equal(
    migrateStageProgress({ version: 1, parameters: {} }, 20, 4).parameters
      .progress,
    4,
  );
  assert.equal(migrateStageProgress(wb, 34, 2), wb);
  assert.equal(
    migrateStageProgress(
      { version: 1, parameters: { progress: 85 } },
      [0, 30, 60, 85],
      3,
    ).parameters.progress,
    3,
  );
  assert.equal(
    migrateStageProgress(
      { version: 1, parameters: { progress: 34 } },
      [0, 10, 35, 60, 85],
      4,
    ).parameters.progress,
    1,
  );
});

test("plot curves and sample markers stay in a local clipping viewport; axes and labels stay outside it", async () => {
  const { plot } = await import("./ui.js");
  const svg = plot({
    curves: [
      {
        color: "#123456",
        points: [
          [-1, 3],
          [0, 0.5],
          [2, -1],
        ],
      },
    ],
    samples: [
      [0, 0.5],
      [2, -1],
    ],
    xMax: 1,
    title: "clipped & labelled",
    xLabel: "x",
    yLabel: "y",
  });
  assert.match(
    svg,
    /<svg x="48" y="38" width="574" height="182" viewBox="48 38 574 182" overflow="hidden" data-plot-field="true" style="width:574px;height:182px;overflow:hidden">/,
  );
  const field = svg.match(/data-plot-field="true"[^>]*>([\s\S]*?)<\/svg>/)[1];
  assert.match(field, /<path/);
  assert.match(field, /<circle/);
  assert.doesNotMatch(field, /<text/);
  assert.doesNotMatch(svg, /clipPath|url\(#/);
  assert.match(svg, /clipped &amp; labelled/);
});

test("a replay with an inactive controlled parameter cannot start a meaningless animation", (t) => {
  class Button extends EventTarget {
    dataset = {};
    setAttribute() {}
  }
  const actions = new EventTarget();
  let button;
  actions.prepend = (b) => (button = b);
  const root = new EventTarget();
  root.querySelector = (s) =>
    s.startsWith("[data-control-key") ? { disabled: true } : actions;
  const doc = new EventTarget();
  doc.createElement = () => new Button();
  doc.hidden = false;
  const replacements = {
    document: doc,
    requestAnimationFrame: () => {
      throw Error("inactive replay started");
    },
    cancelAnimationFrame() {},
    IntersectionObserver: class {
      observe() {}
      disconnect() {}
    },
  };
  const saved = Object.fromEntries(
    Object.keys(replacements).map((k) => [
      k,
      Object.getOwnPropertyDescriptor(globalThis, k),
    ]),
  );
  for (const [k, v] of Object.entries(replacements))
    Object.defineProperty(globalThis, k, {
      value: v,
      writable: true,
      configurable: true,
    });
  const cleanup = replay({
    root,
    state: { scan: 0 },
    key: "scan",
    element: {},
    signal: new AbortController().signal,
    render() {},
  });
  t.after(() => {
    cleanup();
    for (const [k, d] of Object.entries(saved))
      if (d) Object.defineProperty(globalThis, k, d);
      else delete globalThis[k];
  });
  assert.equal(button.disabled, true);
  button.dispatchEvent(new Event("click"));
});

test("chart ticks distinguish quarter fractions and small physical values instead of rounding to the same labels", async () => {
  const { plot, tickLabel } = await import("./ui.js");
  const svg = plot({
    curves: [],
    xMax: 1,
    yMax: 4e-6,
    xLabel: "phase",
    title: "small scales",
  });
  assert.match(svg, />0\.25<\/text>/);
  assert.match(svg, />0\.75<\/text>/);
  assert.match(svg, />1e-6<\/text>/);
  assert.match(svg, />4e-6<\/text>/);
  assert.equal(tickLabel(0.125), "0.125");
  assert.equal(tickLabel(0), "0");
  assert.notEqual(tickLabel(1e-8), tickLabel(2e-8));
});

test("manual mode stops playback while keeping the physical input available, then auto mode can resume", (t) => {
  class Button extends EventTarget {
    dataset = {};
    setAttribute() {}
  }
  const actions = new EventTarget(),
    root = new EventTarget(),
    doc = new EventTarget();
  let button,
    next = 0;
  const pending = new Map(),
    input = { disabled: false };
  actions.prepend = (b) => {
    button = b;
  };
  root.querySelector = (s) =>
    s.startsWith("[data-control-key") ? input : actions;
  doc.createElement = () => new Button();
  const replacements = {
    document: doc,
    requestAnimationFrame: (fn) => {
      pending.set(++next, fn);
      return next;
    },
    cancelAnimationFrame: (id) => pending.delete(id),
    IntersectionObserver: class {
      observe() {}
      disconnect() {}
    },
  };
  const previous = Object.fromEntries(
    Object.keys(replacements).map((k) => [
      k,
      Object.getOwnPropertyDescriptor(globalThis, k),
    ]),
  );
  for (const [k, value] of Object.entries(replacements))
    Object.defineProperty(globalThis, k, {
      value,
      configurable: true,
      writable: true,
    });
  const state = { progress: 0, mode: "auto" };
  let renders = 0;
  const dispose = replay({
    root,
    state,
    key: "progress",
    element: {},
    signal: new AbortController().signal,
    enabled: (s) => s.mode === "auto",
    render() {
      renders++;
      root.dispatchEvent(new Event("mb-controls-updated"));
    },
  });
  t.after(() => {
    dispose();
    for (const [k, d] of Object.entries(previous)) {
      if (d) Object.defineProperty(globalThis, k, d);
      else delete globalThis[k];
    }
  });
  button.dispatchEvent(new Event("click"));
  assert.equal(pending.size, 1);
  state.mode = "manual";
  root.dispatchEvent(new Event("mb-controls-updated"));
  assert.equal(input.disabled, false);
  assert.equal(button.disabled, true);
  assert.equal(pending.size, 0);
  assert.equal(button.textContent, "播放演示");
  const pausedRenders = renders;
  button.dispatchEvent(new Event("click"));
  assert.equal(renders, pausedRenders);
  state.mode = "auto";
  root.dispatchEvent(new Event("mb-controls-updated"));
  assert.equal(button.disabled, false);
  button.dispatchEvent(new Event("click"));
  assert.equal(pending.size, 1);
  input.disabled = true;
  root.dispatchEvent(new Event("mb-controls-updated"));
  assert.equal(button.disabled, true);
  assert.equal(pending.size, 0);
});
