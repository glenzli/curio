import {
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  DoubleSide,
} from "@glenzli/markdown-book/three";
import {
  Group,
  Vector3,
  palette as C,
  box,
  cylinder,
  ring,
  annulus,
  rod,
  helix,
  arrow,
  line,
  updateLine,
} from "../common/three-geometry.js";
import { WAVE, VOICE_ENLARGEMENT } from "./model.js";

function lensCarrier(parent, radius = 1.25) {
  const group = new Group();
  parent.add(group);
  ring(group, radius, 0.14, [0, 0, 0], C.dark);
  annulus(group, 0, radius - 0.12, [0, 0, 0], C.blue, 0.24);
  return group;
}
export function stepperScene({ scene }) {
  const device = new Group();
  scene.add(device);
  box(device, [11, 0.18, 4], [0.6, -1.85, 0], "#d3d9df");
  for (const z of [-1.3, 1.3])
    rod(device, [-3, -0.8, z], [5, -0.8, z], 0.1, C.metal);
  for (const x of [-3, 5])
    box(device, [0.32, 1.7, 3.2], [x, -0.95, 0], C.metal);
  const rotor = new Group();
  device.add(rotor);
  rotor.position.set(-4.25, -0.45, 0);
  cylinder(rotor, 0.75, 1.4, [0, 0, 0], C.dark);
  box(rotor, [1.48, 0.18, 0.18], [0, 0.79, 0], C.amber);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const pole = box(
      device,
      [1.65, 0.45, 0.48],
      [-4.25, -0.45 + 1.02 * Math.cos(a), 1.02 * Math.sin(a)],
      i % 2 ? C.blue : C.amber,
    );
    pole.rotation.x = a;
  }
  const screw = new Group();
  screw.position.y = -0.45;
  device.add(screw);
  cylinder(screw, 0.22, 8, [1, 0, 0], C.metal);
  const nut = new Group();
  device.add(nut);
  box(nut, [0.65, 0.9, 1.3], [0, -0.45, 0], C.amber);
  box(nut, [0.55, 1.1, 0.36], [0, 0.25, 0], C.dark);
  const carrier = lensCarrier(nut);
  carrier.position.y = 1.65;
  const travel = arrow(device, [1, 0, 0], [0, 3.45, 0], 2, C.green, 0.25);
  let thread, lastLead, m;
  return {
    update(model) {
      m = model;
      if (lastLead !== m.lead) {
        if (thread) {
          screw.remove(thread);
          thread.geometry.dispose();
          thread.material.dispose();
        }
        thread = helix(screw, {
          start: -3,
          end: 5,
          radius: 0.29,
          lead: m.lead,
          tube: 0.045,
          handedness: -1,
        });
        lastLead = m.lead;
      }
      rotor.rotation.x = screw.rotation.x = m.rotation;
      nut.position.x = m.position;
      travel.setDirection(new Vector3(m.returning ? -1 : 1, 0, 0));
      travel.position.x = m.position;
      travel.visible = !m.takingUp && m.phase > 0 && m.phase < 1;
      nut.children[0].material.color.set(m.takingUp ? C.red : C.amber);
    },
    labels() {
      return [
        ["电磁转子", [-4.25, 1.2, 0], C.blue],
        ["丝杠", [3, -0.1, 0], C.metal],
        ["螺母与镜组", [m?.position ?? 0, 3.2, 0], C.amber],
        ["固定导轨", [3, -0.6, 1.5], C.dark],
      ];
    },
  };
}

export function voiceScene({ scene }) {
  const device = new Group();
  scene.add(device);
  box(device, [18, 0.3, 8], [3, -4.2, 0], "#d3d9df");
  // Cutaway of the annular magnetic gap: radial inward B and azimuthal I
  // produce +x force by I dl cross B. The front quarter stays open.
  for (const z of [-2.9, 2.9])
    box(device, [14, 1.2, 1.2], [2.5, 0, z], z < 0 ? C.blue : C.red);
  box(device, [14, 0.7, 6.8], [2.5, -3.3, 0], C.dark);
  cylinder(device, 1.35, 14, [2.5, 0, 0], C.metal);
  for (const z of [-3.6, 3.6])
    rod(device, [-3.5, 1.8, z], [12, 1.8, z], 0.12, C.metal);
  const moving = new Group();
  device.add(moving);
  const coil = helix(moving, {
    start: -1,
    end: 1,
    radius: 1.85,
    lead: 0.2,
    tube: 0.085,
    color: C.amber,
  });
  const carrier = lensCarrier(moving, 1.5);
  // Keep the optical opening above the stationary iron core. This bracket
  // belongs to the moving assembly; the optical and actuator axes are offset.
  carrier.position.set(2.6, 4, 0);
  rod(moving, [0, 2, 0], [2.6, 3.2, 0], 0.13, C.green);
  const field = arrow(device, [0, -1, 0], [-0.2, 3.2, 0], 1.25, C.blue, 0.3);
  const currentArrow = arrow(
    moving,
    [0, 0, 1],
    [0, 1.85, -0.7],
    1.4,
    C.purple,
    0.3,
  );
  const forceArrow = arrow(moving, [1, 0, 0], [0, 3.5, 0], 2, C.red, 0.35);
  const velocityArrow = arrow(
    moving,
    [1, 0, 0],
    [0, 0.3, 4.5],
    2,
    C.green,
    0.35,
  );
  let m;
  return {
    update(model) {
      m = model;
      moving.position.x = m.positionMm * VOICE_ENLARGEMENT;
      currentArrow.visible = forceArrow.visible = Math.abs(m.activeCurrent) > 0;
      currentArrow.setDirection(
        new Vector3(0, 0, Math.sign(m.activeCurrent) || 1),
      );
      forceArrow.setDirection(new Vector3(Math.sign(m.force) || 1, 0, 0));
      velocityArrow.visible = Math.abs(m.velocity) > 1e-10;
      velocityArrow.setDirection(new Vector3(1, 0, 0));
      coil.material.color.set(m.activeCurrent < 0 ? C.purple : C.amber);
    },
    labels() {
      const x = (m?.positionMm ?? 0) * VOICE_ENLARGEMENT;
      return [
        ["径向磁场 B", [-2.2, 3.5, -1], C.blue],
        ["环向电流 I", [x, 1.7, 2.2], C.purple],
        ["电磁力 F", [x + 3, 5.1, 0], C.red],
        ["镜组速度", [x + 1, 1.1, 4.5], C.green],
        ["镜组（随线圈移动）", [x + 2.6, 6, 0], C.amber],
      ];
    },
  };
}

