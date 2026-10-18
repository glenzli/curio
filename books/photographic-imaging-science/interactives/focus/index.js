import {
  BufferGeometry,
  Float32BufferAttribute,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  DoubleSide,
  RingGeometry,
  CircleGeometry,
  SphereGeometry,
  PlaneGeometry,
  EdgesGeometry,
  Points,
  PointsMaterial,
  Vector3,
  createThreeViewport,
} from "@glenzli/markdown-book/three";
import { focusGeometry } from "./model.js";
import { depthOfField } from "../dof/model.js";

const style = `
:host{display:block;color:var(--text,#253d34);font:13px/1.65 ui-sans-serif,-apple-system,"PingFang SC",sans-serif}*{box-sizing:border-box}button,input{font:inherit}button{cursor:pointer;border:1px solid #cbd6ce;border-radius:5px;background:transparent;color:inherit;padding:6px 11px}button:focus-visible,input:focus-visible{outline:2px solid #2f6251;outline-offset:3px}.experiment{padding:24px}.eyebrow{font-size:10px;letter-spacing:.1em;color:#6d8578}h3{font-size:22px;line-height:1.4;margin:8px 0}p{margin:8px 0;color:#6d7b72}.scene-grid{display:grid;grid-template-columns:minmax(0,1fr) 132px;gap:12px;margin:20px 0}.stage{height:330px;position:relative;background:#f0f4ee;border-radius:7px;overflow:hidden}.labels{position:absolute;inset:0;pointer-events:none}.labels span{color:#253d34;position:absolute;white-space:nowrap;font-size:10px;background:#ffffffdd;padding:2px 5px;border-radius:3px;transform:translate(-50%,-130%)}.cross-section{display:flex;flex-direction:column;justify-content:center;text-align:center;color:#718175;font-size:10px}.cross-section svg{width:100%;height:auto;background:#f0f4ee;border-radius:7px}.cross-section p{font-size:10px}.control-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.control-grid label{display:grid;gap:8px;font-size:11px}.control-grid .value{float:right;color:#617c6b;font-variant-numeric:tabular-nums}input{width:100%;accent-color:#426d58}.actions{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;border-block:1px solid #e0e7df;padding:16px 0}.stats small{font-size:10px;color:#768778}.stats strong{display:block;font-size:21px;font-weight:600;line-height:1.5;font-variant-numeric:tabular-nums}.stats em{font:10px/1.4 inherit;color:#7c897f}#criterion{font-size:11px;padding-top:8px}.note{font-size:10px;line-height:1.8;margin-top:14px;color:#7c897f}.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:10px;color:#77877b}.legend i{display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:4px}.legend .lens{background:#557867}.legend .focus{background:#234f44}.legend .sensor{background:#ba8b4b}@media(max-width:550px){.experiment{padding:18px}.scene-grid{grid-template-columns:minmax(0,1fr) 80px;gap:6px}.stage{height:260px}.control-grid{grid-template-columns:1fr;gap:12px}.stats{gap:8px}.stats strong{font-size:17px}h3{font-size:19px}.cross-section p{font-size:9px}}
`;

