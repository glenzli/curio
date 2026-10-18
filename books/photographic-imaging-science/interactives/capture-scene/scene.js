// Authored radiance field, in EV relative to the lesson's 1000-electron gray.
// These are assigned scene values, rather than a lighting or material simulation.
export const WIDTH = 288,
  HEIGHT = 192;
export const PROBE_WIDTH = 48,
  PROBE_HEIGHT = 32;
const ellipse = (x, y, cx, cy, rx, ry) =>
  ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
const segment = (x, y, ax, ay, bx, by) => {
  const t = Math.max(
    0,
    Math.min(
      1,
      ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) /
        ((bx - ax) ** 2 + (by - ay) ** 2),
    ),
  );
  return Math.hypot(x - ax - t * (bx - ax), y - ay - t * (by - ay));
};

export function sceneSample(x, y) {
  // Wall and tabletop; the window lights the right side of the composition.
  const table = 0.755 - 0.025 * x;
  let ev =
    y < table
      ? -2.2 + 2.9 * x + 0.24 * Math.cos(3 * y)
      : -0.7 + 1.4 * x - 1.6 * (y - table) + 0.06 * Math.sin(110 * y + 8 * x);
  if (Math.abs(y - table) < 0.006) ev -= 0.5;
  // Recess, timber frame and two panes, with a fine branch outside.
  if (x > 0.552 && x < 0.948 && y > 0.068 && y < 0.67) ev = -1.2 + 0.9 * x;
  if (x > 0.563 && x < 0.937 && y > 0.083 && y < 0.648) ev = 0.8;
  if (x > 0.579 && x < 0.921 && y > 0.102 && y < 0.623) {
    ev = 4.7;
    const branch =
      segment(x, y, 0.914, 0.583, 0.684, 0.2) < 0.003 ||
      segment(x, y, 0.8, 0.39, 0.88, 0.25) < 0.002;
    const leaves = [
      [0.714, 0.254, 0.017, 0.026],
      [0.76, 0.315, 0.023, 0.015],
      [0.779, 0.38, 0.017, 0.03],
      [0.835, 0.447, 0.025, 0.016],
      [0.863, 0.278, 0.017, 0.026],
      [0.874, 0.513, 0.019, 0.027],
    ];
    const leaf = leaves.some(
      ([cx, cy, rx, ry]) => ellipse(x, y, cx, cy, rx, ry) < 1,
    );
    if (branch || leaf) ev = 4.2;
    // Shallow curtain folds retain fine highlight structure between the leaves.
    if (x > 0.86) ev = 4.2 + 0.5 * (0.5 + 0.5 * Math.cos((x - 0.86) * 320));
    if (Math.abs(x - 0.751) < 0.008 || Math.abs(y - 0.365) < 0.007) ev = 0.45;
  }
  if (x > 0.54 && x < 0.96 && y > 0.65 && y < 0.678) ev = 1.1 - 5 * (y - 0.65);
  // Soft shadows anchor the objects to the table.
  if (y > table) ev -= 1.5 * Math.exp(-ellipse(x, y, 0.29, 0.798, 0.15, 0.025));
  ev -= 0.7 * Math.exp(-ellipse(x, y, 0.783, 0.899, 0.08, 0.018));
  // Folded dark cloth; its periodic weave is confined to the cloth surface.
  const clothTop = 0.8 + 0.012 * Math.sin(19 * x);
  if (x > 0.075 && x < 0.476 && y > clothTop && y < 0.956 - 0.04 * x) {
    const fold = 0.5 + 0.5 * Math.cos(46 * x + 2 * Math.sin(24 * y));
    const weave = 0.5 + 0.5 * Math.sin(520 * x) * Math.sin(410 * y);
    ev = -3.5 + 0.85 * fold + 0.15 * weave;
  }
  // Ceramic pitcher: rounded body, narrow mouth, and a separate loop handle.
  if (
    ellipse(x, y, 0.394, 0.632, 0.052, 0.084) < 1 &&
    ellipse(x, y, 0.394, 0.632, 0.032, 0.061) > 1
  )
    ev = -1.2 + (1.8 * (x - 0.34)) / 0.11;
  const body = ellipse(x, y, 0.297, 0.666, 0.101, 0.135) < 1;
  const neck = x > 0.264 && x < 0.33 && y > 0.476 && y < 0.6;
  if (body || neck) {
    const side = Math.max(0, Math.min(1, (x - 0.2) / 0.195));
    ev = -2 + 3.0 * Math.sin(Math.PI * side * 0.85) + 0.12 * Math.cos(46 * y);
    if (y > 0.775) ev -= 0.5;
  }
  if (ellipse(x, y, 0.297, 0.477, 0.036, 0.011) < 1) ev = -2.6;
  if (
    ellipse(x, y, 0.297, 0.474, 0.037, 0.006) < 1 &&
    ellipse(x, y, 0.297, 0.474, 0.028, 0.004) > 1
  )
    ev = 0.8;
  // A single stem and three leaves make the silhouette readable at small sizes.
  if (
    segment(x, y, 0.298, 0.477, 0.314, 0.247) < 0.0022 ||
    segment(x, y, 0.307, 0.343, 0.259, 0.303) < 0.0018
  )
    ev = -2.7;
  for (const [cx, cy, rx, ry] of [
    [0.261, 0.3, 0.027, 0.011],
    [0.332, 0.299, 0.025, 0.012],
    [0.315, 0.249, 0.013, 0.024],
  ])
    if (ellipse(x, y, cx, cy, rx, ry) < 1) ev = -1.7 + (0.5 * (x - cx)) / rx;
  // Tumbler at the bright end of the table, with a deliberately overfull-well rim.
  if (x > 0.727 && x < 0.843 && y > 0.762 && y < 0.876) {
    ev += 0.24;
    if (Math.min(x - 0.727, 0.843 - x) < 0.004) ev = 2.6;
  }
  const rim = ellipse(x, y, 0.785, 0.762, 0.058, 0.016);
  if (rim < 1.2 && rim > 0.64) ev = 2.8;
  if (
    ellipse(x, y, 0.785, 0.876, 0.057, 0.012) < 1 &&
    ellipse(x, y, 0.785, 0.876, 0.05, 0.007) > 1
  )
    ev = 1.8;
  if (ellipse(x, y, 0.824, 0.758, 0.024, 0.009) < 1)
    ev = 6.3 + 0.2 * (0.5 + 0.5 * Math.sin(420 * x));
  return ev;
}

export function sceneEV(x, y) {
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    x >= WIDTH ||
    y < 0 ||
    y >= HEIGHT
  )
    throw RangeError("Invalid scene coordinate");
  return sceneSample((x + 0.5) / WIDTH, (y + 0.5) / HEIGHT);
}

// Keep saved 0..47 / 0..31 probe controls at the same relative positions.
export function probePixel(x, y) {
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    x >= PROBE_WIDTH ||
    y < 0 ||
    y >= PROBE_HEIGHT
  )
    throw RangeError("Invalid probe coordinate");
  return [
    Math.floor(((x + 0.5) * WIDTH) / PROBE_WIDTH),
    Math.floor(((y + 0.5) * HEIGHT) / PROBE_HEIGHT),
  ];
}
