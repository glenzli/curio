import test from "node:test";
import assert from "node:assert/strict";
import { fft, fft2 } from "./fft.js";
import {
  parameters,
  pupil,
  propagate,
  amplitudeAt,
  indexAt,
  otfAt,
  directCorrelation,
  polarAmplitude,
  airyRelative,
  circularOtf,
  defocusOnAxis,
  phasorTrace,
  wavefront,
} from "./model.js";
const near = (a, b, e = 2e-11) =>
  assert.ok(Math.abs(a - b) < e, `${a} != ${b} (tolerance ${e})`);
const complexNear = (a, b, e) => a.forEach((v, i) => near(v, b[i], e));

test("wave declared Zernike coefficients equal continuous disk RMS and exclude piston and tilt", () => {
  const keys = ["defocus", "astigmatism", "coma", "spherical"];
  const ps = keys.map((key) => parameters({ [key]: 1 }));
  const mean = [0, 0, 0, 0],
    gram = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
  const nr = 512,
    nt = 64;
  for (let j = 0; j < nr; j++)
    for (let k = 0; k < nt; k++) {
      const r = Math.sqrt((j + 0.5) / nr),
        angle = (2 * Math.PI * (k + 0.5)) / nt;
      const values = ps.map((p) =>
        wavefront(r * Math.cos(angle), r * Math.sin(angle), p),
      );
      values.forEach((a, i) => {
        mean[i] += a / (nr * nt);
        values.forEach((b, l) => (gram[i][l] += (a * b) / (nr * nt)));
      });
    }
  mean.forEach((v) => near(v, 0, 1e-5));
  gram.forEach((row, i) =>
    row.forEach((v, j) => near(v, i === j ? 1 : 0, 5e-5)),
  );
});

