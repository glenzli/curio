---
name: photographic-imaging-science
description: Use when writing, revising, or auditing the rigorous Chinese textbook in books/photographic-imaging-science. Requires radiometric and optical definitions, explicit noise and signal-chain models, separation of physical capture from encoding, primary-source traceability, and complete exercise-solution coverage.
---

# 摄影成像科学教材写作约束

本约束适用于 `books/photographic-imaging-science/`。它继承
`books/SKILL.md`、`books/OET_RIGOR_STANDARD.md` 与
`books/TEXTBOOK_NARRATIVE_STANDARD.md`，并补充摄影成像学的局部要求。

## 1. 物理链条

- 所有“画质”论断必须尽可能还原到场景辐亮度、像面辐照度、曝光量、
  光电子数、电压、数字码值或显示亮度中的某一层，不得跨层偷换。
- 必须区分光子数、电子数、伏特、DN、线性 RGB、Log 码值和显示码值；
  同一个“亮度”不得在这些层之间无声明复用。
- 信噪比必须写明信号定义、噪声组成、统计总体、带宽、空间尺度和是否做了
  多帧平均。动态范围必须写明上端、下端和判据。
- 像素尺寸、传感器面积、分辨率、量子效率、满阱容量和读出噪声是不同量；
  不用单个规格替代系统分析。

## 2. 曝光、ISO 与编码

- 光圈和曝光时间改变到达传感器的光；ISO、曝光指数、模拟增益、转换增益、
  数字增益和输出映射必须分别定义。
- “原生 ISO”“基础 ISO”“双原生 ISO”没有脱离具体相机信号链的统一物理
  含义。正文必须指出所采用的操作定义，不把营销名称当作元件常数。
- Log 是编码函数，不自动增加传感器动态范围。讨论 Log 的最低 ISO 时，必须
  分离传感器工作模式、曝光指数、模拟增益、曲线映射和高光余量。
- RAW 是处理状态与数据契约，不等于无处理、无压缩、线性、完整传感器转储
  或任意可逆。每种 RAW 结论必须说明马赛克状态、位深、压缩、黑电平、白
  电平和已烘焙处理。

## 3. 传感器与计算摄影

- BSI、堆栈、片上 ADC、全局快门、双转换增益、双增益读出、LOFIC、DOL/
  staggered HDR 和多帧合成分别处理，不按缩写相似性合并。
- 解释多帧算法时必须给出单帧噪声模型、配准假设、融合权重以及运动、饱和、
  鬼影和时域伪影边界。
- 厂商技术材料可证明某项具体实现存在，不能单独证明同类产品的普遍性能。

## 4. 镜头与成像质量

- 几何光学公式写明近轴条件；波动光学公式写明标量、相干性和傅里叶约定。
- 必须区分光线像差、波像差、点扩散函数、OTF、MTF、采样 MTF 与经过锐化的
  输出响应。
- MTF 曲线必须说明空间频率、像高、方向、光圈、波长/光谱、物距，以及是
  设计值还是实测值。单条低频曲线不称为“分辨率”。
- 树脂、玻璃、萤石、ED/UD、异常部分色散、非球面和衍射光学元件按材料参数
  与光学作用解释，不按产品等级排序。
- 镜头与传感器的系统分辨率不得用像素数或镜头 MTF 单独决定；应讨论卷积、
  采样、混叠、去马赛克和处理链。

## 5. 写作与验证

- 中文叙述，英文术语首次出现时括注。定义、命题、推导、例子和练习采用稳定编号。
- 每章至少包含一个从输入数据到结论的完整计算或器材规格审读案例。
- 非平凡数学结论给出证明；大型光学、半导体或标准化结果作为外部输入，登记于
  `SOURCES.md` 和 `CHAPTER_SOURCE_NOTES.md`。
- 每个编号练习必须在 `SOLUTIONS.md` 中有对应答案；全书符号同步到
  `NOTATION.md`。
- 技术机制、时序、光路和解析曲线优先使用可复现 SVG，不用生成式图片代替可计算
  几何。每幅图必须有章节内编号、相邻图注、单位或适用边界，并明确“示意”与
  “实测”的区别。
- 图版由 `figures/generate_figures.py` 确定性生成；修改生成器后必须重新生成全部
  SVG，并由 `validate.py` 检查图版清单、XML 结构和正文引用双射。
- 修改后运行 `python3 books/audit_oet_rigor.py photographic-imaging-science --strict`、
  `python3 books/audit_textbook_narrative.py photographic-imaging-science --strict`、
  `python3 books/photographic-imaging-science/figures/generate_figures.py`、
  `python3 books/photographic-imaging-science/validate.py` 与
  `git diff --check -- books/photographic-imaging-science`。
