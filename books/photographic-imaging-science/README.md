# 摄影成像科学：从光子、CMOS 到镜头与 RAW

<p align="center">
  <img src="cover.png" alt="《摄影成像科学》教材封面：光线经镜头聚焦到 CMOS 传感器" width="560">
</p>

作者与维护：glenzli；与 AI 合作撰写、校核和修订。

许可：[CC BY-NC-ND 4.0](../../LICENSE)。

状态：修订稿。全书含序章及 17 章正文、48 幅可复现技术图、62 道练习及逐题答案。
本轮修订重写叙述、补充技术推导，并核对关键公式与一手资料；尚无真实器材数据集的
实验验证。具体审校范围见 [修订与核验记录](CONTENT_CLOSURE_AUDIT.md)。

这本书不从品牌和器材型号出发，而从一次曝光怎样形成一幅图像出发。主线是

$$
\text{场景辐亮度}
\longrightarrow \text{镜头像面曝光}
\longrightarrow \text{光电子}
\longrightarrow \text{读出码值}
\longrightarrow \text{RAW/Log/RGB}
\longrightarrow \text{显示或印刷图像}.
$$

沿着这条链，书中计算曝光怎样改变信噪比、增益怎样影响阴影与高光、RAW 保存了
哪些样本，以及镜头形成的细节怎样被传感器采样。全书默认读者会高中数学；微积分、
复数、Fourier 变换和概率论在使用处给出必要推导，较系统的工具集中在附录 A。

写作约束见 [SKILL.md](SKILL.md)，符号见 [NOTATION.md](NOTATION.md)，资料源见
[SOURCES.md](SOURCES.md)，逐章来源用途见 [CHAPTER_SOURCE_NOTES.md](CHAPTER_SOURCE_NOTES.md)。
习题答案见 [SOLUTIONS.md](SOLUTIONS.md)，术语检索见 [TERM_INDEX.md](TERM_INDEX.md)。
全部技术图由 [generate_figures.py](figures/generate_figures.py) 生成，SVG 源文件位于
[figures](figures/)；它们是机制图或解析曲线，不冒充具体器材实测。

## 第一部分：光、曝光与传感器

0. [序章：从一次曝光开始](00_preface_scope_and_measurement.md)
1. [第一章：辐射度学、光圈与曝光量](01_radiometry_aperture_and_exposure.md)
2. [第二章：从光子到电子：硅光电转换与像素](02_photons_silicon_and_pixels.md)
3. [第三章：CMOS 像素、读出链与模数转换](03_cmos_pixels_readout_and_adc.md)
4. [第四章：噪声、信噪比、满阱与动态范围](04_noise_snr_full_well_and_dynamic_range.md)
5. [第五章：ISO、曝光指数、增益与“双原生”](05_iso_exposure_index_and_gain.md)
6. [第六章：滚动/全局快门、背照、堆栈与曲面传感器](06_shutters_bsi_stacking_and_curved_sensors.md)
7. [第七章：色彩滤阵、采样、去马赛克与色彩矩阵](07_color_filter_sampling_and_demosaicing.md)

## 第二部分：计算曝光、编码与文件

8. [第八章：包围曝光、多帧降噪与现代 HDR 合成](08_computational_exposure_and_hdr.md)
9. [第九章：Gamma、Log、曝光指数与显示变换](09_gamma_log_exposure_index_and_display.md)
10. [第十章：静态 RAW、视频 RAW、压缩与元数据](10_still_raw_video_raw_and_compression.md)

## 第三部分：镜头的物理与工程

11. [第十一章：几何光学、近轴矩阵与镜头基本量](11_geometrical_optics_and_paraxial_systems.md)
12. [第十二章：衍射、PSF、OTF、MTF 与采样](12_diffraction_psf_otf_mtf_and_sampling.md)
13. [第十三章：球差、彗差、像散、场曲、畸变与色差](13_aberrations_and_field_behavior.md)
14. [第十四章：玻璃、树脂、萤石与低色散材料](14_optical_materials_glass_resin_and_fluorite.md)
15. [第十五章：非球面、Fresnel、PF/DO 与镀膜](15_aspheres_fresnel_diffractive_optics_and_coatings.md)
16. [第十六章：镜头结构、对焦、变焦、防抖与远心性](16_lens_architectures_focus_zoom_and_stabilization.md)
17. [第十七章：怎样读 MTF、测试镜头并分析整套成像系统](17_lens_testing_and_system_analysis.md)

## 附录

- [附录 A：概率、Fourier 变换与单位](A_probability_fourier_and_units.md)
- [附录 B：常用计算表与换算](B_calculation_reference.md)
- [答案手册](SOLUTIONS.md)
- [术语索引](TERM_INDEX.md)
- [逐章来源注释](CHAPTER_SOURCE_NOTES.md)

## 图版与校验

