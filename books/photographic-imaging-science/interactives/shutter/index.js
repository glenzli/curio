import { experiment } from "../common/ui.js";
import { rowExposure, motion, illumination, sinc, rodProfile } from "./model.js";

const format = (x, digits = 2) => x.toLocaleString("zh-CN", { maximumFractionDigits: digits });

function timeline(scan, exposure, progress) {
  const duration = scan + exposure, now = progress * duration;
  const X = (t) => 24 + 592 * t / duration;
  let rows = "";
  for (let i = 0; i < 10; i++) {
    const { start, end } = rowExposure(i / 9, scan, exposure), y = 12 + 15 * i;
    rows += `<path d="M24,${y}H616" stroke="currentColor" opacity=".08"/><path d="M${X(start)},${y}H${X(end)}" stroke="#3f8b98" stroke-width="6" opacity=".28"/>`;
    const stop = Math.min(end, now);
    if (stop > start) rows += `<path d="M${X(start)},${y}H${X(stop)}" stroke="#3f8b98" stroke-width="6"/>`;
  }
  return `<p class="scene-label">代表性行的曝光窗口（从顶到底）</p><svg role="img" aria-label="从顶行到底行的曝光窗口及当前时刻" viewBox="0 0 640 160">${rows}<path d="M${X(now)},2V157" stroke="#b98447" stroke-width="1.5"/></svg><div class="time-scale"><span>0 ms</span><span>${format(duration * 1000, 3)} ms</span></div>`;
}

function frame(scan, exposure, speed, frequency, progress) {
  const now = progress * (scan + exposure), width = 6, blur = speed * exposure;
  const span = blur + width, peak = rodProfile(0, blur, width);
  const corner = Math.min(blur, width) / span;
  const extent = Math.max(120, speed * (scan + exposure) + width + 20);
  const X = (x) => (x + width / 2 + 8) * 370 / extent;
  const rectangleWidth = span * 370 / extent;
  const gradient = blur === 0 ? `<stop offset="0" stop-color="#3f8b98"/><stop offset="1" stop-color="#3f8b98"/>` :
    `<stop offset="0" stop-color="#3f8b98" stop-opacity="0"/><stop offset="${corner}" stop-color="#3f8b98" stop-opacity="${peak}"/><stop offset="${1 - corner}" stop-color="#3f8b98" stop-opacity="${peak}"/><stop offset="1" stop-color="#3f8b98" stop-opacity="0"/>`;
  let rods = "", bands = "";
  for (let i = 0; i < 64; i++) {
    const r = i / 63, sample = motion(r, scan, exposure, speed), y = i * 2.75;
    if (now + 1e-12 < sample.end) continue;
    const value = Math.round(255 * (illumination(r, scan, exposure, frequency) / 1.8) ** (1 / 2.2));
    rods += `<rect x="${X(sample.position - span / 2)}" y="${y}" width="${rectangleWidth}" height="2.8" fill="url(#rod)"/>`;
    bands += `<rect x="0" y="${y}" width="146" height="2.8" fill="rgb(${value} ${value} ${value})"/>`;
  }
  return `<div class="shutter-scenes"><figure><figcaption>恒定光照 · 匀速竖杆</figcaption><svg role="img" aria-label="已完成曝光的各行中，匀速竖杆的运动积分" viewBox="0 0 370 176" preserveAspectRatio="none"><defs><linearGradient id="rod">${gradient}</linearGradient></defs><rect width="370" height="176" fill="currentColor" opacity=".045"/>${rods}</svg><small>横向全宽：${format(extent)} px</small></figure><figure><figcaption>静止表面 · 频闪</figcaption><svg role="img" aria-label="静止均匀表面逐行曝光后的频闪条带" viewBox="0 0 146 176" preserveAspectRatio="none"><rect width="146" height="176" fill="currentColor" opacity=".045"/>${bands}</svg><small>灰阶上限：1.8 L₀</small></figure></div>`;
}

