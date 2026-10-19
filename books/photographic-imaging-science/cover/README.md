# 封面源文件与排字

本书已采用 V7 完整封面，文件位于 [assets/cover.png](../assets/cover.png)。
插画为竖直镜头剖面与平面感光面。书名横排，作者名紧接下方，
两行都用得意黑。文字取自 [book.json](../book.json)，由真实字形轮廓合成。
[构建记录](published-build.json) 保存采用时的字体、输入和成品校验值。

## 输入与构建

- [artwork-vertical-v3.png](artwork-vertical-v3.png)：1024 × 1536 无字母版，保留原始图像字节。
- [artwork-vertical-prompts.json](artwork-vertical-prompts.json)：Codex 内置 imagegen 的两轮完整提示词。
- [cover-layout-horizontal-v7.json](cover-layout-horizontal-v7.json)：书名和作者名的字体、字号与位置。
- [fonts](fonts/README.md)：外部字体的版本、来源和校验值，未附字体文件或许可副本。

插画描绘镜头、光束与感光面的关系，属于封面概念图；定量光路和镜组处方见正文。
插画和合成封面沿用[本书许可](../../../LICENSE)。

使用 Node.js 22 或更新版本。在本目录运行：

```bash
npm ci --ignore-scripts --no-audit --no-fund
node build-cover.mjs --font-dir ../../../../storybook-co-editor/app/src/assets/fonts/display --art artwork-vertical-v3.png --layout cover-layout-horizontal-v7.json --out out/candidate-horizontal-v7
```

以上命令读取相邻的 Storybook Co-Editor 仓库已有字体；也可用 `--font-dir`
指定另一目录，其中须有与清单校验值一致的 `SmileySans-Oblique.ttf.woff2`。
书名为 124 px，基线位于 193 px；作者名为 37 px，基线位于 259 px。
两行均横排居中，未增加底部署名。

输出位于 `out/candidate-horizontal-v7/`：

- `cover.png`：1024 × 1536 完整封面。
- `cover.svg`：嵌入插画、包含字形轮廓的独立 SVG，无需外部图片或字体。
- `cover-192.png`：192 × 288 缩略图，用于检查书架大小下的辨识度。
- `build.json`：书名、作者、字体版本、输入与输出校验值。

## 保留的早期候选

| 候选 | 母图 | 版式 | 特点 |
| --- | --- | --- | --- |
| V2 | [artwork-v2.png](artwork-v2.png) | [cover-layout.json](cover-layout.json) | 斜置镜头、宋体书名、底部署名 |
| V3 | [artwork-vertical-v3.png](artwork-vertical-v3.png) | [cover-layout-vertical.json](cover-layout-vertical.json) | 竖直光轴、横排宋体书名、底部署名 |
| V4 | [artwork-integrated-v4.png](artwork-integrated-v4.png) | [cover-layout-integrated.json](cover-layout-integrated.json) | 竖排书名，保留作备选 |
| V6 | [artwork-vertical-v3.png](artwork-vertical-v3.png) | [cover-layout-horizontal-v6.json](cover-layout-horizontal-v6.json) | 横排得意黑书名、Noto Sans 作者名 |

已生成的早期图片仍保留在各自的 `out/candidate…/` 目录中。
重新构建时，`--font-dir` 所指目录须包含该版式所需的字体。
例如默认 V2 可用 `npm run build -- --font-dir /path/to/fonts` 构建；
字体清单保留了 Noto 字体的来源和校验值。

V4 的可选纵排使用 `direction: "vertical"`、`x`、`baseline` 与 `lineGap` 定位；
当前 V7 使用横排，未启用这些选项。

## 复现与发布

构建器读取显式指定的外部字体目录，核对字体 SHA-256、版本和逐字覆盖，
再用字体自身的字距与字形轮廓生成 SVG。缺字、校验不符或文字无法容纳时会报错，
不调用系统字体替代。PNG 使用锁定版本的 resvg 渲染，关闭系统字体加载。

在相同依赖和输入下，两次构建应得到相同的 SVG、PNG、缩略图和回执。
`--book` 可指定另一份书稿清单，`--layout` 可指定另一份版式。输出目录须为空，
或已包含本工具生成的 `build.json`。`out/` 与依赖目录不进入源码提交。

脚本只生成预览，不自动覆盖书稿中的正式封面。确认新版后，再将对应的完整
`cover.png` 复制到 `assets/cover.png`，同时更新 `published-build.json`。
网站使用这张完整图片，无需额外叠加书名或作者。
