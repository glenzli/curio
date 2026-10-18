import { noiseBudget, randomGenerator, samplePixel } from "./model.js";

const css = `:host{display:block;color:var(--text,#232b2a);font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}*{box-sizing:border-box}.lab{padding:25px}.eyebrow{font-size:10px;letter-spacing:.14em;color:var(--accent,#2f6251);margin:0 0 8px}h3{font-size:20px;line-height:1.4;letter-spacing:-.03em;font-weight:600;margin:0}.intro{font-size:12px;line-height:1.8;color:var(--muted,#77817c);margin:10px 0 23px}.images{display:grid;grid-template-columns:1fr 1fr;gap:13px}figure{margin:0}canvas{width:100%;height:auto;display:block;border-radius:5px;image-rendering:pixelated;background:#777}figcaption{display:flex;justify-content:space-between;gap:5px;margin:8px 0 0;font-size:10px;color:var(--muted,#77817c)}.controls{display:grid;grid-template-columns:1fr 1fr;gap:18px 25px;margin:26px 0 22px}.control label{font-size:11px;display:flex;justify-content:space-between;gap:8px;margin-bottom:8px}.control output{color:var(--accent,#2f6251);font-variant-numeric:tabular-nums}input{width:100%;margin:0;accent-color:var(--accent,#2f6251);cursor:pointer}input:focus-visible,button:focus-visible{outline:2px solid var(--accent,#2f6251);outline-offset:3px}.stats{display:grid;grid-template-columns:repeat(3,1fr);border-block:1px solid var(--line,#e2e5de);padding:17px 0;gap:12px}.stat small{display:block;color:var(--muted,#77817c);font-size:10px;margin-bottom:6px}.stat strong{font-size:23px;line-height:1.2;font-weight:550;font-variant-numeric:tabular-nums}.stat span{font-size:10px;color:var(--muted,#77817c);margin-left:5px}.formula{font-family:ui-monospace,monospace;font-size:11px;overflow-x:auto;white-space:nowrap;padding:17px 0 8px;color:var(--accent,#2f6251)}.interpretation{font-size:12px;line-height:1.9;margin:6px 0 17px}.foot{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:10px;color:var(--muted,#77817c)}button{background:transparent;border:1px solid var(--line,#e2e5de);color:inherit;padding:6px 10px;border-radius:4px;font:inherit;font-size:10px;cursor:pointer;white-space:nowrap}.notes{font-size:10px;line-height:1.85;color:var(--muted,#77817c);margin:17px 0 0}.seed{font-family:ui-monospace,monospace}@media(max-width:540px){.lab{padding:18px}.controls{gap:17px 18px}.stat strong{font-size:20px}.stat small{font-size:9px}.images{gap:9px}.foot{align-items:flex-start}h3{font-size:18px}}`;

