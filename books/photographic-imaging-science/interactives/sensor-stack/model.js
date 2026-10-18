// Functional cross sections, not process masks or an optical/QE simulation.
// Illumination side and separate logic fabrication are independent choices.
export const CONFIGURATIONS = [
  { id: "fsi", title: "FSI · 同片电路", illumination: "fsi", stacked: false },
  { id: "bsi", title: "BSI · 同片电路", illumination: "bsi", stacked: false },
  {
    id: "stacked",
    title: "BSI · 逻辑堆栈",
    illumination: "bsi",
    stacked: true,
  },
];
export function parameters({ separation = 55, progress = 100 } = {}) {
  for (const v of [separation, progress])
    if (!Number.isFinite(v) || v < 0 || v > 100)
      throw new RangeError("Invalid structural display");
  return { separation, progress };
}
const layer = (id, label, height, kind, wafer = null) => ({
  id,
  label,
  height,
  kind,
  wafer,
});
export function crossSection({
  illumination = "bsi",
  stacked = false,
  separation = 55,
  progress = 100,
} = {}) {
  const p = parameters({ separation, progress });
  if (!["fsi", "bsi"].includes(illumination) || typeof stacked !== "boolean")
    throw new RangeError("Invalid sensor structure");
  const optics = [layer("micro", "微透镜 / 彩色滤光层", 24, "optics")],
    silicon = layer(
      "silicon",
      illumination === "bsi" ? "背面钝化 / 感光硅" : "感光硅",
      68,
      "silicon",
      "pixel",
    ),
    metal = layer("metal", "前侧晶体管 / 布线", 30, "metal", "pixel"),
    layers = [
      ...optics,
      ...(illumination === "fsi" ? [metal, silicon] : [silicon, metal]),
      ...(stacked
        ? [
            layer("bond", "键合界面 / 电互连", 16, "bond"),
            layer("logic", "独立逻辑晶圆", 44, "logic", "logic"),
          ]
        : [layer("support", "承载基底（示意）", 28, "support")]),
    ];
  let y = 52;
  for (const [i, l] of layers.entries()) {
    l.y = y;
    l.bottom = y + l.height;
    l.center = y + l.height / 2;
    y = l.bottom + 5 + p.separation * 0.2 * (i < layers.length - 1 ? 1 : 0);
  }
  const si = layers.find((l) => l.id === "silicon"),
    wiring = layers.find((l) => l.id === "metal"),
    logic = layers.find((l) => l.id === "logic"),
    diode = { x: 92, y: si.center },
    pixelCircuit = { x: 164, y: wiring.center },
    photonRoute = [
      [92, 20],
      [92, diode.y],
    ],
    signalRoute = [
      [diode.x, diode.y],
      [pixelCircuit.x, diode.y],
      [pixelCircuit.x, pixelCircuit.y],
      ...(logic
        ? [
            [198, pixelCircuit.y],
            [198, layers.find((l) => l.id === "bond").center],
            [198, logic.center],
            [120, logic.center],
          ]
        : [[225, pixelCircuit.y]]),
    ],
    phase =
      p.progress < 40
        ? "light"
        : p.progress < 60
          ? "charge"
          : p.progress < 85
            ? "pixel"
            : "output";
  return {
    illumination,
    stacked,
    ...p,
    layers,
    diode,
    pixelCircuit,
    photonRoute,
    signalRoute,
    phase,
    height: y + 20,
  };
}
// Read the rendered geometry and functional ownership, not its input flags.
// This catches accidental flips or a decorative "logic" layer with no route.
export function inspectStructure(section) {
  const si = section.layers.find((l) => l.kind === "silicon"),
    metal = section.layers.find((l) => l.kind === "metal"),
    logic = section.layers.find((l) => l.kind === "logic"),
    functionalWafers = [
      ...new Set(section.layers.map((l) => l.wafer).filter(Boolean)),
    ],
    route = section.signalRoute,
    end = route.at(-1),
    reachesLogic =
      !!logic &&
      route.some(
        ([x, y]) => x >= 30 && x <= 230 && y >= logic.y && y <= logic.bottom,
      ),
    lightStopsInSilicon =
      section.photonRoute.at(-1)[1] >= si.y &&
      section.photonRoute.at(-1)[1] <= si.bottom;
  return {
    metalBeforeSilicon: metal.bottom <= si.y,
    independentLogic: !!logic && logic.wafer !== si.wafer,
    functionalWafers: functionalWafers.length,
    reachesLogic,
    lightStopsInSilicon,
    electricalEnd:
      logic && end[1] >= logic.y && end[1] <= logic.bottom ? "logic" : "pixel",
  };
}
// Independent reference contract for the depicted three examples. Physical
// topology is the reference here; there are deliberately no invented QE values.
export const STRUCTURE_TRUTH = {
  fsi: {
    metalBeforeSilicon: true,
    independentLogic: false,
    functionalWafers: 1,
    reachesLogic: false,
    lightStopsInSilicon: true,
    electricalEnd: "pixel",
  },
  bsi: {
    metalBeforeSilicon: false,
    independentLogic: false,
    functionalWafers: 1,
    reachesLogic: false,
    lightStopsInSilicon: true,
    electricalEnd: "pixel",
  },
  stacked: {
    metalBeforeSilicon: false,
    independentLogic: true,
    functionalWafers: 2,
    reachesLogic: true,
    lightStopsInSilicon: true,
    electricalEnd: "logic",
  },
};
export function routePoint(route, t) {
  if (!Number.isFinite(t) || t < 0 || t > 1)
    throw new RangeError("Invalid route progress");
  const lengths = route
      .slice(1)
      .map((p, i) => Math.hypot(p[0] - route[i][0], p[1] - route[i][1])),
    total = lengths.reduce((a, b) => a + b, 0);
  let remaining = t * total;
  for (let i = 0; i < lengths.length; i++)
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      const f = lengths[i] ? remaining / lengths[i] : 0;
      return [
        route[i][0] + f * (route[i + 1][0] - route[i][0]),
        route[i][1] + f * (route[i + 1][1] - route[i][1]),
      ];
    } else remaining -= lengths[i];
  return route[0];
}
