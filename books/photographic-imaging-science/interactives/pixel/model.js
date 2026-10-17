import { normal, randomGenerator } from "../noise/model.js";

export const Q = 1.602176634e-19;
export const KB = 1.380649e-23;
export const V0 = 1.2;
export const stages = [
  {
    start: 0,
    end: 25,
    at: 12,
    name: "积分",
    detail: "TX 关闭，信号电子积存在 PPD；FD 此时的旧电平不参与测量。",
  },
  {
    start: 25,
    end: 38,
    at: 31,
    name: "FD 复位",
    detail: "RST 打开，把 FD 接到复位电源。TX 仍关闭，PPD 中的信号电荷保留。",
  },
  {
    start: 38,
    end: 50,
    at: 46,
    name: "采样 Vᴿ",
    detail:
      "RST 关闭后，先采 FD 参考电平。复位留下的随机偏移 k 包含在这次读数中。",
  },
  {
    start: 50,
    end: 65,
    at: 57,
    name: "电荷转移",
    detail: "打开 TX，PPD 中的电荷移到 FD；FD 电压随转入的电子数下降。",
  },
  {
    start: 65,
    end: 80,
    at: 76,
    name: "采样 Vˢ",
    detail:
      "TX 关闭后采信号电平。两次采样之间没有再次复位 FD，所以同一个 k 仍在。",
  },
  {
    start: 80,
    end: 100,
    at: 100,
    name: "差分",
    detail:
      "用 Vᴿ − Vˢ 得到信号电压。共同的 k 抵消，两个独立采样误差仍留在差值中。",
  },
];

function finite(value, name, min = -Infinity, strict = false) {
  if (!Number.isFinite(value) || (strict ? value <= min : value < min))
    throw new RangeError(`Invalid ${name}`);
}

// Linear FD, unity source-follower gain; all voltages are input referred to FD.
export function noiseBudget(
  capacitanceFf = 10,
  sampleNoiseUv = 30,
  temperature = 300,
) {
  finite(capacitanceFf, "FD capacitance", 0, true);
  finite(sampleNoiseUv, "sample noise", 0);
  finite(temperature, "temperature", 0);
  const c = capacitanceFf * 1e-15,
    gain = Q / c;
  const resetV = Math.sqrt((KB * temperature) / c),
    sampleV = sampleNoiseUv * 1e-6;
  return {
    gain,
    resetV,
    resetE: resetV / gain,
    sampleV,
    singleE: Math.hypot(resetV, sampleV) / gain,
    cdsE: (Math.SQRT2 * sampleV) / gain,
  };
}

export function readPair({
  electrons = 1000,
  capacitanceFf = 10,
  sampleNoiseUv = 30,
  resetOffsetV = 0,
  seed = 20261017,
} = {}) {
  finite(electrons, "signal charge", 0);
  finite(resetOffsetV, "reset offset");
  finite(seed, "seed");
  const budget = noiseBudget(capacitanceFf, sampleNoiseUv);
  const random = randomGenerator(seed);
  const nR = budget.sampleV * normal(random),
    nS = budget.sampleV * normal(random);
  const reference = V0 + resetOffsetV + nR;
  const signal = V0 + resetOffsetV - budget.gain * electrons + nS;
  const difference = reference - signal;
  return {
    ...budget,
    reference,
    signal,
    difference,
    nR,
    nS,
    resetOffsetV,
    estimated: difference / budget.gain,
    singleEstimated: (V0 - signal) / budget.gain,
  };
}

export function pixelState({
  progress = 100,
  resetSigma = 1.5,
  ...parameters
} = {}) {
  finite(progress, "progress", 0);
  if (progress > 100) throw new RangeError("Progress exceeds 100");
  finite(resetSigma, "reset offset in standard deviations");
  const electrons = parameters.electrons ?? 1000;
  const budget = noiseBudget(
    parameters.capacitanceFf,
    parameters.sampleNoiseUv,
  );
  const pair = readPair({
    ...parameters,
    resetOffsetV: resetSigma * budget.resetV,
  });
  const collected = electrons * Math.min(1, progress / 25);
  const fraction = Math.max(0, Math.min(1, (progress - 50) / 15));
  const fdCharge = electrons * fraction;
  const rst = progress >= 25 && progress < 38;
  const tx = progress >= 50 && progress < 65;
  const sel = progress >= 38 && progress < 80;
  return {
    ...pair,
    progress,
    electrons,
    collected,
    ppdCharge: collected - fdCharge,
    fdCharge,
    rst,
    tx,
    sel,
    referenceAvailable: progress >= 44,
    signalAvailable: progress >= 73,
    differenceAvailable: progress >= 80,
    fdVoltage:
      progress < 25
        ? null
        : rst
          ? V0
          : V0 + pair.resetOffsetV - budget.gain * fdCharge,
    stage: stages.findIndex(
      (s) => progress >= s.start && (progress < s.end || s.end === 100),
    ),
  };
}

// Fixed charge in every trial: this isolates readout noise, not photon shot noise.
export function repeatedReads({
  capacitanceFf = 10,
  sampleNoiseUv = 30,
  seed = 20261017,
  count = 64,
} = {}) {
  if (!Number.isInteger(count) || count < 1)
    throw new RangeError("Invalid trial count");
  finite(seed, "seed");
  const b = noiseBudget(capacitanceFf, sampleNoiseUv),
    random = randomGenerator(seed);
  return Array.from({ length: count }, () => {
    const k = b.resetV * normal(random),
      r = b.sampleV * normal(random),
      s = b.sampleV * normal(random);
    return { single: -(k + s) / b.gain, cds: (r - s) / b.gain };
  });
}