export function mount({ element, props = {}, signal, session }) {
  const shadow = element.attachShadow({ mode: "open" });
  const events = new AbortController();
  signal.addEventListener("abort", () => events.abort(), { once: true });
  const initialSeed = Number(props.seed ?? 20261017);
  const saved = session?.load();
  let seed = saved?.version === 1 && Number.isSafeInteger(saved.seed) ? saved.seed : initialSeed;
  shadow.innerHTML = `<style>${css}</style><section class="lab" aria-label="曝光与噪声互动实验"><p class="eyebrow">第四章 · 单像素时间噪声</p><h3>曝光时间与信噪比</h3><p class="intro">调整曝光时间和噪声参数，比较单帧与多帧平均后的图像。</p><div class="images"><figure><canvas width="120" height="76" aria-label="基准：1秒曝光单帧的模拟噪声"></canvas><figcaption><span>基准 · 1 s / 单帧</span><span>相同平均灰度</span></figcaption></figure><figure><canvas width="120" height="76" aria-label="当前参数的模拟噪声"></canvas><figcaption><span id="sample-label"></span><span>相同平均灰度</span></figcaption></figure></div><div class="controls"><div class="control"><label for="exposure">曝光时间 <output id="exposure-value"></output></label><input id="exposure" aria-label="曝光时间" type="range" min="-2" max="6" step="0.25" value="0"></div><div class="control"><label for="read-noise">读出噪声 <output id="read-noise-value"></output></label><input id="read-noise" aria-label="读出噪声" type="range" min="0" max="12" step="0.25" value="2"></div><div class="control"><label for="dark-rate">暗电流率 <output id="dark-rate-value"></output></label><input id="dark-rate" aria-label="暗电流率" type="range" min="0" max="10" step="0.1" value="0.1"></div><div class="control"><label for="frames">独立平均帧数 <output id="frames-value"></output></label><input id="frames" aria-label="独立平均帧数" type="range" min="0" max="4" step="1" value="0"></div></div><div class="stats" role="status" aria-live="polite"><div class="stat"><small>每帧信号均值</small><strong id="signal"></strong><span>e⁻</span></div><div class="stat"><small>平均后总噪声 RMS</small><strong id="sigma"></strong><span>e⁻</span></div><div class="stat"><small>时间信噪比 SNR</small><strong id="snr"></strong><span id="db"></span></div></div><div class="formula">SNR = √M · μₛ / √(μₛ + i_d t + σᵣ²)</div><p class="interpretation" id="interpretation"></p><div class="foot"><span>信号率固定为 20 e⁻/s · <span class="seed" id="seed"></span></span><div><button id="resample" type="button">重新抽样</button> <button id="reset" type="button">重置</button></div></div><p class="notes">依照式 (4.1)–(4.2)：信号与暗电子独立服从 Poisson 分布，读出项采用零均值高斯噪声；减去已知平均暗信号。各帧独立，未计入共享暗场误差、PRNU、空间相关和饱和。两幅图按各自期望信号归一化至相同平均灰度，显示值会截断；数据卡为解析值，不从图像估计。模型示意，不是器材实测。</p></section>`;
  const $ = (selector) => shadow.querySelector(selector);
  const controls = ["exposure", "read-noise", "dark-rate", "frames"].map((id) =>
    $(`#${id}`),
  );
  if (saved?.version === 1 && Array.isArray(saved.controls)) controls.forEach((input,i)=>{
    const value=saved.controls[i];
    if(Number.isFinite(value)) input.value=String(Math.max(Number(input.min),Math.min(Number(input.max),value)));
  });
  let snapshot;
  session?.describe(()=>snapshot);
  const format = (value) => (value < 10 ? value.toFixed(2) : value.toFixed(1));
  let frame;
  function draw(canvas, parameters, offset) {
    const random = randomGenerator(seed + offset);
    const budget = noiseBudget(parameters);
    const context = canvas.getContext("2d");
    const image = context.createImageData(canvas.width, canvas.height);
    for (let pixel = 0; pixel < canvas.width * canvas.height; pixel++) {
      const value = Math.max(
        0,
        Math.min(
          255,
          Math.round((128 * samplePixel(parameters, random)) / budget.signal),
        ),
      );
      const index = pixel * 4;
      image.data[index] = value;
      image.data[index + 1] = value;
      image.data[index + 2] = value;
      image.data[index + 3] = 255;
    }
    context.putImageData(image, 0, 0);
  }
  function update() {
    const exposure = 2 ** Number(controls[0].value);
    const readNoise = Number(controls[1].value);
    const darkRate = Number(controls[2].value);
    const frames = 2 ** Number(controls[3].value);
    const parameters = {
      signalRate: 20,
      exposure,
      readNoise,
      darkRate,
      frames,
    };
    const budget = noiseBudget(parameters);
    $("#exposure-value").value = `${format(exposure)} s`;
    $("#read-noise-value").value = `${format(readNoise)} e⁻ RMS`;
    $("#dark-rate-value").value = `${darkRate.toFixed(1)} e⁻/s`;
    $("#frames-value").value = `${frames} 帧`;
    $("#signal").textContent = format(budget.signal);
    $("#sigma").textContent = format(budget.sigma);
    $("#snr").textContent = budget.snr.toFixed(2);
    $("#db").textContent = `${budget.db.toFixed(1)} dB`;
    $("#sample-label").textContent =
      `当前 · ${format(exposure)} s / ${frames} 帧`;
    $("#seed").textContent = `seed ${seed}`;
    const base = noiseBudget({ exposure: 1, readNoise, darkRate, frames: 1 });
    const factor = budget.snr / base.snr;
    const regime =
      budget.signal > 5 * (budget.dark + readNoise ** 2)
        ? "信号散粒噪声已占主要部分。继续延长曝光，信噪比近似按曝光时间的平方根增长。"
        : "暗电流噪声和读出噪声仍占有明显比例，可分别调整相应参数，观察它们对总噪声的影响。";
    $("#interpretation").textContent =
      `当前信噪比是左侧基准的 ${factor.toFixed(2)} 倍。${regime}${frames > 1 ? ` 每帧曝光时间不变时，${frames} 帧平均使标准差降为单帧的 1/√${frames}，总曝光时间为单帧的 ${frames} 倍。` : ""}`;
    session?.save({version:1, seed, controls: controls.map(input=>Number(input.value))});
    snapshot={title:"曝光时间与信噪比",parameters:[{label:"曝光时间",value:format(exposure)+" s"},{label:"读出噪声",value:format(readNoise)+" e⁻ RMS"},{label:"暗电流率",value:darkRate+" e⁻/s"},{label:"独立平均帧数",value:frames},{label:"随机种子",value:seed}],readings:[{label:"信号均值",value:format(budget.signal)+" e⁻"},{label:"噪声 RMS",value:format(budget.sigma)+" e⁻"},{label:"SNR",value:budget.snr.toFixed(2)}],assumptions:"信号率20 e⁻/s；独立Poisson信号/暗电子与Gaussian读噪；已知暗均值；未计入饱和及相关校准误差。"};
    const canvases = shadow.querySelectorAll("canvas");
    draw(canvases[0], { ...parameters, exposure: 1, frames: 1 }, 0);
    draw(canvases[1], parameters, 0);
  }
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(update);
  };
  controls.forEach((input) =>
    input.addEventListener("input", schedule, { signal: events.signal }),
  );
  $("#resample").addEventListener(
    "click",
    () => {
      seed++;
      schedule();
    },
    { signal: events.signal },
  );
  $("#reset").addEventListener(
    "click",
    () => {
      controls[0].value = "0";
      controls[1].value = "2";
      controls[2].value = "0.1";
      controls[3].value = "0";
      seed = initialSeed;
      schedule();
    },
    { signal: events.signal },
  );
  update();
  return () => {
    events.abort();
    cancelAnimationFrame(frame);
    shadow.replaceChildren();
  };
}