test("wave FFT uses the declared negative sign, complex input and inverse scaling", () => {
  const n = 8,
    r = Float64Array.from({ length: n }, (_, i) => Math.sin(i) + i / 9),
    im = Float64Array.from(r, (_, i) => Math.cos(i * 2));
  const expected = Array.from({ length: n }, (_, k) => {
    let a = 0,
      b = 0;
    for (let j = 0; j < n; j++) {
      const t = (-2 * Math.PI * k * j) / n;
      a += r[j] * Math.cos(t) - im[j] * Math.sin(t);
      b += r[j] * Math.sin(t) + im[j] * Math.cos(t);
    }
    return [a, b];
  });
  const oldR = r.slice(),
    oldI = im.slice();
  fft(r, im);
  expected.forEach((z, i) => complexNear([r[i], im[i]], z));
  fft(r, im, true);
  r.forEach((v, i) => complexNear([v, im[i]], [oldR[i], oldI[i]]));
  const a = Float64Array.from({ length: 64 }, (_, i) => Math.sin(i / 5)),
    b = a.map((v) => v / 3),
    aa = a.slice(),
    bb = b.slice();
  fft2(a, b, 8);
  fft2(a, b, 8, true);
  a.forEach((v, i) => complexNear([v, b[i]], [aa[i], bb[i]]));
});
test("wave physical sampling, area, pre-normalization Parseval and normalized density carry consistent units", () => {
  for (const input of [
    {},
    { defocus: 0.25 },
    { astigmatism: 0.2, coma: 0.16, spherical: -0.1 },
    { wavelengthNm: 400, fNumber: 4 },
  ]) {
    const g = propagate(input);
    near(g.parseval, 1, 8e-13);
    near(g.integral, 1, 8e-13);
    complexNear(otfAt(g, 0), [1, 0]);
    near(g.imageStepUm, g.scaleUm / 4);
    near(g.cutoff, 1000 / g.scaleUm);
    near(g.frequencyStep, g.cutoff / 64);
    assert.ok(Math.abs(g.area - Math.PI) < 0.014);
    assert.ok(g.psf.every((v) => v >= 0));
  }
  const a = propagate(),
    b = propagate({ fNumber: 16 });
  near(b.psf[0] * 4, a.psf[0]);
  near(b.imageStepUm, a.imageStepUm * 2);
  near(b.cutoff * 2, a.cutoff);
});
test("wave OTF from transformed PSF agrees with independent nonperiodic complex pupil correlation", () => {
  for (const p of [
    {},
    { coma: 0.14 },
    { defocus: 0.22, astigmatism: 0.13, spherical: -0.08 },
    { tilt: 0.125 },
  ]) {
    const g = propagate(p);
    for (const [x, y] of [
      [0, 0],
      [8, 0],
      [0, 16],
      [24, 7],
      [32, 32],
      [64, 0],
      [70, 0],
    ]) {
      complexNear(otfAt(g, x, y), directCorrelation(g, x, y));
      const a = otfAt(g, x, y),
        b = otfAt(g, -x, -y);
      complexNear(a, [b[0], -b[1]]);
      assert.ok(Math.hypot(...a) <= 1 + 1e-12);
    }
  }
});
test("wave zero-padded autocorrelation has no wraparound inside the displayed support", () => {
  const g = propagate({ coma: 0.2 });
  for (let k = 64; k <= g.size - 64; k += 8) complexNear(otfAt(g, k), [0, 0]);
  const a = propagate({ padding: 2 }),
    b = propagate({ padding: 8 });
  for (const k of [0, 8, 24, 48, 64]) complexNear(otfAt(a, k), otfAt(b, k));
  // Padding refines image sampling only, not pupil integration or the OTF frequency step.
  near(a.frequencyStep, b.frequencyStep);
  near(a.imageStepUm, 4 * b.imageStepUm);
  near(a.onAxisRatio, b.onAxisRatio);
});
test("wave clear circular pupil matches Airy amplitude and disk-overlap OTF with declared finite-grid error", () => {
  for (const diameter of [32, 64, 128]) {
    const g = propagate({ diameter });
    for (const k of [0, 1, 2, 4, 6, 8, 12, 16]) {
      const a = amplitudeAt(g, k);
      near(a[1], 0);
      near(a[0] ** 2, airyRelative(k / 4), diameter === 32 ? 0.006 : 0.002);
    }
    for (let k = 0; k <= diameter; k += diameter / 16)
      near(
        otfAt(g, k)[0],
        circularOtf(k / diameter),
        diameter === 32 ? 0.009 : 0.004,
      );
  }
  near(airyRelative(0), 1);
  assert.ok(airyRelative(3.8317059702075125 / Math.PI) < 1e-25);
  near(circularOtf(0.5), 0.39100221895577075);
  near(circularOtf(1), 0);
  near(circularOtf(2), 0);
});
test("wave pupil-grid refinement converges independently of Fourier padding", () => {
  const coarse = propagate({ diameter: 32 }),
    fine = propagate({ diameter: 128 });
  const otfError = (g) =>
    Array.from({ length: 17 }, (_, j) =>
      Math.abs(otfAt(g, (j * g.p.diameter) / 16)[0] - circularOtf(j / 16)),
    ).reduce((a, b) => a + b, 0);
  assert.ok(otfError(fine) < otfError(coarse) / 4);
  assert.ok(
    Math.abs(fine.area - Math.PI) < Math.abs(coarse.area - Math.PI) / 4,
  );
  for (const p of [
    { defocus: 0.12 },
    { coma: 0.12 },
    { astigmatism: 0.12 },
    { spherical: 0.12 },
  ]) {
    const truth = polarAmplitude(p, 1, 0, 384, 256);
    const a = amplitudeAt(propagate({ ...p, diameter: 32 }), 4);
    const b = amplitudeAt(propagate({ ...p, diameter: 128 }), 4);
    assert.ok(
      Math.hypot(b[0] - truth[0], b[1] - truth[1]) <
        Math.hypot(a[0] - truth[0], a[1] - truth[1]) / 2,
    );
  }
});
test("wave continuous polar integration and pure-defocus closed form retain non-FFT truth", () => {
  for (const a of [0, 0.04, 0.12, 0.25, -0.25]) {
    const z = polarAmplitude({ defocus: a }, 0, 0, 768, 128);
    near(z[0] ** 2 + z[1] ** 2, defocusOnAxis(a), 2e-6);
    near(
      propagate({ defocus: a, diameter: 128 }).onAxisRatio,
      defocusOnAxis(a),
      0.002,
    );
  }
  for (const q of [0, 0.25, 1, 1.5, 2]) {
    const a = polarAmplitude({}, q);
    near(a[0] ** 2 + a[1] ** 2, airyRelative(q), 1e-5);
    near(a[1], 0);
  }
});
test("wave phase piston preserves PSF and OTF; tilt produces translation and the correct OTF phase sign", () => {
  const g = propagate({ coma: 0.12 }),
    p = propagate({ coma: 0.12, piston: 0.4 });
  for (let k = 0; k < g.psf.length; k += 41) near(g.psf[k], p.psf[k]);
  for (const k of [0, 8, 16, 32]) complexNear(otfAt(g, k), otfAt(p, k));
  // 2*t*x waves -> image shift 4*t*lambda*N; t=.125 -> exactly 2 image grid cells.
  const a = propagate(),
    b = propagate({ tilt: 0.125 });
  for (let x = -12; x < 12; x++)
    near(b.psf[indexAt(b, x)], a.psf[indexAt(a, x - 2)]);
  for (const k of [8, 16, 32]) {
    const phase = -4 * Math.PI * 0.125 * ((2 * k) / 64),
      h = circularOtf(k / 64),
      z = otfAt(b, k);
    near(z[0], otfAt(a, k)[0] * Math.cos(phase));
    near(z[1], otfAt(a, k)[0] * Math.sin(phase));
    assert.ok(h > 0);
  }
});
test("wave coma reversal mirrors PSF and conjugates x OTF; astigmatism reverses axes", () => {
  const a = propagate({ coma: 0.12 }),
    b = propagate({ coma: -0.12 });
  for (let x = -14; x <= 14; x++)
    near(a.psf[indexAt(a, x)], b.psf[indexAt(b, -x)]);
  const z = otfAt(a, 16),
    w = otfAt(b, 16);
  complexNear(z, [w[0], -w[1]]);
  assert.ok(Math.abs(z[1]) > 0.02);
  const c = propagate({ defocus: 0.12, astigmatism: 0.12 }),
    d = propagate({ defocus: 0.12, astigmatism: -0.12 });
  for (let x = -12; x <= 12; x++)
    near(c.psf[indexAt(c, x)], d.psf[indexAt(d, 0, x)]);
  near(
    pupil({
      defocus: 0.1,
      astigmatism: 0.2,
      coma: 0.1,
      spherical: 0.05,
      tilt: 0.5,
      piston: 0.8,
    }).rms,
    0.25,
  );
});
test("wave phasor construction closes at the direct amplitude without altering PSF energy", () => {
  const g = propagate({ coma: 0.12, defocus: 0.1 });
  for (const k of [0, 1, 4, 8]) {
    const t = phasorTrace(g, k / 4);
    assert.equal(t.length, 33);
    complexNear(t[0], [0, 0]);
    complexNear(t.at(-1), amplitudeAt(g, k));
  }
});
test("wave rejects unsupported grids, invalid scales and nonfinite coefficients", () => {
  for (const p of [
    { fNumber: 0 },
    { wavelengthNm: NaN },
    { diameter: 96 },
    { padding: 3 },
    { coma: Infinity },
    { spherical: 2 },
  ])
    assert.throws(() => parameters(p), RangeError);
  assert.throws(
    () => fft(new Float64Array(3), new Float64Array(3)),
    RangeError,
  );
  assert.throws(() => directCorrelation(pupil(), 0.2), RangeError);
});
