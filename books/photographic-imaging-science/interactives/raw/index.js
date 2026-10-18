import { experiment } from "../common/ui.js";
import { replay } from "../common/replay.js";
import { packingDemo, payloadRate } from "./model.js";
const hex = (x, d = 3) => `0x${x.toString(16).padStart(d, "0")}`,
  bin = (x) => x.toString(2).padStart(8, "0");
export function mount({ element, signal, session }) {
  return experiment({
    element,
    signal,
    session,
    kicker: "RAW · 样本、字节与解码约定",
    title: "两个 12-bit 样本怎样装进三个字节",
    intro:
      "播放打包与解包，观察每段位的位置。然后试着丢掉低位，或用错误的 nibble 顺序解码；比较两种错误发生在哪一步。",
    controls: [
      {
        key: "a",
        label: "RAW 样本 A",
        min: 0,
        max: 4095,
        step: 1,
        value: 0xabc,
        format: (x) => `${hex(x)} · ${x} DN`,
      },
      {
        key: "b",
        label: "RAW 样本 B",
        min: 0,
        max: 4095,
        step: 1,
        value: 0x123,
        format: (x) => `${hex(x)} · ${x} DN`,
      },
      {
        key: "dropBits",
        label: "存盘前丢弃低位",
        min: 0,
        max: 4,
        step: 1,
        value: 0,
        format: (x) => `${x} bit`,
      },
      {
        key: "fps",
        label: "示例视频帧率",
        min: 1,
        max: 120,
        step: 1,
        value: 24,
        format: (x) => `${x} fps`,
      },
      {
        key: "progress",
        label: "字节过程进度",
        min: 0,
        max: 100,
        step: 0.1,
        value: 0,
        format: (x) => `${x.toFixed(1)}%`,
      },
    ],
    presets: [
      {
        label: "正文打包例子",
        values: {
          a: 0xabc,
          b: 0x123,
          dropBits: 0,
          swappedNibbles: false,
          progress: 0,
        },
      },
      {
        label: "习题字节例子",
        values: {
          a: 0x745,
          b: 0x3ca,
          dropBits: 0,
          swappedNibbles: false,
          progress: 100,
        },
      },
      { label: "正确解码", values: { swappedNibbles: false } },
      { label: "读错 nibble 顺序", values: { swappedNibbles: true } },
      { label: "丢弃 4 个低位", values: { dropBits: 4, progress: 100 } },
      {
        label: "低于黑电平",
        values: { a: 100, dropBits: 0, swappedNibbles: false, progress: 100 },
      },
      { label: "4K · 24 fps", values: { width: 4096, height: 2160, fps: 24 } },
      { label: "UHD · 60 fps", values: { width: 3840, height: 2160, fps: 60 } },
    ],
    content: `<style>.actions button{font-size:11px;padding:4px 8px}.raw-stages{display:flex;gap:5px;flex-wrap:wrap;font-size:11px;margin:16px 0}.raw-stages span{border:1px solid #9caea244;border-radius:4px;padding:5px 8px;opacity:.5}.raw-stages span.active{opacity:1;background:#448b9822;border-color:#448b98}.raw-stage{border:1px solid #9caea244;border-radius:6px;padding:14px;margin:12px 0}.raw-stage h4{font-size:13px;margin:0 0 8px}.raw-stage p{font-size:12px}.byte-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.byte code{display:grid;grid-template-columns:repeat(8,1fr);gap:1px;font-size:12px;margin-top:8px}.byte code span{background:#448b981a;padding:4px 0;text-align:center}.byte code .from-b{background:#b47b4322}.byte small{font-size:10px}.truth{font-size:11px;border:1px solid #9caea244;border-radius:6px;padding:12px;margin:14px 0}.stats strong{font-size:19px}.raw-stage code{font-family:ui-monospace,monospace}.muted{opacity:.35}.normalization{overflow-wrap:anywhere}@media(max-width:650px){.byte-grid,.stats{grid-template-columns:1fr}.byte code{max-width:260px}.stats>div{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}}</style><div class="raw-stages" data-stages></div><div class="raw-stage" data-input></div><div class="raw-stage" data-bytes></div><div class="raw-stage" data-decoded></div><p class="reading" data-reading aria-live="polite"></p><div class="stats" data-rate></div><div class="truth" data-truth></div>`,
    note: "按正文式(10.1)—(10.2)给定的位序，将两个12-bit样本放进三字节容器。蓝色位来自A，金色位来自B；低位裁掉后仍以同一个三字节容器保存，所以容器长度没有自动缩短。黑电平128、白电平3840 DN在此例中为常数，线性归一化不预裁负值或高于1的值。载荷计算按单photosite 12 bit、每帧向上补到整字节，不含元数据、压缩、消隐或接口开销；MB/GB为十进制。回放按打包步骤推进，约8秒，离开视区暂停。",
    update(root, s) {
      const m = packingDemo(s),
        phase = Math.min(3, Math.floor(s.progress / 25)),
        rate = payloadRate({
          width: s.width ?? 4096,
          height: s.height ?? 2160,
          fps: s.fps,
        });
      root.querySelector("[data-stages]").innerHTML = [
        "原始样本",
        "低位处理",
        "字节容器",
        "按约定解码",
      ]
        .map(
          (label, i) =>
            `<span class="${i === phase ? "active" : ""}">${i + 1}. ${label}</span>`,
        )
        .join("");
      root.querySelector("[data-input]").innerHTML =
        `<h4>原始样本 → 存盘前样本</h4><p>A：<code>${hex(m.original[0])}</code> → <code>${hex(m.stored[0])}</code>；B：<code>${hex(m.original[1])}</code> → <code>${hex(m.stored[1])}</code></p><p>低位步长 ${m.step} DN。${s.dropBits ? "这一步已经丢失数值，后续无损打包也不能恢复。" : "样本数值保持。"}</p>`;
      root.querySelector("[data-bytes]").classList.toggle("muted", phase < 2);
      root.querySelector("[data-bytes]").innerHTML =
        `<h4>三个字节 · 24 bit</h4><div class="byte-grid">${m.packed.map((v, i) => `<div class="byte"><small>b${i} = ${hex(v, 2)}</small><code>${[...bin(v)].map((bit, j) => `<span class="${i === 2 || (i === 1 && j < 4) ? "from-b" : ""}">${bit}</span>`).join("")}</code></div>`).join("")}</div>`;
      root.querySelector("[data-decoded]").classList.toggle("muted", phase < 3);
      root.querySelector("[data-decoded]").innerHTML =
        `<h4>${s.swappedNibbles ? "错误 nibble 顺序" : "按声明的正确顺序"}解码</h4><p>A′=<code>${hex(m.decoded[0])}</code>，B′=<code>${hex(m.decoded[1])}</code>；相对原样本差值 ${m.loss[0]} / ${m.loss[1]} DN。</p><p class="normalization">线性减黑归一化：(A′−128)/(3840−128)=${m.normalized[0].toFixed(6)}；B′=${m.normalized[1].toFixed(6)}。负值保留。</p>`;
      root.querySelector("[data-reading]").textContent = s.swappedNibbles
        ? "字节内容没有变，解码约定读错后样本就会变。先核对格式，再解释图像。"
        : s.dropBits
          ? "打包与解包仍互逆，但恢复的是处理后的样本；存盘前丢弃的低位已经消失。"
          : `逐码往返${m.roundTrip ? "一致" : "不一致"}。把12-bit样本紧密排列只改变存储表示，不等于额外损失数值。`;
      root.querySelector("[data-rate]").innerHTML = [
        [
          "示例尺寸",
          `${s.width ?? 4096} × ${s.height ?? 2160}`,
          `单photosite 12 bit · ${s.fps} fps`,
        ],
        [
          "未压缩样本载荷",
          `${(rate.bytesPerSecond / 1e6).toFixed(3)} MB/s`,
          `${(rate.bitsPerSecond / 1e9).toFixed(6)} Gbit/s`,
        ],
        [
          "十分钟样本体积",
          `${rate.tenMinuteGB.toFixed(3)} GB`,
          "未计元数据与接口开销",
        ],
      ]
        .map(
          ([a, b, c]) =>
            `<div><small>${a}</small><strong>${b}</strong><em>${c}</em></div>`,
        )
        .join("");
      root.querySelector("[data-truth]").textContent =
        `独立位串对照：${m.truth.map((v) => hex(v, 2)).join(" · ")}；移位/掩码实现：${m.packed.map((v) => hex(v, 2)).join(" · ")}。对照使用字符串位置重排，不调用打包器。无损往返逐码相同只适用于未丢低位且解码顺序正确；本例不测试任何真实压缩编解码器。`;
    },
    setup: (context) =>
      replay({
        ...context,
        element,
        signal,
        key: "progress",
        label: "播放字节过程",
      }),
  });
}
