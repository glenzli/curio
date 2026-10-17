// User-started, finite replay for parameter demonstrations. State and physics
// stay with each lab. Visibility loss pauses rather than silently resuming.
export function replay({
  root,
  state,
  render,
  element,
  signal,
  key,
  start = 0,
  end = 100,
  durationMs = 8000,
  label = "播放演示",
}) {
  const button = document.createElement("button");
  button.dataset.replay = "true";
  root.querySelector(".actions").prepend(button);
  let frame = 0,
    running = false,
    previous = 0,
    drawn = 0,
    disposed = false;
  function pause() {
    running = false;
    cancelAnimationFrame(frame);
    button.textContent = label;
    button.setAttribute("aria-pressed", "false");
  }
  function tick(time) {
    if (!running || disposed) return;
    state[key] = Math.min(
      end,
      state[key] +
        (Math.min(100, time - previous) * (end - start)) / durationMs,
    );
    previous = time;
    if (time - drawn >= 50 || state[key] === end) {
      render();
      drawn = time;
    }
    if (state[key] === end) pause();
    else frame = requestAnimationFrame(tick);
  }
  pause();
  const onPlay = () => {
    if (running) return pause();
    if (state[key] >= end || state[key] < start) state[key] = start;
    running = true;
    previous = performance.now();
    drawn = 0;
    button.textContent = "暂停";
    button.setAttribute("aria-pressed", "true");
    render();
    frame = requestAnimationFrame(tick);
  };
  button.addEventListener("click", onPlay, { signal });
  root.addEventListener("input", pause, { signal });
  const actions = root.querySelector(".actions");
  const onAction = (e) => {
    if (e.target !== button) pause();
  };
  actions.addEventListener("click", onAction, { signal });
  const visibility = () => {
    if (document.hidden) pause();
  };
  document.addEventListener("visibilitychange", visibility, { signal });
  const observer = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) pause();
  });
  observer.observe(element);
  return () => {
    disposed = true;
    pause();
    observer.disconnect();
    root.removeEventListener("input", pause);
    actions.removeEventListener("click", onAction);
    button.removeEventListener("click", onPlay);
    document.removeEventListener("visibilitychange", visibility);
  };
}
