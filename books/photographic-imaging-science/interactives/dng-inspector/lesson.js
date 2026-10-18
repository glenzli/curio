import { createDng, inspectDng, samples, width } from "./model.js";
import { control, number, escape } from "../common/lesson-view.js";
const bytes = createDng(),
  names = {
    258: "BitsPerSample",
    259: "Compression",
    262: "PhotometricInterpretation",
    273: "StripOffsets",
    33421: "CFARepeatPatternDim",
    33422: "CFAPattern",
    50706: "DNGVersion",
    50714: "BlackLevel",
    50717: "WhiteLevel",
    50721: "ColorMatrix1",
  };
export const spec = {
  title: "从DNG字节读到一个马赛克样本",
  alt: "互动示意：微型DNG的IFD标签、CFA样本与黑白电平逐码核对",
  intro:
    "这是一个32×32、16 bit未压缩容器中的合成CFA。原始有效码在12 bit范围内。查看IFD标签、选择样本，再故意用错字节序或黑电平。",
  staticCaption: "32×32合成RGGB，黑电平64，白电平4095；小端TIFF、单条带。",
  note: "生成的DNG 1.4兼容样本，不是相机拍摄。ColorMatrix1为虚拟恒等矩阵，不代表真实传感器色度标定；不做彩色显影。限定解析本地单IFD、单条带、16 bit未压缩样本，不宣称支持任意DNG或压缩RAW。样本与本书采用相同许可。",
  controls: [
    control("selected", "样本序号（行优先）", 0, 1023, 1, 0),
    control("wrong", "错误字节解释：0关 / 1开", 0, 1, 1, 0),
    control("ignoreBlack", "忽略黑电平：0关 / 1开", 0, 1, 1, 0),
  ],
  presets: [
    {
      label: "黑位以下的样本",
      values: { selected: 0, wrong: 0, ignoreBlack: 0 },
    },
    { label: "白电平样本", values: { selected: 2, wrong: 0, ignoreBlack: 0 } },
    { label: "错误字节序", values: { selected: 0, wrong: 1, ignoreBlack: 0 } },
    { label: "忽略黑电平", values: { selected: 1, wrong: 0, ignoreBlack: 1 } },
  ],
  evaluate(s) {
    const m = inspectDng(bytes, {
        wrongEndian: !!s.wrong,
        blackOverride: s.ignoreBlack ? 0 : null,
      }),
      x = s.selected % width,
      y = Math.floor(s.selected / width),
      left = Math.floor(x / 4) * 4,
      top = Math.floor(y / 4) * 4,
      cfa = ["R", "G", "G", "B"];
    let cells = "";
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 4; col++) {
        const xx = left + col,
          yy = top + row,
          i = yy * width + xx,
          channel = cfa[(yy % 2) * 2 + (xx % 2)],
          selected = i === s.selected;
        cells += `<rect x="${8 + col * 156}" y="${45 + row * 58}" width="150" height="54" fill="currentColor" fill-opacity="${selected ? 0.14 : 0.025}" stroke="currentColor" stroke-opacity="${selected ? 0.8 : 0.2}"/><text x="${16 + col * 156}" y="${65 + row * 58}" style="font-size:20px">${channel} (${xx},${yy})</text><text x="${16 + col * 156}" y="${88 + row * 58}">${m.decoded[i]}</text>`;
      }
    return {
      figure: `<svg class="drawing" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 290" role="img" aria-label="所选样本附近的CFA码值"><text x="10" y="25">CFA标签与原始DN（行优先）</text>${cells}</svg>`,
      stats: [
        [
          "所选样本",
          String(m.decoded[s.selected]) + " DN",
          `生成真值 ${samples[s.selected]} DN`,
        ],
        [
          "有符号归一化",
          number(m.normalized[s.selected], 6),
          `(DN−${m.black}) / (${m.white}−${m.black})`,
        ],
        [
          "逐码不一致数",
          String(m.mismatches) + " / 1024",
          `文件 ${bytes.length} 字节；像素载荷2048字节`,
        ],
      ],
      table: `<div class="table-scroll"><table><thead><tr><th>标签</th><th>类型 / 数量</th><th>解码值</th></tr></thead><tbody>${m.tags
        .filter((t) => names[t.tag])
        .map(
          (t) =>
            `<tr><td>${escape(names[t.tag])}</td><td>${t.type} / ${t.count}</td><td>${escape(t.values.join(", "))}</td></tr>`,
        )
        .join("")}</tbody></table></div>`,
      reading: `样本(${x},${y})的实际字节偏移 ${m.offset + 2 * s.selected}，两个字节为 ${Array.from(bytes.slice(m.offset + 2 * s.selected, m.offset + 2 * s.selected + 2), (x) => x.toString(16).padStart(2, "0")).join(" ")}。正确解码在全部1024码上与生成数组比对；改错黑电平不会改写文件字节，改错字节解释则会直接改码。下载样本的链接在正文中。`,
    };
  },
};