export function ultrasonicScene({ scene }) {
  const group = new Group();
  scene.add(group);
  const N = 128,
    positions = new Float32Array((N + 1) * 2 * 3),
    indices = [];
  for (let i = 0; i < N; i++) {
    const a = 2 * i,
      b = a + 1,
      c = a + 2,
      d = a + 3;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  const stator = new Mesh(
    geometry,
    new MeshStandardMaterial({
      color: C.amber,
      roughness: 0.48,
      metalness: 0.32,
      side: DoubleSide,
    }),
  );
  group.add(stator);
  annulus(group, 12, 19, [-1.6, 0, 0], C.purple);
  ring(group, 16, 0.35, [-2, 0, 0], C.dark);
  rod(group, [-6, 0, 0], [13, 0, 0], 0.8, C.metal);
  const rotor = new Group();
  group.add(rotor);
  annulus(rotor, 12, 19, [0, 0, 0], C.green, 0.28);
  ring(rotor, 18.5, 0.45, [0, 0, 0], C.green);
  for (let i = 0; i < 8; i++) {
    const a = (i * 2 * Math.PI) / 8;
    rod(
      rotor,
      [0, 12 * Math.cos(a), 12 * Math.sin(a)],
      [0, 18.5 * Math.cos(a), 18.5 * Math.sin(a)],
      0.15,
      C.green,
    );
  }
  const marker = new Mesh(
    new SphereGeometry(0.38, 16, 12),
    new MeshStandardMaterial({ color: C.red, roughness: 0.6 }),
  );
  group.add(marker);
  const path = line(
    group,
    Array.from({ length: 81 }, () => [0, 0, 0]),
    C.red,
    0.7,
  );
  const waveArrow = arrow(group, [0, 0, 1], [0, 20, 0], 3.8, C.blue, 0.8);
  const rotorArrow = arrow(group, [0, 0, -1], [7, 20, 0], 3.8, C.green, 0.8);
  let m;
  return {
    update(model) {
      m = model;
      const a = geometry.attributes.position;
      for (let i = 0; i <= N; i++) {
        const phi = (i * 2 * Math.PI) / N,
          p = m.point(phi),
          dx = p.normal * WAVE.enlargement,
          du = p.tangent * WAVE.enlargement;
        for (let j = 0; j < 2; j++) {
          const r = j ? 19 : 12;
          a.setXYZ(
            2 * i + j,
            1.2 + dx,
            r * Math.cos(phi) - du * Math.sin(phi),
            r * Math.sin(phi) + du * Math.cos(phi),
          );
        }
      }
      a.needsUpdate = true;
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      rotor.position.x = 3 + 6 * m.separation;
      rotor.rotation.x = m.rotorAngle * WAVE.enlargement;
      marker.position.set(
        1.2 + m.materialPoint.normal * WAVE.enlargement,
        WAVE.radius,
        m.materialPoint.tangent * WAVE.enlargement,
      );
      updateLine(
        path,
        Array.from({ length: 81 }, (_, i) => {
          const theta = (i * 2 * Math.PI) / 80;
          return [
            1.2 + m.A * WAVE.enlargement * Math.cos(theta),
            WAVE.radius,
            m.gamma * m.A * WAVE.enlargement * Math.sin(theta),
          ];
        }),
      );
      const phi = (m.direction * m.psi) / WAVE.order;
      waveArrow.position.set(1.2, 20 * Math.cos(phi), 20 * Math.sin(phi));
      waveArrow.setDirection(
        new Vector3(
          0,
          -m.direction * Math.sin(phi),
          m.direction * Math.cos(phi),
        ),
      );
      rotorArrow.position.x = rotor.position.x;
      rotorArrow.setDirection(new Vector3(0, 0, -m.direction));
    },
    labels() {
      return [
        ["压电陶瓷", [-2.2, -17, 0], C.purple],
        ["弹性定子", [1.2, 10, -14], C.amber],
        ["标记材料点", [marker.position.x, 16.8, marker.position.z], C.red],
        ["转子 / 接触环", [rotor.position.x, 6, 17], C.green],
        [
          "行波传播",
          [waveArrow.position.x, waveArrow.position.y, waveArrow.position.z],
          C.blue,
        ],
      ];
    },
  };
}
