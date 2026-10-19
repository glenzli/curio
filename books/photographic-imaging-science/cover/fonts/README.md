# 外部字体记录

本目录只保存字体版本、来源和校验值，不附带字体二进制文件或许可副本。
构建时通过 `--font-dir` 指定本机已有字体所在目录，封面输出保留字形轮廓。

当前 V7 的书名和作者名均使用 **得意黑 Smiley Sans Oblique 2.0.1**。
字体复用自 Storybook Co-Editor 已收录的原始文件：

- [固定来源](https://github.com/glenzli/storybook-co-editor/blob/857bd73165f70f0b90a3e9e1aaa1fbbd87646298/app/src/assets/fonts/display/SmileySans-Oblique.ttf.woff2)
- [来源记录](SmileySans-provenance.json)

已核对本机文件与该提交中的字体字节一致，当前构建直接读取外部原文件。
字体版权归 atelierAnchor，未裁字、修改或改名。

早期候选使用的两款 Noto 字体也保留来源记录，便于按原版式重新构建：

| 字体 | 实例 | 固定来源 |
| --- | --- | --- |
| Noto Serif SC SemiBold 2.003 | 600 字重 | [notofonts/noto-cjk](https://github.com/notofonts/noto-cjk/blob/f8d157532fbfaeda587e826d4cd5b21a49186f7c/Serif/SubsetOTF/SC/NotoSerifSC-SemiBold.otf) |
| Noto Sans 2.015 | `wght=400, wdth=100` | [Google Fonts](https://github.com/google/fonts/blob/47d54ca1ebb14fd864695f1d39dc734f39017c33/ofl/notosans/NotoSans%5Bwdth,wght%5D.ttf) |

[fonts.json](fonts.json) 供构建器核对实际字体版本、字节和变量轴。

```text
731f22973349404b15a88a99ef3b5dd4104c0965c23b7e485c1f11e84fea99e2  SmileySans-Oblique.ttf.woff2
517d9736136b3b4e9aea742a7e1acda1922aea91a4425bd8db79281934055bf5  NotoSerifSC-SemiBold.otf
bfb7bb691513f12e734dc346c03a03f784912432d7e3fa8e56efcf906fe86b3d  NotoSans-VF.ttf
```