全书已接入 [Markdown Book](https://github.com/glenzli/markdown-book) 格式 v1。
[book.json](book.json) 按阅读顺序列出序章、17 章正文、两篇附录、符号表、答案、术语
与资料页，共 25 个阅读页面。Markdown、48 幅 SVG 和互动模型仍是仓库中的源文件，
阅读器从同一套源文件生成本地预览和静态网站。当前有 14 个互动组件、15 处章节插入，
从 4T/CDS、CMOS 增益、噪声和快门时序，到 HDR、编码、消色差、增透膜与光学测量。模型与测试位于
[interactives](interactives/)；逐章选择理由及后续安排见
[互动演示审读](INTERACTIVE_REVIEW.md)。
三维组件按需使用工具内置的 Three.js，不依赖在线 CDN；不支持 WebGL 2 时保留静态图。
本地将工具仓库克隆在 Curio 旁边并安装其依赖后，从 Curio 根目录运行：

```bash
node ../markdown-book/bin/markdown-book.js check books/photographic-imaging-science
node ../markdown-book/bin/markdown-book.js serve books/photographic-imaging-science
node ../markdown-book/bin/markdown-book.js build books/photographic-imaging-science --out /tmp/imaging-book --base /books/photographic-imaging-science/
```

最后一条生成可挂载到对应网址的完整静态目录，包含本地字体、公式、图版和互动代码。
网站可在 CI 中固定工具版本，构建后将这个目录挂到对应路径；生成的网页不回写为
书籍源码。源码以 Markdown 为准，构建目录无需提交。

安装 Markdown Book 的 Codex 插件后，可从侧栏进入书籍阅读器，也可在会话中调用
`open_reader`，传入本书目录的绝对路径。侧栏和会话面板复用同一阅读器，支持章节
导航、公式、静态图和各组互动；修改源文件后会更新预览。

重新生成全部图版：

```bash
python3 books/photographic-imaging-science/figures/generate_figures.py
```

执行教材闭环检查：

```bash
python3 books/photographic-imaging-science/validate.py
python3 books/audit_oet_rigor.py photographic-imaging-science --strict
python3 books/audit_textbook_narrative.py photographic-imaging-science --strict
```

校验器检查章节数、练习--答案双射、方程编号、局部链接、图版 XML、图注、控制字符
与来源章节覆盖。它不能替代数学审稿，但能阻止排版和清单层面的回归。

## 范围边界

本书讨论摄影和电影摄影所需的成像物理、电子学、计算成像与镜头分析。完整半导体
器件工艺、镜头优化软件、感知色貌模型、压缩编码器实现和摄影艺术史属于外部学科，
只在主线需要处建立接口。本书不替某一品牌评定器材，也不把实验室单一指标等同于
照片价值。


## 互动演示

- 第二章 `pixel`：PPD 积分、FD 复位、两次采样与电荷转移的共同时间轴；比较共同复位偏移的消除和独立采样噪声的保留。
- 第三章 `readout`：同一电荷在 ADC 前增益与 ADC 后数字乘法中的量化、输入端读噪及高光上限。
- 第四章 `noise`：曝光、散粒噪声、读噪与满阱；使用固定随机种子比较同一组像素。
- 第六章 `shutter`：逐行曝光的慢速回放、匀速物体的行内模糊与行间倾斜，以及静止场景的正弦照明条带。
- 第六章 `shutter-timing`：滚动与全局快门共用毫秒时间轴，联动当前时刻、代表行和曝光状态；与 `shutter` 共用物理时序及播放生命周期。
- 第七章 `sampling`：连续正弦、像素盒积分、采样相位与基带折返；0.50 cycles/pixel 的边界相位单独展示。
- 第八章 `hdr`：长短曝光归一化、已知背景位移的配准、方差权重及短帧去鬼影；可切换总曝光预算并采样独立噪声。
- 第九章 `encoding`：线性、Gamma 与带线性 toe 的教学 Log，比较码值跨度、量化后反解的暗部渐变及编码前高光剪切。
- 第十二章 `mtf`：无像差圆瞳与矩形像素的预采样 MTF、Nyquist、Airy 尺度及线性调制度条纹。
- 第十三、十七章共用 `field`：明确声明的局部椭圆 Gaussian PSF 模型，联动像高 MTF、两个方向最佳焦面和固定平面/局部重对焦。
- 第十四章 `achromat`：SCHOTT N-BK7/N-F2 目录色散与接触薄片光焦度分配，显示 F/C 同焦、残余谱线焦移、相同材料退化及像面上的几何离焦斑。
- 第十五章 `coating`：正入射单层无吸收膜的精确复振幅、反射光谱与能量守恒；独立改变物理厚度、膜材和基底折射率。
- 第十六章 `focus`：近轴薄透镜、光束与弥散圈的三维对焦实验。
- 第十七章 `edge`：合成斜边的法向投影、ESF 分箱、LSF 求导、DFT 与有限差分修正；空箱、噪声、加窗和解析真值分别显示。

以上模型均属于本书；`interactives/common/ui.js` 只共用展示与控件。各组件保留原 SVG 回退，正常阅读无需脚本。图中的教学模型与厂商数据分开，不能用来评价某支真实镜头。`make check` 包含解析模型的边界、单位及数值积分检验。
