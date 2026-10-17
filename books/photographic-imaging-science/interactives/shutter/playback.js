// Both shutter views share one replay lifecycle; physics stays in model.js.
export function playback({ root, state, render, element, signal }) {
  const button = document.createElement("button");
  button.textContent = "播放曝光过程";
  button.setAttribute("aria-pressed", "false");
  root.querySelector(".actions").prepend(button);
  let request = 0, playing = false, previous = 0, drawn = 0;
  const pause = () => {
    playing = false;
    cancelAnimationFrame(request);
    button.textContent = "播放曝光过程";
    button.setAttribute("aria-pressed", "false");
  };
  const tick = (time) => {
    if (!playing) return;
    state.progress = Math.min(100, state.progress + (time - previous) / 60);
    previous = time;
    if (time - drawn >= 50 || state.progress === 100) { render(); drawn = time; }
    if (state.progress === 100) pause();
    else request = requestAnimationFrame(tick);
  };
  button.addEventListener("click", () => {
    if (playing) return pause();
    if (state.progress >= 100) state.progress = 0;
    playing = true;
    previous = performance.now(); drawn = 0;
    button.textContent = "暂停"; button.setAttribute("aria-pressed", "true");
    render(); request = requestAnimationFrame(tick);
  }, { signal });
  root.addEventListener("input", pause, { signal });
  root.querySelector(".actions").addEventListener("click", (event) => {
    if (event.target !== button) pause();
  }, { signal });
  const onVisibility = () => { if (document.hidden) pause(); };
  document.addEventListener("visibilitychange", onVisibility, { signal });
  const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) pause(); });
  observer.observe(element);
  return () => { pause(); observer.disconnect(); document.removeEventListener("visibilitychange", onVisibility); };
}
