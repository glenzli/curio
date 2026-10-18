import test from "node:test";
import assert from "node:assert/strict";
import {
  collect,
  analyze,
  repeatedPtc,
  summarize,
  parameters,
  STUDIES,
  GAIN,
  READ_NOISE,
} from "./model.js";
import { BLACK, pairMoments, simulate } from "../flatfield/model.js";
const near = (a, b, e = 1e-10) =>
  assert.ok(Math.abs(a - b) < e, `${a} versus ${b}`);
const base = collect();
test("ensemble spread is the sample SD of parameter estimates, with explicit empty and one-value states", () => {
  assert.deepEqual(summarize([null, NaN, Infinity]), {
    n: 0,
    mean: null,
    sd: null,
  });
  assert.deepEqual(summarize([3, null]), { n: 1, mean: 3, sd: null });
  const s = summarize([1, 2, 3, 4, null]);
  assert.equal(s.n, 4);
  near(s.mean, 2.5);
  near(s.sd, Math.sqrt(5 / 3));
  near(summarize([11, 12, 13, 14]).sd, s.sd);
});
test("collection exposes observed moments only and independently resamples whole PTC datasets", () => {
  assert.equal(base.trials.length, STUDIES);
  assert.ok(base.trials.every((t) => !("truth" in t) && !("responses" in t)));
  assert.notDeepEqual(base.trials[0].measurements, base.trials[1].measurements);
  assert.deepEqual(collect().trials, base.trials);
  assert.notDeepEqual(collect({ batch: 1 }).trials, base.trials);
  for (const t of base.trials) {
    const point = t.measurements[5],
      d = point.display;
    const first = pairMoments(d.first, d.second);
    assert.equal(
      first.mean,
      (d.first.reduce((a, b) => a + b, 0) +
        d.second.reduce((a, b) => a + b, 0)) /
        (2 * base.side ** 2) -
        BLACK,
    );
    // At one pair the recorded arrays alone reproduce every fitted moment.
    assert.ok(point.temporal > 0);
    assert.ok(first.temporal > 0);
  }
  const one = collect({ pairs: 1 }).trials[0];
  for (const m of one.measurements) {
    const observed = pairMoments(m.display.first, m.display.second);
    near(m.temporal, observed.temporal);
    near(m.spatial, observed.spatial);
    near(m.mean, observed.mean);
  }
});
test("independent datasets retain the same fixed response map while changing photon and read-noise streams", () => {
  const args = {
    gain: GAIN,
    readNoise: READ_NOISE,
    prnu: 0.04,
    side: 16,
    pairs: 2,
    patternSeed: 100003,
  };
  const a = simulate({ ...args, seed: 48104 }),
    b = simulate({ ...args, seed: 148107 });
  assert.deepEqual(a.responses, b.responses);
  assert.notDeepEqual(
    a.measurements[5].display.first,
    b.measurements[5].display.first,
  );
  assert.deepEqual(
    a.measurements,
    collect({ prnuPercent: 4 }).trials[0].measurements,
  );
});
test("fitting reads observed values only and matches a hand-built straight-line dataset", () => {
  const measurements = Array.from({ length: 10 }, (_, level) => ({
    level,
    mean: level * 200,
    temporal: 0.2 * level * 200 + 4 + 1 / 12,
    spatial: 0.3 * level * 200 + 6,
    clipped: 0,
  }));
  const a = analyze([{ measurements, white: BLACK + 2400 }])[0];
  near(a.temporal.slope, 0.2);
  near(a.spatial.slope, 0.3);
  near(a.readNoise, 10);
  const altered = {
    measurements: measurements.map((m) => ({ ...m, truth: 1e8, gain: -99 })),
    white: BLACK + 2400,
    truth: { gain: 99, readNoise: 1e8 },
  };
  assert.deepEqual(analyze([altered])[0], a);
});
test("revealing studies and refitting never resample the original observations or alter full-ensemble summaries", () => {
  const a = repeatedPtc({}, base),
    b = repeatedPtc({ study: 1 }, base),
    c = repeatedPtc({ fitPercent: 30 }, base);
  assert.equal(a.trials, base.trials);
  assert.equal(c.trials, base.trials);
  assert.deepEqual(a.temporal, b.temporal);
  assert.deepEqual(a.read, b.read);
  assert.notDeepEqual(a.fits[0].selected, c.fits[0].selected);
  assert.notDeepEqual(a.fits, c.fits);
});
test("the declared finite ensemble recovers known gain and noise, and a larger sample reduces its observed spread", () => {
  const a = repeatedPtc({}, base),
    b = repeatedPtc({ roi: 1, pairs: 4 });
  assert.equal(a.temporal.n, 24);
  assert.equal(a.read.n, 24);
  assert.ok(
    Math.abs(a.temporal.mean - GAIN) < (4 * a.temporal.sd) / Math.sqrt(24),
  );
  assert.ok(
    Math.abs(a.read.mean - READ_NOISE) < (4 * a.read.sd) / Math.sqrt(24),
  );
  // This checks the fixed teaching ensemble, not a universal inequality for every draw.
  assert.ok(b.temporal.sd < a.temporal.sd * 0.6);
  assert.ok(b.read.sd < a.read.sd * 0.6);
});
test("stable PRNU, illumination mismatch and saturated points expose different systematic estimation errors", () => {
  const stable = repeatedPtc({ prnuPercent: 2 }),
    drift = repeatedPtc({ prnuPercent: 4, driftPercent: 20 }),
    clipped = repeatedPtc({ fitPercent: 105, exclude: 0 });
  assert.ok(Math.abs(stable.temporal.mean - GAIN) < 0.02);
  assert.ok(stable.spatial.mean > 0.8);
  assert.ok(drift.temporal.mean > 0.24);
  assert.ok(clipped.temporal.mean < 0.05);
  assert.ok(clipped.read.mean > 50);
  assert.ok(
    clipped.fits[0].selected.some(
      (j) => clipped.trials[0].measurements[j].clipped > 0.001,
    ),
  );
});
test("PTC repeat controls reject invalid sampling counts, fit ranges and random batches", () => {
  for (const p of [
    { roi: 2 },
    { pairs: 0 },
    { pairs: 1.5 },
    { prnuPercent: 6 },
    { driftPercent: 21 },
    { fitPercent: 20 },
    { exclude: 2 },
    { study: 0 },
    { batch: 0.5 },
    { batch: 10 },
    { study: NaN },
  ])
    assert.throws(() => parameters(p), RangeError);
});