export function mount({ element, signal, session }) {
  const root = element.shadowRoot ?? element.attachShadow({ mode: "open" });
  root.innerHTML = `<style>${style}</style><section class="experiment"><div class="eyebrow">第十六章 · 薄透镜的像侧光锥</div><h3>对焦位置与弥散圈</h3><p>调整物距、对焦距离和光圈，观察弥散圈的变化。完全合焦时，光圈仍会改变光锥和景深，几何弥散圈保持为零。可拖动旋转光路，或播放连续对焦动画。</p><div class="scene-grid"><div class="stage" aria-label="薄透镜三维光路，可拖动旋转"><div class="labels"><span id="lens-label">光阑</span><span id="focus-label">理想像点</span><span id="sensor-label">传感器面</span></div></div><div class="cross-section"><svg viewBox="-1.5 -1.5 3 3" role="img" aria-label="传感器面上的弥散圈截面"><path d="M-1.25 0H1.25M0-1.25V1.25" stroke="#d0dcd0" stroke-width=".012"/><circle id="limit-circle" r=".015" fill="none" stroke="#305f4c" stroke-width=".012"/><circle id="blur-circle" fill="#ba8b4b" fill-opacity=".38" stroke="#ba8b4b" stroke-width=".018"/></svg><p>像面截面 · 同一尺度<br>横宽 3 mm<br><span id="limit-label">小圈：容许直径 0.03 mm</span></p></div></div><div class="legend"><span><i class="lens"></i>光阑平面</span><span><i class="focus"></i>理想像点</span><span><i class="sensor"></i>传感器面</span></div><div class="control-grid"><label>物距 <output class="value" id="subject-value"></output><input aria-label="物距" id="subject" type="range" min="0.3" max="6" step="0.01" value="1"></label><label>对焦距离 <output class="value" id="focus-value"></output><input aria-label="对焦距离" id="focus" type="range" min="0.3" max="6" step="0.01" value="2"></label><label>光圈 <output class="value" id="aperture-value"></output><input aria-label="光圈" id="aperture" type="range" min="0.5" max="4" step="0.25" value="2"></label><label>三维容许直径 <output class="value" id="limit-value"></output><input aria-label="三维容许直径" id="limit" type="range" min="5" max="50" step="1" value="30"></label></div><div class="actions"><button id="play" type="button" aria-pressed="false">播放对焦动画</button><button id="match" type="button">对焦到物体</button><button id="view" type="button">重置视角</button></div><div class="stats"><div><small>物体的理想像距</small><strong id="image-distance"></strong><em>mm</em></div><div><small>当前传感器像距</small><strong id="sensor-distance"></strong><em>mm</em></div><div><small>弥散圈直径</small><strong id="blur-diameter"></strong><em>mm</em></div></div><p id="criterion" role="status"></p><p id="dof-limits" class="note"></p><p id="truth" class="note"></p><p class="note">依式 (16.2)：空气中 50 mm 正薄透镜，光阑与透镜共面，采用近轴几何光学。坐标固定于透镜；传感器面的位移表示镜头与像面间距变化。只画像侧，不含像差、衍射与口径蚀；移动标记仅示传播方向，不代表真实光速或单个光子轨迹。容许直径可调，它只改变接受判据，不改变光线。景深边界另由两条边缘光线求根，与解析式核对。未支持 WebGL 2 时保留原静态图。</p></section>`;
  const find = (id) => root.getElementById(id);
  const stage = root.querySelector(".stage");
  const settings = { subject: 1, focus: 2, exponent: 2, criterionUm: 30 };
  const saved = session?.load();
  if (saved?.version === 1)
    for (const [key, min, max] of [
      ["subject", 0.3, 6],
      ["focus", 0.3, 6],
      ["exponent", 0.5, 4],
      ["criterionUm", 5, 50],
    ]) {
      if (Number.isFinite(saved.settings?.[key]))
        settings[key] = Math.max(min, Math.min(max, saved.settings[key]));
    }
  let snapshot;
  session?.describe(() => snapshot);
  const rayCount = 20,
    beamEnd = 67;
  let viewport,
    model,
    animationTime =
      saved?.version === 1 && Number.isFinite(saved.animationTime)
        ? saved.animationTime
        : 0,
    disposed = false;
  const point = new Vector3();
  function projectLabel(id, x, y, z) {
    point.set(x, y, z).project(viewport.camera);
    const label = find(id);
    label.style.left = `${((point.x + 1) * stage.clientWidth) / 2}px`;
    label.style.top = `${((1 - point.y) * stage.clientHeight) / 2}px`;
  }
  function labels() {
    if (!viewport || !model) return;
    projectLabel("lens-label", 0, model.apertureDiameterMm / 2 + 1, 0);
    projectLabel("focus-label", model.imageDistanceMm, 1.2, 0);
    projectLabel("sensor-label", model.sensorDistanceMm, 9, 0);
  }
  try {
    viewport = createThreeViewport({
      element: stage,
      signal,
      onRender: labels,
      onPlaybackChange: playbackChanged,
      onFrame: ({ delta }) => {
        animationTime += delta;
        settings.focus = Math.min(
          6,
          Math.max(
            0.3,
            settings.subject * 2 ** (0.6 * Math.sin(animationTime * 0.8)),
          ),
        );
        update(false);
        const positions = particles.geometry.attributes.position;
        for (let i = 0; i < rayCount; i++) {
          const x = ((animationTime * 0.24 + i / rayCount) % 1) * beamEnd;
          const radius =
            (model.apertureDiameterMm / 2) * (1 - x / model.imageDistanceMm);
          const theta = (i * Math.PI * 2) / rayCount;
          positions.setXYZ(
            i,
            x,
            radius * Math.cos(theta),
            radius * Math.sin(theta),
          );
        }
        positions.needsUpdate = true;
      },
    });
  } catch (error) {
    root.replaceChildren();
    throw error;
  }
  const { scene, camera, controls } = viewport;
  camera.position.set(82, 25, 70);
  controls.target.set(32, 0, 0);
  controls.minDistance = 32;
  controls.maxDistance = 145;
  controls.update();

  const aperture = new Mesh(
    new RingGeometry(0.97, 1.015, 64),
    new MeshBasicMaterial({ color: 0x557867, side: DoubleSide }),
  );
  aperture.rotateY(Math.PI / 2);
  scene.add(aperture);
  const sensor = new Mesh(
    new PlaneGeometry(20, 15),
    new MeshBasicMaterial({
      color: 0xfefcf5,
      transparent: true,
      opacity: 0.58,
      side: DoubleSide,
      depthWrite: false,
    }),
  );
  sensor.rotateY(Math.PI / 2);
  scene.add(sensor);
  const sensorEdge = new LineSegments(
    new EdgesGeometry(sensor.geometry),
    new LineBasicMaterial({ color: 0xba8b4b }),
  );
  sensorEdge.rotateY(Math.PI / 2);
  scene.add(sensorEdge);
  const focalPoint = new Mesh(
    new SphereGeometry(0.25, 16, 12),
    new MeshBasicMaterial({ color: 0x234f44 }),
  );
  scene.add(focalPoint);
  const blurDisc = new Mesh(
    new CircleGeometry(1, 64),
    new MeshBasicMaterial({
      color: 0xba8b4b,
      side: DoubleSide,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    }),
  );
  blurDisc.rotateY(Math.PI / 2);
  scene.add(blurDisc);
  const rayGeometry = new BufferGeometry();
  rayGeometry.setAttribute(
    "position",
    new Float32BufferAttribute(new Float32Array(rayCount * 6), 3),
  );
  const rays = new LineSegments(
    rayGeometry,
    new LineBasicMaterial({
      color: 0x6c9c85,
      transparent: true,
      opacity: 0.75,
    }),
  );
  scene.add(rays);
  const surfaceGeometry = new BufferGeometry();
  surfaceGeometry.setAttribute(
    "position",
    new Float32BufferAttribute(new Float32Array(rayCount * 18), 3),
  );
  const surface = new Mesh(
    surfaceGeometry,
    new MeshBasicMaterial({
      color: 0x739f89,
      transparent: true,
      opacity: 0.085,
      side: DoubleSide,
      depthWrite: false,
    }),
  );
  scene.add(surface);
  const particleGeometry = new BufferGeometry();
  particleGeometry.setAttribute(
    "position",
    new Float32BufferAttribute(new Float32Array(rayCount * 3), 3),
  );
  const particles = new Points(
    particleGeometry,
    new PointsMaterial({ color: 0x345e4b, size: 0.32 }),
  );
  particles.frustumCulled = false;
  scene.add(particles);
  const axisLine = new Line(
    new BufferGeometry().setFromPoints([
      new Vector3(-4, 0, 0),
      new Vector3(72, 0, 0),
    ]),
    new LineBasicMaterial({ color: 0xc7d5ca }),
  );
  scene.add(axisLine);
  function setVertex(attribute, index, x, radius, theta) {
    attribute.setXYZ(
      index,
      x,
      radius * Math.cos(theta),
      radius * Math.sin(theta),
    );
  }
  function update(render = true) {
    if (disposed) return;
    model = focusGeometry({
      fNumber: 2 ** settings.exponent,
      focusDistanceMm: settings.focus * 1000,
      subjectDistanceMm: settings.subject * 1000,
    });
    const r = model.apertureDiameterMm / 2;
    // RingGeometry is in XY before rotation, so its own local X/Y scale together.
    aperture.scale.set(r, r, r);
    sensor.position.x = sensorEdge.position.x = model.sensorDistanceMm;
    focalPoint.position.x = model.imageDistanceMm;
    blurDisc.position.x = model.sensorDistanceMm + 0.025;
    blurDisc.scale.setScalar(model.blurDiameterMm / 2);
    const limit = settings.criterionUm / 1000;
    const within = model.blurDiameterMm <= limit;
    const depth = depthOfField({
      focalLength: 50,
      fNumber: 2 ** settings.exponent,
      criterionUm: settings.criterionUm,
      focusVergence: 1 / settings.focus,
      subjectVergence: 1 / settings.subject,
    });
    blurDisc.material.color.setHex(within ? 0x436f55 : 0xba8b4b);
    const vertices = rayGeometry.attributes.position,
      faces = surfaceGeometry.attributes.position;
    const endRadius = r * (1 - beamEnd / model.imageDistanceMm);
    for (let i = 0; i < rayCount; i++) {
      const t = (i * Math.PI * 2) / rayCount,
        next = ((i + 1) * Math.PI * 2) / rayCount;
      setVertex(vertices, i * 2, 0, r, t);
      setVertex(vertices, i * 2 + 1, beamEnd, endRadius, t);
      const at = i * 6;
      setVertex(faces, at, 0, r, t);
      setVertex(faces, at + 1, 0, r, next);
      setVertex(faces, at + 2, model.imageDistanceMm, 0, 0);
      setVertex(faces, at + 3, model.imageDistanceMm, 0, 0);
      setVertex(faces, at + 4, beamEnd, endRadius, next);
      setVertex(faces, at + 5, beamEnd, endRadius, t);
    }
    vertices.needsUpdate = true;
    faces.needsUpdate = true;
    rayGeometry.computeBoundingSphere();
    surfaceGeometry.computeBoundingSphere();
    find("subject-value").textContent = `${settings.subject.toFixed(2)} m`;
    find("focus-value").textContent = `${settings.focus.toFixed(2)} m`;
    find("aperture-value").textContent =
      `f/${(2 ** settings.exponent).toFixed(1)}`;
    find("focus").value = String(settings.focus);
    find("image-distance").textContent = model.imageDistanceMm.toFixed(3);
    find("sensor-distance").textContent = model.sensorDistanceMm.toFixed(3);
    find("blur-diameter").textContent = model.blurDiameterMm.toFixed(3);
    find("blur-circle").setAttribute("r", String(model.blurDiameterMm / 2));
    find("limit-circle").setAttribute("r", String(limit / 2));
    find("limit-value").textContent = `${settings.criterionUm} µm`;
    find("limit-label").textContent =
      `小圈：容许直径 ${settings.criterionUm} µm`;
    find("criterion").textContent = within
      ? `弥散圈在 ${settings.criterionUm} µm 的容许界限内。`
      : `超过 ${settings.criterionUm} µm 的容许界限；理想像点在传感器面${model.imageDistanceMm > model.sensorDistanceMm ? "之后" : "之前"}。`;
    find("dof-limits").textContent =
      `当前景深：${(depth.limits.near / 1000).toFixed(3)} m 至 ${depth.limits.far === null ? "∞" : `${(depth.limits.far / 1000).toFixed(3)} m`}；超焦距 ${(depth.limits.hyperfocal / 1000).toFixed(3)} m。`;
    find("truth").textContent =
      `独立边缘追迹弥散圈 ${(depth.diameter * 1000).toFixed(6)} µm；三维圆锥截面 ${(model.blurDiameterMm * 1000).toFixed(6)} µm，差 ${Math.abs(depth.diameter - model.blurDiameterMm).toExponential(2)} mm。`;
    stage.dataset.focusDistance = String(settings.focus);
    stage.dataset.blurDiameter = String(model.blurDiameterMm);
    session?.save({ version: 1, settings: { ...settings }, animationTime });
    snapshot = {
      title: "对焦位置与弥散圈",
      parameters: [
        { label: "焦距", value: "50 mm" },
        { label: "物距", value: settings.subject.toFixed(3) + " m" },
        { label: "对焦距离", value: settings.focus.toFixed(3) + " m" },
        { label: "光圈", value: "f/" + (2 ** settings.exponent).toFixed(2) },
        { label: "容许直径", value: settings.criterionUm + " µm" },
      ],
      readings: [
        { label: "理想像距", value: model.imageDistanceMm.toFixed(6) + " mm" },
        {
          label: "传感器像距",
          value: model.sensorDistanceMm.toFixed(6) + " mm",
        },
        { label: "弥散圈", value: model.blurDiameterMm.toFixed(6) + " mm" },
      ],
      assumptions:
        "空气中50 mm正薄透镜，近轴几何；无像差、衍射或口径蚀。恢复后暂停播放。",
    };
    if (render) viewport.render();
  }
  function playbackChanged(value) {
    particles.visible = value;
    find("play").textContent = value ? "暂停动画" : "播放对焦动画";
    find("play").setAttribute("aria-pressed", String(value));
    stage.dataset.playing = String(value);
    viewport.render();
  }
  function play(value) {
    viewport.setPlaying(value);
    playbackChanged(value);
  }
  for (const [id, key] of [
    ["subject", "subject"],
    ["focus", "focus"],
    ["aperture", "exponent"],
    ["limit", "criterionUm"],
  ])
    find(id).addEventListener(
      "input",
      (event) => {
        play(false);
        settings[key] = Number(event.target.value);
        update();
      },
      { signal },
    );
  find("play").addEventListener("click", () => play(!viewport.playing), {
    signal,
  });
  find("match").addEventListener(
    "click",
    () => {
      play(false);
      settings.focus = settings.subject;
      update();
    },
    { signal },
  );
  find("view").addEventListener(
    "click",
    () => {
      camera.position.set(82, 25, 70);
      camera.up.set(0, 1, 0);
      controls.target.set(32, 0, 0);
      controls.update();
      viewport.render();
    },
    { signal },
  );
  for (const [id, key] of [
    ["subject", "subject"],
    ["focus", "focus"],
    ["aperture", "exponent"],
    ["limit", "criterionUm"],
  ])
    find(id).value = String(settings[key]);
  update();
  play(false);
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    viewport.dispose();
    root.replaceChildren();
    signal?.removeEventListener("abort", cleanup);
  };
  signal?.addEventListener("abort", cleanup, { once: true });
  return cleanup;
}
