// Kinematics in mm, seconds and SI force. Geometries consume these same states.
const range = (value, min, max) =>
  Number.isFinite(value) && value >= min && value <= max;
export const WAVE = {
  radius: 16,
  halfThickness: 1.2,
  order: 6,
  enlargement: 500,
};
export const VOICE_ENLARGEMENT = 4;

export function stepperState({
  phase = 0.2,
  lead = 0.5,
  turns = 4,
  subdivisions = 16,
  backlash = 0.08,
} = {}) {
  if (
    !range(phase, 0, 1) ||
    !range(lead, 0.25, 1) ||
    !range(turns, 1, 4) ||
    ![1, 2, 4, 8, 16].includes(subdivisions) ||
    !range(backlash, 0, 0.2)
  )
    throw new RangeError("Invalid screw-drive state");
  const microstepsPerTurn = 200 * subdivisions;
  const peakSteps = Math.round(turns * microstepsPerTurn);
  const requestedSteps =
    peakSteps * (phase <= 0.5 ? 2 * phase : 2 * (1 - phase));
  const steps = Math.round(requestedSteps);
  const rotation = (2 * Math.PI * steps) / microstepsPerTurn;
  const ideal = (lead * steps) / microstepsPerTurn;
  const peak = (lead * peakSteps) / microstepsPerTurn;
  // Initially touching the forward flank. On reversal, the nut waits until the
  // entire declared clearance has crossed; it then follows the return flank.
  const position = phase <= 0.5 ? ideal : Math.min(peak, ideal + backlash);
  const returning = phase > 0.5;
  return {
    phase,
    lead,
    turns,
    subdivisions,
    backlash,
    steps,
    rotation,
    ideal,
    peak,
    position,
    error: position - ideal,
    returning,
    takingUp: returning && peak - ideal < backlash,
    commandIntervalUm: (1000 * lead) / microstepsPerTurn,
    quantizationError: ideal - (lead * requestedSteps) / microstepsPerTurn,
  };
}

export function voiceCoilState({
  phase = 0.7,
  mass = 20,
  current = 0.2,
  halfPulse = 10,
  brake = 1,
} = {}) {
  if (
    !range(phase, 0, 1) ||
    !range(mass, 10, 40) ||
    !range(current, 0.05, 0.2) ||
    !range(halfPulse, 5, 10) ||
    ![0, 1].includes(brake)
  )
    throw new RangeError("Invalid voice-coil pulse");
  const forceConstant = 0.5;
  const duration = halfPulse / 1000;
  const time = 2 * duration * phase;
  const accelerationMagnitude = (forceConstant * current) / (mass / 1000);
  const tau = Math.max(0, time - duration);
  let position, velocity;
  if (brake && time > duration) {
    position =
      accelerationMagnitude *
      (duration ** 2 / 2 + duration * tau - tau ** 2 / 2);
    velocity = accelerationMagnitude * (duration - tau);
  } else {
    position = (accelerationMagnitude * time ** 2) / 2;
    velocity = accelerationMagnitude * time;
  }
  const activeCurrent =
    phase === 1 ? 0 : brake && time >= duration ? -current : current;
  return {
    phase,
    mass,
    current,
    halfPulse,
    brake,
    time,
    duration,
    forceConstant,
    activeCurrent,
    force: forceConstant * activeCurrent,
    acceleration: (forceConstant * activeCurrent) / (mass / 1000),
    accelerationMagnitude,
    positionMm: position * 1000,
    velocity,
    // Exact impulse is an independent velocity check, including current reversal.
    impulseVelocity:
      accelerationMagnitude * (Math.min(time, duration) + (brake ? -tau : tau)),
    stopped: phase === 1 && brake === 1,
  };
}

export function waveState({
  phase = 0.2,
  amplitude = 2,
  frequency = 40,
  direction = 1,
  separation = 0.4,
} = {}) {
  if (
    !range(phase, 0, 1) ||
    !range(amplitude, 0.5, 4) ||
    !range(frequency, 20, 60) ||
    ![-1, 1].includes(direction) ||
    !range(separation, 0, 1)
  )
    throw new RangeError("Invalid traveling wave");
  const cycles = 4 * phase,
    psi = 2 * Math.PI * cycles;
  const omega = 2 * Math.PI * frequency * 1000;
  const A = amplitude / 1000; // um -> mm
  const gamma = (WAVE.halfThickness * WAVE.order) / WAVE.radius;
  const point = (phi) => {
    const theta = WAVE.order * phi - direction * psi;
    return {
      normal: A * Math.cos(theta),
      tangent: gamma * A * Math.sin(theta),
      normalVelocity: direction * A * omega * Math.sin(theta),
      tangentVelocity: -direction * gamma * A * omega * Math.cos(theta),
    };
  };
  const crestVelocity = -direction * gamma * A * omega;
  // Reference: an ideal rotor following the tangential speed at each wave crest.
  // Actual contact pressure, friction, load, slip and servo are not solved.
  const rotorAngle = (-direction * gamma * A * psi) / WAVE.radius;
  return {
    phase,
    amplitude,
    frequency,
    direction,
    separation,
    psi,
    cycles,
    gamma,
    A,
    timeUs: (cycles / (frequency * 1000)) * 1e6,
    periodUs: 1000 / frequency,
    crestVelocity,
    rotorAngle,
    referenceRpm: ((crestVelocity / WAVE.radius) * 60) / (2 * Math.PI),
    materialPoint: point(0),
    point,
    standingComponents(phi) {
      return [
        A * Math.cos(WAVE.order * phi) * Math.cos(psi),
        direction * A * Math.sin(WAVE.order * phi) * Math.sin(psi),
      ];
    },
  };
}
