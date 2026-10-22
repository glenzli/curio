# 摄影成像科学封面

- 文件：[cover.png](cover.png)，1024 × 1536 px，PNG，比例 2:3。
- 书名：摄影成像科学。
- 作者：Glen Li。
- 许可：[CC BY-NC-ND 4.0](../../../LICENSE)。
- 当前版本：V7。采用竖直光轴插画，书名与作者名在上方横排。
- 图像摘要：`a736d2c7f316da80b76a7c68f4c60188ba21252b7fc4b6c84b4155408ebb37d0`。

书名与作者名均使用得意黑的真实字形轮廓，已经合成在完整封面中。网站直接显示
这张图片，无需再次叠字。无字母版、版式、提示词和可复现构建说明位于
[封面源文件目录](../cover/README.md)，采用记录见[构建记录](../cover/published-build.json)。

这是成像流程的概念插画。定量光路、镜组处方与结构说明见正文编号图及互动模型。

网站构建使用 `cover: { src: "assets/cover.png", alt: "镜头剖面、光束与 CMOS 像素阵列" }`。书稿清单保留 0.8.0 可读的字段，封面由发布方传入构建器。

## 早期无字版记录

以下提示词属于 2026-10-19 的早期无字候选，不是当前 V7 的制作说明。
该候选的图像摘要为 `ece7cd1a010fe43ac42b2d8c67a1376f210cec74c6d3152f22bce988dd63bb72`。
最初的构图参考保留在 [cover.png](../cover.png)。

Use case: precise-object-edit. Asset type: text-free cover illustration for an online book, portrait 2:3. Input image is the edit target. Remove ALL baked-in text completely: the large Chinese title across the top, the subtitle below it, and the author name at the bottom. Replace those areas with the same clean warm off-white background, with no visible erasure artifacts or faint lettering. Retain the finely rendered cutaway photographic lens, the translucent glass elements, the restrained spectral light rays, the CMOS microlens and Bayer filter stack, and the small quiet diffraction-ring inset. Rebalance the existing illustration slightly within the portrait canvas so the artwork reads well as a bookshelf thumbnail without a large vacant title block; retain comfortable clean margins. Keep the same precise technical-illustration style, material detail, warm paper background, and restrained color. This is conceptual cover art, not a numerical optical diagram. The title and author will be editable HTML outside the image. No text of any kind, no letters, no numbers, no labels, no logos, no watermarks. Do not add new objects.
