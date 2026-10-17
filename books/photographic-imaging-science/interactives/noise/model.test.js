import test from "node:test";
import assert from "node:assert/strict";
import { noiseBudget, poisson, randomGenerator, samplePixel } from "./model.js";

test("chapter 4 worked example and independent averaging", () => {
  const short = noiseBudget();
  assert.ok(Math.abs(short.snr - 4.074) < 0.002);
  const long = noiseBudget({ exposure: 100 });
  assert.ok(Math.abs(long.snr - 44.565) < 0.02);
  const average = noiseBudget({ frames: 16 });
  assert.equal(average.sigma, short.sigma / 4);
  assert.equal(average.snr, short.snr * 4);
  assert.throws(() => noiseBudget({ exposure: 0 }));
  assert.throws(() => noiseBudget({ frames: 1.5 }));
});

test("seeded Poisson sampling has the required mean and variance in both branches", () => {
  for (const mean of [0.1, 20, 30, 200]) {
    const random = randomGenerator(20261017);
    const count = 40000;
    let sum = 0;
    let square = 0;
    for (let i = 0; i < count; i++) {
      const x = poisson(mean, random);
      assert.ok(Number.isInteger(x) && x >= 0);
      sum += x;
      square += x * x;
    }
    const observed = sum / count;
    const variance = square / count - observed ** 2;
    assert.ok(
      Math.abs(observed - mean) < 5 * Math.sqrt(mean / count),
      `${mean}: mean ${observed}`,
    );
    assert.ok(
      Math.abs(variance - mean) < Math.max(0.01, mean * 0.05),
      `${mean}: variance ${variance}`,
    );
  }
  assert.equal(poisson(0, randomGenerator()), 0);
});

test("a simulated pixel agrees with the electronic-domain variance model", () => {
  const parameters = {
    signalRate: 20,
    darkRate: 0.1,
    exposure: 1,
    readNoise: 2,
    frames: 4,
  };
  const random = randomGenerator(71);
  let sum = 0;
  let square = 0;
  const count = 25000;
  for (let i = 0; i < count; i++) {
    const x = samplePixel(parameters, random);
    sum += x;
    square += x * x;
  }
  const mean = sum / count;
  const budget = noiseBudget(parameters);
  assert.ok(Math.abs(mean - budget.signal) < 0.1);
  assert.ok(Math.abs(square / count - mean ** 2 - budget.variance) < 0.2);
  assert.equal(
    samplePixel(parameters, randomGenerator(5)),
    samplePixel(parameters, randomGenerator(5)),
  );
});
