import { multiply, translation, lens } from "../paraxial/model.js";
const positive = (...x) => x.every((v) => Number.isFinite(v) && v > 0);
export function extensionTube({
  focal = 50,
  fNumber = 4,
  initialMagnification = 0,
  extension = 25,
} = {}) {
  if (
    !positive(focal, fNumber) ||
    ![initialMagnification, extension].every(Number.isFinite) ||
    initialMagnification < 0 ||
    extension < 0
  )
    throw new RangeError("Invalid tube geometry");
  const magnification = initialMagnification + extension / focal;
  const imageDistance = focal * (1 + magnification),
    objectDistance =
      magnification === 0 ? Infinity : focal * (1 + 1 / magnification);
  const objectHeight = 2;
  const rays = [-1, 0, 1].map((y) => {
    const inputAngle = Number.isFinite(objectDistance)
      ? (y - objectHeight) / objectDistance
      : 0;
    const outputAngle = inputAngle - y / focal;
    return {
      height: y,
      inputAngle,
      outputAngle,
      imageHeight: y + imageDistance * outputAngle,
    };
  });
  const expectedHeight = -magnification * objectHeight;
  const effectiveFNumber = fNumber * (1 + magnification),
    exposureFactor = (1 + magnification) ** 2;
  return {
    focal,
    fNumber,
    magnification,
    objectDistance,
    imageDistance,
    objectHeight,
    expectedHeight,
    rays,
    sensorObjectDistance: objectDistance + imageDistance,
    effectiveFNumber,
    exposureFactor,
    exposureStops: Math.log2(exposureFactor),
    imageError: Math.max(
      ...rays.map((r) => Math.abs(r.imageHeight - expectedHeight)),
    ),
    sensorWidth: 36,
    fieldWidth: magnification === 0 ? Infinity : 36 / magnification,
  };
}
export function teleconverter({
  focal = 100,
  fNumber = 4,
  factor = 2,
  remainingFraction = 0.2,
  angle = 0.5,
} = {}) {
  if (
    !positive(focal, fNumber, factor, remainingFraction) ||
    factor < 1 ||
    remainingFraction >= 1 ||
    !Number.isFinite(angle) ||
    Math.abs(angle) > 5
  )
    throw new RangeError("Invalid converter geometry");
  const delta = focal * remainingFraction,
    d = focal - delta;
  const converterPower = -(factor - 1) / (factor * delta),
    converterFocal = converterPower === 0 ? null : 1 / converterPower;
  const matrix = multiply(
    lens(converterPower),
    multiply(translation(d), lens(1 / focal)),
  );
  const [A, B, C, D] = matrix,
    q = factor * delta,
    theta = (angle * Math.PI) / 180;
  const rays = [-1, 0, 1].map((y) => {
    const afterMaster = theta - y / focal,
      atConverter = y + d * afterMaster;
    const afterConverter = afterMaster - converterPower * atConverter;
    return {
      height: y,
      afterMaster,
      atConverter,
      afterConverter,
      imageHeight: atConverter + q * afterConverter,
    };
  });
  return {
    focal,
    fNumber,
    factor,
    delta,
    d,
    q,
    converterFocal,
    converterPower,
    matrix,
    focalLength: factor * focal,
    matrixFocal: -1 / C,
    imageZ: d + q,
    bfd: -A / C,
    newFNumber: factor * fNumber,
    exposureFactor: factor * factor,
    exposureStops: 2 * Math.log2(factor),
    expectedHeight: factor * focal * theta,
    imageError: Math.max(
      ...rays.map((r) => Math.abs(r.imageHeight - factor * focal * theta)),
    ),
    determinant: A * D - B * C,
    rays,
  };
}
export function reverseConjugates({ focal = 50, reduction = 0.2 } = {}) {
  if (!positive(focal, reduction))
    throw new RangeError("Invalid reversed conjugates");
  const objectDistance = focal * (1 + 1 / reduction),
    imageDistance = focal * (1 + reduction);
  return {
    focal,
    objectDistance,
    imageDistance,
    magnification: -reduction,
    reversedObject: imageDistance,
    reversedImage: objectDistance,
    reversedMagnification: -1 / reduction,
  };
}
