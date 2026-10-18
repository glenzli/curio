import test from "node:test";
import assert from "node:assert/strict";
import {
  focalSurface,
  response,
  focusSurvey,
  selectObservedPeak,
} from "./model.js";
test("matched sensor curvature removes mean field curvature but not astigmatism", () => {
  const m = focusSurvey({ sensor: 60, tilt: 0, trial: 1, noise: 0 });
  assert.deepEqual(m.locations[4].trueFoci, [15, -15]);
  assert(m.locations[4].current.every((x) => x < m.base));
});
test("noise-free focus brackets recover every known direction within half a step", () => {
  const m = focusSurvey({ curvature: 53, tilt: 13, noise: 0 });
  for (const l of m.locations)
    l.estimated.forEach((e, j) =>
      assert(Math.abs(e[0] - l.trueFoci[j]) <= 2.5),
    );
});
test("observed peak search has no access to declared focal truth", () => {
  assert.deepEqual(
    selectObservedPeak([
      [-1, 0.8],
      [0, 0.7],
      [1, 0.9],
    ]),
    [1, 0.9],
  );
  assert.throws(() => selectObservedPeak([]));
});
test("corner asymmetry can come from the explicit tilt or remount term", () => {
  assert.equal(focusSurvey({ tilt: 0, trial: 1 }).spread, 0);
  assert.equal(focusSurvey({ tilt: 10, trial: 1 }).spread, 20);
  assert.equal(focusSurvey({ tilt: 0, trial: 3 }).spread, 16);
  assert.deepEqual(focalSurface(0, 0), [0, 0]);
  assert.equal(response(20), response(-20));
});
