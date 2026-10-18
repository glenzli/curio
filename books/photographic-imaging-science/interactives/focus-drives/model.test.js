import test from "node:test";
import assert from "node:assert/strict";
import { stepperState, voiceCoilState, waveState, WAVE } from "./model.js";
const near = (a, b, t = 1e-10) =>
  assert.ok(Math.abs(a - b) <= t, a + " versus " + b);

test("200 step, 16 microstep, .5mm lead gives .15625um commands", () => {
  const m = stepperState({ phase: 0.25 });
  near(m.commandIntervalUm, 0.15625);
  near(m.rotation, 4 * Math.PI);
  near(m.ideal, 1);
  near(m.position, 1);
});
test("reversal waits through full backlash then returns on the other flank", () => {
  const p = stepperState({ phase: 0.5 }),
    a = stepperState({ phase: 0.51 }),
    b = stepperState({ phase: 0.55 });
  near(p.position, 2);
  near(a.position, 2);
  assert.equal(a.takingUp, true);
  near(b.ideal, 1.8);
  near(b.position, 1.88);
  assert.equal(b.takingUp, false);
  near(stepperState({ phase: 1 }).position, 0.08);
});
test("analytic screw history agrees with an independent stateful clearance operator", () => {
  for (const subdivisions of [1, 2, 16]) {
    let actual = 0,
      previous = 0;
    for (let i = 0; i <= 1000; i++) {
      const m = stepperState({ phase: i / 1000, subdivisions });
      if (m.ideal >= previous) actual = m.ideal;
      else actual = Math.min(actual, m.ideal + m.backlash);
      near(actual, m.position);
      previous = m.ideal;
    }
  }
});
test("microstepping changes quantization, leaves mechanical return error", () => {
  const coarse = stepperState({ phase: 1, subdivisions: 1, backlash: 0.008 });
  const fine = stepperState({ phase: 1, subdivisions: 16, backlash: 0.008 });
  near(coarse.error, 0.008);
  near(fine.error, 0.008);
  near(coarse.commandIntervalUm / fine.commandIntervalUm, 16);
  for (let i = 0; i <= 100; i++) {
    const m = stepperState({ phase: i / 100 });
    assert.ok(
      Math.abs(m.quantizationError) * 1000 <= m.commandIntervalUm / 2 + 1e-10,
    );
  }
});
test("VCM pulse matches the original 10ms .25mm example and a .5mm stopped endpoint", () => {
  const a = voiceCoilState({ phase: 0.5 }),
    b = voiceCoilState({ phase: 1 });
  near(a.positionMm, 0.25);
  near(a.velocity, 0.05);
  near(b.positionMm, 0.5);
  near(b.velocity, 0);
  near(b.force, 0);
  assert.equal(b.stopped, true);
});
test("reverse current brakes without instantly reversing velocity; no-brake endpoint coasts", () => {
  const a = voiceCoilState({ phase: 0.7 }),
    b = voiceCoilState({ phase: 1, brake: 0 });
  assert.ok(a.force < 0 && a.velocity > 0);
  near(a.positionMm, 0.41);
  near(b.positionMm, 1);
  near(b.velocity, 0.1);
  near(b.force, 0);
  assert.equal(b.stopped, false);
});
test("closed-form VCM positions agree with independent midpoint force integration", () => {
  for (const brake of [0, 1])
    for (const mass of [10, 20, 40])
      for (const phase of [0.25, 0.5, 0.7, 1]) {
        const m = voiceCoilState({ brake, mass, phase });
        const steps = 1000;
        const times = [
          ...Array.from({ length: steps + 1 }, (_, i) => (m.time * i) / steps),
          Math.min(m.duration, m.time),
        ].sort((a, b) => a - b);
        let x = 0,
          v = 0;
        for (let i = 1; i < times.length; i++) {
          const dt = times[i] - times[i - 1],
            time = (times[i] + times[i - 1]) / 2;
          const I = brake && time >= m.duration ? -m.current : m.current;
          const a = (m.forceConstant * I) / (mass / 1000);
          x += v * dt + (a * dt * dt) / 2;
          v += a * dt;
        }
        near(v, m.velocity, 1e-12);
        near(x * 1000, m.positionMm, 1e-11);
        near(m.velocity, m.impulseVelocity);
      }
});
test("halving mass doubles displacement and speed for the same pulse", () => {
  const a = voiceCoilState({ mass: 20 }),
    b = voiceCoilState({ mass: 10 });
  near(b.positionMm, 2 * a.positionMm);
  near(b.velocity, 2 * a.velocity);
});
test("two quadrature standing waves sum to the specified traveling wave", () => {
  for (const direction of [-1, 1])
    for (const phase of [0, 0.13, 0.5, 1]) {
      const m = waveState({ direction, phase });
      for (let j = 0; j < 37; j++) {
        const phi = (2 * Math.PI * j) / 37;
        near(
          m.standingComponents(phi).reduce((a, b) => a + b, 0),
          m.point(phi).normal,
          1e-15,
        );
      }
    }
});
test("marked material point stays on its own ellipse; analytic velocities match finite differences", () => {
  for (const direction of [-1, 1])
    for (const phase of [0.12, 0.37, 0.68]) {
      const m = waveState({ phase, direction }),
        p = m.materialPoint,
        e = 1e-6;
      near((p.normal / m.A) ** 2 + (p.tangent / (m.gamma * m.A)) ** 2, 1);
      const lo = waveState({ phase: phase - e, direction }).materialPoint;
      const hi = waveState({ phase: phase + e, direction }).materialPoint;
      const dt = (8 * e) / (m.frequency * 1000);
      near((hi.normal - lo.normal) / dt, p.normalVelocity, 1e-6);
      near((hi.tangent - lo.tangent) / dt, p.tangentVelocity, 1e-6);
    }
});
test("wave crests travel opposite to the top material velocity and ideal rotor reference", () => {
  const m = waveState({ phase: 0 });
  near(m.periodUs, 25);
  near(m.gamma, 0.45);
  near(m.materialPoint.tangentVelocity, -0.45 * 0.002 * 2 * Math.PI * 40000);
  assert.ok(m.crestVelocity < 0);
  near(m.referenceRpm, -135);
  const reverse = waveState({ phase: 0.2, direction: -1 });
  assert.ok(reverse.crestVelocity > 0 && reverse.rotorAngle > 0);
});
test("one physical period closes material motion but advances the rotor reference", () => {
  const a = waveState({ phase: 0 }),
    b = waveState({ phase: 0.25 });
  near(a.materialPoint.normal, b.materialPoint.normal);
  near(a.materialPoint.tangent, b.materialPoint.tangent);
  near(b.timeUs, 25);
  near((b.rotorAngle * 180) / Math.PI, -0.02025);
  near((b.rotorAngle * WAVE.enlargement * 180) / Math.PI, -10.125);
});
test("declared drive endpoints are finite and malformed states reject", () => {
  for (const phase of [0, 0.5, 1]) {
    assert.ok(Number.isFinite(stepperState({ phase }).position));
    assert.ok(Number.isFinite(voiceCoilState({ phase }).positionMm));
    assert.ok(Number.isFinite(waveState({ phase }).rotorAngle));
  }
  for (const p of [
    { phase: NaN },
    { phase: 1.1 },
    { subdivisions: 3 },
    { lead: 0 },
    { backlash: -1 },
  ])
    assert.throws(() => stepperState(p), RangeError);
  for (const p of [
    { mass: 0 },
    { current: Infinity },
    { halfPulse: 0 },
    { brake: 2 },
  ])
    assert.throws(() => voiceCoilState(p), RangeError);
  for (const p of [
    { amplitude: 0 },
    { frequency: 0 },
    { direction: 0 },
    { separation: 2 },
  ])
    assert.throws(() => waveState(p), RangeError);
});
