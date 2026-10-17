// One illustrative readout cycle takes eight seconds, independent of sensor clocks.
export function playback({ root, state, render, element, signal }) {
  const button = document.createElement("button");
  root.querySelector(".actions").prepend(button);
  let frame = 0,
    running = false,
    previous = 0,
    drawn = 0;
  function pause() {
    running = false;
    cancelAnimationFrame(frame);
    button.textContent = "播放一轮";
    button.setAttribute("aria-pressed", "false");
  }
  function tick(time) {
    if (!running) return;
    state.progress = Math.min(100, state.progress + (time - previous) / 80);
    previous = time;
    if (time - drawn >= 50 || state.progress === 100) {
      render();
      drawn = time;
    }
    if (state.progress === 100) pause();
    else frame = requestAnimationFrame(tick);
  }
  pause();
  button.addEventListener(
    "click",
    () => {
      if (running) return pause();
      if (state.progress >= 100) state.progress = 0;
      running = true;
      previous = performance.now();
      drawn = 0;
      button.textContent = "暂停";
      button.setAttribute("aria-pressed", "true");
      render();
      frame = requestAnimationFrame(tick);
    },
    { signal },
  );
  root.addEventListener("input", pause, { signal });
  root.querySelector(".actions").addEventListener(
    "click",
    (event) => {
      if (event.target !== button) pause();
    },
    { signal },
  );
  const visibility = () => {
    if (document.hidden) pause();
  };
  document.addEventListener("visibilitychange", visibility, { signal });
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) pause();
  });
  observer.observe(element);
  return () => {
    pause();
    observer.disconnect();
    document.removeEventListener("visibilitychange", visibility);
  };
}
