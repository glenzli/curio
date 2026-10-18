// Empty front space: no powered surface between the front opening and entrance
// pupil plane. mm for geometry; g/cm^3 for density; mass is a cylindrical blank.
export function pupilBudget({
  focal = 400,
  fNumber = 4,
  pupilMagnification = 1.5,
  frontDistance = 40,
  halfAngle = 8,
  thickness = 10,
  density = 2.5,
} = {}) {
  if (
    ![
      focal,
      fNumber,
      pupilMagnification,
      frontDistance,
      halfAngle,
      thickness,
      density,
    ].every(Number.isFinite) ||
    focal <= 0 ||
    fNumber <= 0 ||
    pupilMagnification <= 0 ||
    frontDistance < 0 ||
    Math.abs(halfAngle) >= 80 ||
    thickness <= 0 ||
    density <= 0
  )
    throw new RangeError("Invalid entrance-pupil budget");
  const entrance = focal / fNumber,
    stop = entrance / pupilMagnification;
  const shift = frontDistance * Math.tan((Math.abs(halfAngle) * Math.PI) / 180);
  const frontClearance = entrance + 2 * shift;
  // Enumerate boundary rays separately as a geometric reference for the envelope.
  const rays = [-halfAngle, 0, halfAngle].flatMap((angle) =>
    [-0.5, 0.5].map((edge) => {
      const yPupil = edge * entrance,
        slope = Math.tan((angle * Math.PI) / 180);
      return { angle, yFront: yPupil - frontDistance * slope, yPupil, slope };
    }),
  );
  const tracedClearance =
    Math.max(...rays.map((r) => r.yFront)) -
    Math.min(...rays.map((r) => r.yFront));
  const mass = (density * Math.PI * frontClearance ** 2 * thickness) / 4000;
  return {
    entrance,
    stop,
    shift,
    frontClearance,
    tracedClearance,
    mass,
    rays,
    apertureArea: (Math.PI * entrance ** 2) / 4,
    solidAngleParaxial: Math.PI / (4 * fNumber * fNumber),
  };
}
