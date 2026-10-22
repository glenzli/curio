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
  note: "本书生成的DNG 1.4兼容样本。ColorMatrix1填入恒等矩阵作为文件字段示例，彩色显影另需真实传感器标定。解析范围为本地单IFD、单条带、16 bit未压缩样本。样本与本书采用相同许可。",
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
      cfa = ["R", "G", "G", "B"],
      byteOffset = m.offset + 2 * s.selected,
      selectedBytes = Array.from(bytes.slice(byteOffset, byteOffset + 2)),
      byteCells = selectedBytes.map((value, j) => `<rect x="${12 + 165 * j}" y="325" width="151" height="52" rx="5" fill="#bb7946" fill-opacity=".15" stroke="#bb7946"/><text x="${24 + 165 * j}" y="347" style="font-size:12px">偏移 ${byteOffset + j}</text><text x="${24 + 165 * j}" y="369" style="font-size:19px;font-weight:600">${value.toString(16).padStart(2, "0")}</text>`).join("");
    let cells = "";
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 4; col++) {
        const xx = left + col,
          yy = top + row,
          i = yy * width + xx,
          channel = cfa[(yy % 2) * 2 + (xx % 2)],
          selected = i === s.selected;
        cells += `<rect x="${8 + col * 156}" y="${45 + row * 58}" width="150" height="54" rx="5" fill="${{ R: "#c56b61", G: "#539a74", B: "#4f83b7" }[channel]}" fill-opacity="${selected ? 0.25 : 0.11}" stroke="${selected ? "currentColor" : { R: "#c56b61", G: "#539a74", B: "#4f83b7" }[channel]}" stroke-opacity="${selected ? 0.8 : 0.3}"/><text x="${16 + col * 156}" y="${65 + row * 58}" style="font-size:16px">${channel} (${xx},${yy})</text><text x="${16 + col * 156}" y="${88 + row * 58}">${m.decoded[i]}</text>`;
      }
    return {
      figureHeight: 400,
      figure: `<svg class="drawing" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 390" role="img" aria-label="所选样本附近的CFA码值和所选两字节"><text x="10" y="25">CFA通道与原始DN（行优先；底色标识滤色通道）</text>${cells}<text x="12" y="312" style="font-size:14px">所选两字节（十六进制；文件为小端）</text>${byteCells}<text x="354" y="347" style="font-size:14px">${s.wrong ? "错误：先读的字节作为高位" : "低位字节在前，高位在后"}</text><text x="354" y="373" style="font-size:18px">${s.wrong ? selectedBytes[0] * 256 + " + " + selectedBytes[1] : selectedBytes[0] + " + 256 × " + selectedBytes[1]} = ${m.decoded[s.selected]}</text></svg>`,
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
