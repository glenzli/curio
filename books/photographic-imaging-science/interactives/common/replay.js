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
  startOnFirstPlay = false,
  enabled = () => true,
}) {
  const button = document.createElement("button");
  button.dataset.replay = "true";
  button.dataset.replayKey = key;
  root.querySelector(".actions").prepend(button);
  let frame = 0,
    running = false,
    previous = 0,
    drawn = 0,
    disposed = false,
    played = false;
  function syncAvailability() {
    button.disabled =
      !enabled(state) ||
      !!root.querySelector(`input[data-control-key="${key}"]`)?.disabled;
  }
  function pause() {
    const wasRunning = running;
    running = false;
    cancelAnimationFrame(frame);
    button.textContent = label;
    button.setAttribute("aria-pressed", "false");
    syncAvailability();
    // Save and display the same final frame, including time since the last draw.
    if (wasRunning && !disposed) render();
  }
  function tick(time) {
    if (!running || disposed) return;
    state[key] = Math.min(
      end,
      state[key] +
        // The first frame can carry a timestamp just before the click handler.
        (Math.max(0, Math.min(100, time - previous)) * (end - start)) /
          durationMs,
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
    syncAvailability();
    if (button.disabled) return;
    if (running) return pause();
    if (
      (startOnFirstPlay && !played) ||
      state[key] >= end ||
      state[key] < start
    )
      state[key] = start;
    played = true;
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
  const onControlsUpdated = () => {
    syncAvailability();
    if (button.disabled && running) pause();
  };
  root.addEventListener("mb-controls-updated", onControlsUpdated, { signal });
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
    root.removeEventListener("mb-controls-updated", onControlsUpdated);
    actions.removeEventListener("click", onAction);
    button.removeEventListener("click", onPlay);
    document.removeEventListener("visibilitychange", visibility);
  };
}
