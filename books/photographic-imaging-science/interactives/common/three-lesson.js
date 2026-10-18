import {
  AmbientLight,
  DirectionalLight,
  Vector3,
  createThreeViewport,
} from "@glenzli/markdown-book/three";
import { experiment } from "./ui.js";
import { escape } from "./lesson-view.js";

// Own the persistent canvas, playback and label projection together. Subject
// models and geometry stay in their respective component directories.
export function mountThreeLesson(context, spec, createScene) {
  const signal = context.signal;
  let viewport,
    visual,
    playButton,
    currentOutput,
    inFrame = false,
    disposed = false;
  let zoomAspect = null,
    frameBudget = 0;
  const style = [
    ".three-stage{height:380px;position:relative;background:#f2f4f6;border:1px solid #bdc6cf55;border-radius:8px;overflow:hidden;margin:14px 0}",
    ".three-labels{position:absolute;inset:0;pointer-events:none;z-index:1}.three-labels svg{position:absolute;inset:0;width:100%;height:100%}",
    ".three-labels span{position:absolute;transform:translate(-50%,-50%);font-size:10px;line-height:1.5;white-space:nowrap;color:#243340;background:#ffffffef;padding:2px 5px;border-radius:3px;border-left:2px solid var(--label-color,#6c7987)}",
    ".three-hint{position:absolute;bottom:8px;left:10px;color:#617180;font-size:10px;pointer-events:none;background:#ffffffc9;padding:2px 5px;border-radius:3px}",
    ".three-scale{font-size:11px;opacity:.7}.three-legend{display:flex;gap:8px 18px;flex-wrap:wrap;font-size:11px;margin:10px 0}.three-legend i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:5px}",
    ".three-trace svg{width:100%;height:auto;display:block}.three-trace text{fill:currentColor;font-family:inherit}.three-trace{margin:16px 0}.three-status{font-size:12px;padding:10px 12px;background:color-mix(in srgb,currentColor 4%,transparent);border-radius:5px}",
    "@media(max-width:550px){.three-stage{height:310px}.three-labels span{font-size:9px}.three-trace{overflow:auto}.three-trace svg{min-width:520px}}",
  ].join("");
  const content =
    "<style>" +
    style +
    '</style><div class="three-stage" role="group" aria-label="' +
    escape(spec.title) +
    '，可拖动旋转"><div class="three-labels"><svg aria-hidden="true"></svg></div><div class="three-hint">拖动旋转 · 滚轮缩放</div></div><div class="three-scale">' +
    escape(spec.scaleNote) +
    '</div><div class="three-legend">' +
    spec.legend
      .map(
        ([name, color]) =>
          '<span><i style="background:' +
          color +
          '"></i>' +
          escape(name) +
          "</span>",
      )
      .join("") +
    '</div><p class="three-status" role="status"></p><div class="three-trace"></div><div class="stats"></div><p class="reading"></p>';
  let root, state, render;
  const labels = new Map(),
    projected = new Vector3();
  function projectLabels() {
    if (!viewport || !visual) return;
    const aspect = viewport.camera.aspect;
    if (aspect !== zoomAspect) {
      zoomAspect = aspect;
      viewport.camera.zoom = Math.min(1, aspect / 1.5);
      viewport.camera.updateProjectionMatrix();
      viewport.render();
      return;
    }
    const layer = root.querySelector(".three-labels"),
      width = layer.clientWidth,
      height = layer.clientHeight,
      placed = [];
    for (const [name, position, color] of visual.labels()) {
      let entry = labels.get(name);
      if (!entry) {
        const label = document.createElement("span");
        label.textContent = name;
        label.style.setProperty("--label-color", color);
        const guide = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path",
        );
        guide.setAttribute("stroke", color);
        guide.setAttribute("stroke-opacity", ".5");
        guide.setAttribute("stroke-width", ".8");
        guide.setAttribute("fill", "none");
        layer.querySelector("svg").append(guide);
        layer.append(label);
        entry = { label, guide };
        labels.set(name, entry);
      }
      const { label, guide } = entry;
      projected.set(...position).project(viewport.camera);
      label.hidden = projected.z < -1 || projected.z > 1;
      guide.style.display = label.hidden ? "none" : "";
      if (label.hidden) continue;
      const w = label.offsetWidth,
        h = label.offsetHeight,
        ax = ((projected.x + 1) * width) / 2,
        ay = ((1 - projected.y) * height) / 2,
        x = Math.max(w / 2 + 6, Math.min(width - w / 2 - 6, ax)),
        top = h / 2 + 6,
        bottom = height - h / 2 - 28,
        preferred = Math.max(top, Math.min(bottom, ay - h / 2 - 7));
      let y = preferred;
      // Place projected labels within the canvas; leader lines preserve their
      // physical anchors after narrow screens or an orbit force them apart.
      for (let attempt = 0; attempt <= 12; attempt++) {
        const offset =
            Math.ceil(attempt / 2) * (attempt % 2 ? -1 : 1) * (h + 5),
          candidate = Math.max(top, Math.min(bottom, preferred + offset));
        if (
          !placed.some(
            (p) =>
              Math.abs(x - p.x) < (w + p.w) / 2 + 4 &&
              Math.abs(candidate - p.y) < (h + p.h) / 2 + 3,
          )
        ) {
          y = candidate;
          break;
        }
      }
      placed.push({ x, y, w, h });
      label.style.left = x + "px";
      label.style.top = y + "px";
      guide.setAttribute(
        "d",
        `M${ax},${ay}L${x},${y + (ay >= y ? h / 2 : -h / 2)}`,
      );
    }
  }
  function playingChanged(value) {
    if (!playButton) return;
    playButton.textContent = value ? "暂停" : spec.playLabel;
    playButton.setAttribute("aria-pressed", String(value));
  }
  function pause() {
    viewport?.setPlaying(false);
    playingChanged(false);
  }
  const cleanup = experiment({
    ...context,
    version: 1,
    kicker: "摄影成像科学 · 三维机构与数值对照",
    title: spec.title,
    intro: spec.intro,
    controls: spec.controls,
    presets: spec.presets,
    note: spec.note,
    content,
    update(dom, parameters) {
      currentOutput = spec.evaluate(parameters);
      dom.querySelector(".stats").innerHTML = currentOutput.stats
        .map(
          ([label, value, detail]) =>
            "<div><small>" +
            escape(label) +
            "</small><strong>" +
            escape(value) +
            "</strong><em>" +
            escape(detail) +
            "</em></div>",
        )
        .join("");
      dom.querySelector(".reading").textContent = currentOutput.reading;
      dom.querySelector(".three-status").textContent = currentOutput.status;
      dom.querySelector(".three-trace").innerHTML = currentOutput.figure;
      if (visual) {
        visual.update(currentOutput.model, parameters);
        if (currentOutput.halt) pause();
        if (!inFrame) viewport.render();
      }
    },
    setup(context) {
      ({ root, state, render } = context);
      const stage = root.querySelector(".three-stage");
      try {
        viewport = createThreeViewport({
          element: stage,
          signal,
          background: 0xf2f4f6,
          onRender: projectLabels,
          onPlaybackChange: playingChanged,
          onFrame({ delta }) {
            frameBudget += delta;
            if (frameBudget < 0.04) return;
            const r = spec.replay;
            state[r.key] = Math.min(
              r.end,
              state[r.key] + (frameBudget * (r.end - r.start)) / r.seconds,
            );
            frameBudget = 0;
            inFrame = true;
            render();
            inFrame = false;
            if (state[r.key] >= r.end) pause();
          },
        });
        viewport.scene.add(new AmbientLight(0xffffff, 2));
        const key = new DirectionalLight(0xfff4e4, 2.6);
        key.position.set(30, 55, 40);
        viewport.scene.add(key);
        const fill = new DirectionalLight(0xd4e6ff, 1.4);
        fill.position.set(-25, 15, -40);
        viewport.scene.add(fill);
        visual = createScene(viewport);
        const resetView = () => {
          viewport.camera.position.set(...spec.camera);
          viewport.controls.target.set(...spec.target);
          viewport.controls.minDistance = spec.distance[0];
          viewport.controls.maxDistance = spec.distance[1];
          viewport.controls.update();
          viewport.render();
        };
        resetView();
        playButton = document.createElement("button");
        playButton.type = "button";
        playButton.addEventListener(
          "click",
          () => {
            if (viewport.playing) return pause();
            const r = spec.replay;
            if (state[r.key] >= r.end) state[r.key] = r.start;
            frameBudget = 0;
            render();
            if (!currentOutput.halt) viewport.setPlaying(true);
          },
          { signal },
        );
        root.querySelector(".actions").prepend(playButton);
        const cameraButton = document.createElement("button");
        cameraButton.type = "button";
        cameraButton.textContent = "重置视角";
        cameraButton.addEventListener("click", resetView, { signal });
        root.querySelector(".actions").append(cameraButton);
        const actions = root.querySelector(".actions");
        const actionPause = (event) => {
          if (event.target !== playButton) pause();
        };
        actions.addEventListener("click", actionPause, { signal });
        root.addEventListener("input", pause, { signal });
        pause();
        render();
        return () => {
          if (disposed) return;
          disposed = true;
          root.removeEventListener("input", pause);
          actions.removeEventListener("click", actionPause);
          visual.dispose?.();
          viewport.dispose();
        };
      } catch (error) {
        visual?.dispose?.();
        viewport?.dispose();
        root.replaceChildren();
        throw error;
      }
    },
  });
  return cleanup;
}