export function mount({ element, signal }) {
  return experiment({
    element, signal, kicker: "快门 · 曝光时序", title: "逐行曝光、运动与频闪",
    intro: "拖动时间查看各行的曝光进度，也可播放一次慢速回放。改变曝光时间，分别观察竖杆的模糊宽度、倾斜量和右侧的照明条带。",
    controls: [
      { key: "scanMs", label: "顶行到底行的起始时间差", min: 0, max: 40, step: 0.001, value: 17.272, format: (x) => `${format(x, 3)} ms` },
      { key: "exposureMs", label: "每行曝光时间", min: 0.25, max: 20, step: 0.25, value: 2, format: (x) => `${format(x)} ms` },
      { key: "speed", label: "像面运动速度", min: 0, max: 12000, step: 100, value: 12000, format: (x) => `${format(x)} px/s` },
      { key: "frequency", label: "照明调制频率", min: 50, max: 200, step: 10, value: 100, format: (x) => `${x} Hz` },
      { key: "progress", label: "曝光进度", min: 0, max: 100, step: 1, value: 100, format: (x) => `${format(x, 0)}%` },
    ],
    presets: [
      { label: "1/500 秒", values: { scanMs: 17.272, exposureMs: 2, speed: 12000, progress: 100 } },
      { label: "1/4000 秒", values: { scanMs: 17.272, exposureMs: 0.25, speed: 12000, progress: 100 } },
      { label: "全局曝光", values: { scanMs: 0, exposureMs: 2, speed: 12000, progress: 100 } },
      { label: "100 Hz · 10 ms", values: { scanMs: 17.272, frequency: 100, exposureMs: 10, progress: 100 } },
    ],
    content: `<style>.shutter-scenes{display:grid;grid-template-columns:2fr 1fr;gap:20px}.shutter-scenes figure{margin:0;min-width:0}.shutter-scenes figcaption,.scene-label{font-size:11px;margin:0 0 9px;opacity:.85}.shutter-scenes svg{height:176px;border-radius:3px}.shutter-scenes small,.time-scale{font-size:10px;opacity:.75}.time-scale{display:flex;justify-content:space-between;margin-top:5px}@media(max-width:550px){.shutter-scenes{gap:12px}.shutter-scenes figcaption{min-height:22px}.shutter-scenes small{display:block;margin-top:6px}}</style><div class="stats"><div><small>顶行到底行的位移差</small><strong data-skew></strong><em>px，等于速度 × 扫描时间差</em></div><div><small>单行运动模糊长度</small><strong data-blur></strong><em>px，等于速度 × 曝光时间</em></div><div><small>曝光后剩余调制系数</small><strong data-flicker></strong><em>原照明调制幅度的比例</em></div></div><div class="chart" data-timeline></div><div class="chart" data-frame></div><p class="reading" data-reading></p>`,
    note: "模型：匀速水平运动，竖杆宽 6 px；每行有相同的矩形曝光窗口，扫描方向从顶到底。默认 17.272 ms 对应 2160 行、行间隔 8 μs，画面用 64 条代表性行显示。左图在恒定照明下积分；右图是静止均匀表面，照明为 L₀[1+0.8 cos(2πft)]，按式 (6.2a) 精确平均。两图是分开的实验条件。左图透明度表示积分权重，右图统一作 Gamma 2.2 显示，均不模拟器材的噪声、读出带宽或色彩。未完成曝光的行暂不显示。播放仅将一帧回放拉长到 6 秒，离开视区或页面后自动暂停。",
    update(root, state) {
      const scan = state.scanMs / 1000, exposure = state.exposureMs / 1000;
      root.querySelector("[data-skew]").textContent = format(state.speed * scan, 3);
      root.querySelector("[data-blur]").textContent = format(state.speed * exposure, 3);
      root.querySelector("[data-flicker]").textContent = `${format(100 * Math.abs(sinc(Math.PI * state.frequency * exposure)))}%`;
      root.querySelector("[data-timeline]").innerHTML = timeline(scan, exposure, state.progress / 100);
      root.querySelector("[data-frame]").innerHTML = frame(scan, exposure, state.speed, state.frequency, state.progress / 100);
      root.querySelector("[data-reading]").textContent = state.scanMs === 0 ?
        "各行同时开始、同时结束曝光，因此没有逐行位移差。运动物体在曝光期间仍会模糊；这里不演示曝光结束后的串行读出。" :
        "缩短每行曝光会收窄运动模糊；顶行到底行的时间差不变，竖杆的倾斜量也不变。照明频闪的条带还取决于调制周期与曝光窗口。";
    },
    setup({ root, state, render }) {
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
    },
  });
}
