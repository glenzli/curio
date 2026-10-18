# 摄影成像科学：展示与互动的逐章安排

这份记录按正文问题、现有图版和可检验模型选择演示形式，供持续改稿使用。
需要比较条件时让读者操作；需要看清顺序时采用分步展示或可暂停回放；定义、材料
分类与规格审读保留表格和静态图。覆盖章节不等于每个概念都应再加一个组件。

## 本轮完成的范围

全书现有 **30 个组件、32 处章节插入**，17 章正文均至少有一处演示。本轮补上双波长 PSF/OTF 合成与光阑两侧瞳成像，原有第12、13章单色波动模型继续保留。
所有组件接入可选实验会话：保存参数、随机种子、预设和播放步骤，恢复后暂停；平场和镀膜
各页签分别保存。参与讨论的组件提供参数、读数、单位和模型条件的打开时快照。
25个阅读页面、48幅编号技术图、62道练习与答案保持原编号，另有九张无编号静态回退。

双波长主路径使用 Airy 密度、圆盘重叠 OTF 和位移相位；连续瞳积分与直接重叠积分独立对照。
瞳主路径用共轭矩阵，独立有向光线求交检验位置与带符号放大率。两组模型均保留有限数值误差
和无穷远边界，未引入真实相机数据或完整镜头处方。状态存储由阅读器管理，学科模型仍在本书。

## 逐章安排

| 章节 | 本轮与已有演示 | 适合继续补的内容与形式 |
| --- | --- | --- |
| [0 序章](00_preface_scope_and_measurement.md) | 成像链总览图与两条阅读路线。 | **分步展示**：选中一段处理链时标出输入、输出和单位，链接到该章。无需自动循环播放所有环节，也不把 DN、曝光量和显示亮度共用一条无单位刻度。 |
| [1 辐射度学](01_radiometry_aperture_and_exposure.md) | 新增 `exposure`：均匀背景的光子积累和独立的匀速点轨迹；圆锥积分对照解析值。等曝光预设使用相同有限角模型。 | **几何展示**：把离轴出瞳投影、距离和接收面余弦依次展开，解释 cos⁴θ；先画清适用几何，再考虑可调角度。近摄工作 f 数已可比较。 |
| [2 光子与像素](02_photons_silicon_and_pixels.md) | `pixel` 的 4T/CDS 门控、PPD/FD 电荷与两次采样共用时序。 | **计数动画**：先由 Poisson 到达，再按 QE 独立保留事件，显示稀疏化前后的直方图。检验均值和方差均为 ηµ，区分“固定入射数后作二项选择”与随机 Poisson 到达；不画虚构硅内轨迹。 |
| [3 CMOS 与 ADC](03_cmos_pixels_readout_and_adc.md) | `readout` 比较增益位置、码阶与两种饱和端。 | **时序展示**：单斜坡电压、比较器交叉时刻和计数器同步推进，对照完整扫描的 2ᵇ 时钟数。固定电压范围和时钟，不把这一种架构的速度直接套到所有 ADC。 |
| [4 噪声与动态范围](04_noise_snr_full_well_and_dynamic_range.md) | `noise`、PTC、行列随机效应与有限暗场校准保留观测、拟合和生成真值。 | **实验比较**：温度或时间漂移后复用旧校准，分别看偏差与随机方差；先声明合成漂移律。实际温度倍增率需要器件数据。动态范围可再加不同 SNR 下端的阈值探针。 |
| [5 ISO 与增益](05_iso_exposure_index_and_gain.md) | 新增 `iso`：固定曝光/少收光两条比较路径，LCG/HCG 与模拟增益分开；1024 次观测统计另与电子域真值核对。 | **成对时序展示**：同一电荷的双增益读数共用一份 Poisson 涨落，和两次独立曝光并列。验收需要展示协方差，不能给共享光子凭空增加 √2 收益。 |
| [6 快门与传感器结构](06_shutters_bsi_stacking_and_curved_sensors.md) | 滚动/全局共轴时间窗、运动积分与频闪已具备回放。 | **结构展示**：FSI、BSI、逻辑堆栈用分层展开图说明入光侧和布线位置；结构图不联动虚构画质分数。曲面传感器先复用第13章焦面模型，再考虑匹配两方向焦面的比较。 |
| [7 色彩与采样](07_color_filter_sampling_and_demosaicing.md) | 一维 `sampling` 与二维 `bayer` 保留方向、孔径积分、倒格、起点相位及双线性观测。 | **光谱展示与局部实验**：先用四个光谱区间构造同 RGB、异光谱的例子，再显示白平衡的均值与协方差传播。若加入人眼 XYZ 对照，应使用可追溯配色函数；彩色纹理再与中性纹理分开测试。 |
| [8 多帧与 HDR](08_computational_exposure_and_hdr.md) | `hdr` 从观测估计全局水平位移，真值配准与失败状态另列。 | **二维实验**：固定共同支持的二维平移，再到局部块、遮挡和非共同运动；给误差图及不可辨识区域。下一步要估计权重，不能把未知场景的理想方差继续当实测量。 |
| [9 Gamma、Log 与显示](09_gamma_log_exposure_index_and_display.md) | `encoding` 比较同显示变换下的编码、量化、反解和白点裁切。 | **分步展示**：分别移动 EI 元数据与实际曝光，沿电子、编码、中灰和显示四层追踪变化。用独立教学曲线说明机制；涉及厂商曲线时固定版本与码域，保留编码上限。 |
| [10 RAW 与压缩](10_still_raw_video_raw_and_compression.md) | 新增 `raw`：12-bit 打包/解包回放、错误半字节顺序、预先丢位、有符号归一化和样本载荷。位串重排作为独立对照。 | **可展开的真实样本**：用许可明确的微型 DNG 展开 CFA、黑白电平、线性化、处理状态和码流。解码后的样本需逐码比对；真正编解码器的无损性与压缩率不能由这次教学打包推出。 |
| [11 几何光学](11_geometrical_optics_and_paraxial_systems.md) | `paraxial` 比较矩阵与逐面倾角；有效焦距、BFD、主平面与有限共轭分别读数。 | 已补 `pupils` 的两侧实/虚瞳像、无穷远和分步构图；下一步再用实际孔径决定截光。第16章的远心实验可作边界对照。厚镜片需加入玻璃内传播。 |
| [12 衍射与 MTF](12_diffraction_psf_otf_mtf_and_sampling.md) | 新增 `pupil` 的复瞳→相量→PSF→复 OTF 回放；与 `mtf` 的像素孔径读法连接。 | 已补 `spectrum` 的双波长强度与复 OTF 合成，保留单色和相位抵消对照；下一步再考虑轴向色差与更多谱线。 |
| [13 像差与像场](13_aberrations_and_field_behavior.md) | 新增 `wavefront` 的四项 Zernike 模式、固定轴上比、离焦扫描及复 OTF；`field` 继续作为全像场的椭圆 Gaussian 教学模型。 | **下一步区分不同优化目标**：在声明的波前模型中比较最大轴上值、固定频率 MTF 和最佳焦面；畸变仍另作几何网格映射，不从局部 PSF 推出全场形变。 |
| [14 材料与色散](14_optical_materials_glass_resin_and_fluorite.md) | `achromat` 采用 N-BK7/N-F2 Sellmeier 目录，保留 F/C 自动配比、同材料无解及残余谱线。 | **光谱与材料展示**：突出部分色散残差，再考虑有目录依据的第三材料；温漂分别画 dn/dT、曲率和镜筒伸长。材料分类与制造工艺保留静态比较，不做材料等级打分。 |
| [15 非球面、PF 与镀膜](15_aspheres_fresnel_diffractive_optics_and_coatings.md) | `pf`、单层和多层膜已独立核对 Fourier 系数、矩阵与界面递推。 | **相位与偏振比较**：非球面先展示矢高差与斜率，避免只放大表面形状；膜层下一步加入斜入射 s/p 导纳与材料色散，复核 Snell、能流与全反射边界。不要仅把现有正入射曲线旋转。 |
| [16 镜头结构](16_lens_architectures_focus_zoom_and_stabilization.md) | 本轮补 `floating`、`dof` 和3D光锥读数；与变焦补偿、防抖、远心、两薄组光路合计七处演示。 | **组织现有回放**：围绕固定像面、固定远景方向和物点距离做短的引导序列。若演示浮动组真正校正近摄像差，必须另有明确处方或波像差模型；当前双约束只证明一阶对焦与尺度补偿。 |
| [17 系统测试](17_lens_testing_and_system_analysis.md) | `edge` 由观测拟合边缘，再作 ESF/LSF/DFT；与 `field` 共用局部像场读法。 | **测量流程展示**：对焦包围、共同/各自最佳焦面、四角和重复装夹分别看。以有来源的输入或声明参数的合成场景显示误差层次；把拟合残差与结果置信区间分开，不用单条 MTF 自动诊断镜头偏心。 |

附录 A 连接到噪声、加权融合与 Fourier 演示的同一模型；附录 B 先保持公式表，
下一步可提供带单位的换算器。答案、符号和资料页保持参考用途，不添加无关回放。

## 后续实施次序与进入条件

1. **第12、13章的单色波动链已接入**。共享模型具备复瞳、PSF、复 OTF 与四种明确
   定义的模式；FFT 与非周期直接瞳相关、连续圆瞳积分及纯离焦精确值互核。下一步
   双波长合成已补齐；后续可扩展遮挡或振幅加权，避免直接沿用完整均匀圆瞳的 RMS。
2. **光谱和二维观测**。第7章的同色异谱例子先用声明的响应函数，第8章从纯二维
   平移开始；两个模型都先保留不可辨识和失败样例，再接入真实数据。
3. **结构与时序展示**。第3章的单斜坡、第5章的共享光子双读出和第6章的分层结构，
   适合短的可暂停展示。用真实连接或声明拓扑说明顺序，不增加无意义的调参面板。
4. **真实输入与完整处方**。DNG、厚镜片、斜入射有色散膜层各有自己的数据与计算
   合约，完成小样本对照后再替换部分教学输入。现有合成样例继续保留作回归真值。

## 动画与三维的使用

曝光时序、采样、码阶和频谱以二维 SVG、Canvas 与可暂停时间轴为主。三维优先用于
焦面、入瞳/出瞳、远心性、镜组运动或光束遮挡等空间关系。现有 Three.js 对焦实验
可以继续扩展，但不能用薄透镜几何光束替代衍射 PSF，也不能从几条装饰性光线推断
镜头的实际像差。

每个组件保留静态图、单位、模型参数与数值读数。播放由读者启动，页面隐藏或组件
离开视区时暂停，切章后释放计时器与图形资源。涉及随机观测时固定种子，并提供
重新采样；涉及计算曲线时检验解析边界和数值积分，而不是只检查滑块能否移动。

## 状态恢复与讨论

会话值不包含 FFT 数组或图像，只保存可重建的参数。公共展示层夹紧滑块范围，模式标志、
种子和播放位置随同保存；恢复后不自动播放。噪声与三维对焦保留各自的状态适配。
“讨论这个实验”展示并冻结当前参数及读数，切换到静态图不丢弃实验参数。

## 本轮模型与复核入口

- [双波长模型](interactives/spectrum/model.js)与[检验](interactives/spectrum/model.test.js)：同一物理坐标的强度/复 OTF 合成、空间相位抵消、独立连续瞳与重叠积分、PSF径向能量及单色端点。
- [瞳成像模型](interactives/pupils/model.js)与[检验](interactives/pupils/model.test.js)：实虚像、放大率正倒、逐面求交、无穷远、零光焦度和入瞳 f 数。

- [波动传播模型](interactives/wave/model.js)：第12、13章共用的标量复瞳、二维 FFT、PSF 和复 OTF；[检验](interactives/wave/model.test.js)覆盖独立 DFT、Airy、圆盘重叠、直接自相关、Parseval、物理单位、补零与瞳网格、连续积分、纯离焦、倾斜相位符号及彗差镜像。
  [静态图生成](interactives/wave/generate-fallbacks.js)保留相同输入与显示映射。

- [浮动对焦与呼吸](interactives/floating/model.js)：逐面双约束求解与独立二次消元；
  [检验](interactives/floating/model.test.js)覆盖完整行程、固定远景、焦距变化和无解停止。
- [景深](interactives/dof/model.js)：边缘光线二分近远界/超焦距与解析真值；
  [检验](interactives/dof/model.test.js)覆盖 H/2、∞和判据变化，另有[三维光锥对照](interactives/focus/model.test.js)。
- [曝光积累](interactives/exposure/model.js)：出瞳圆锥数值积分、SI 光子能量与匀速轨迹；
  [检验](interactives/exposure/model.test.js)覆盖有限角修正、精确等曝光、近摄和播放端点。
- [ISO 比较](interactives/iso/model.js)：电压域传播、Poisson 观测与只读样本统计；
  [检验](interactives/iso/model.test.js)覆盖电子域真值、曝光代价、转换增益、负值和裁切。
- [RAW 字节](interactives/raw/model.js)：移位打包、独立位串重排及解码约定；
  [检验](interactives/raw/model.test.js)覆盖全部12-bit单样本与边界搭配、丢位、归一化和码率。

- [读出模型](interactives/readout/model.js)：固定满阱与 ADC 电压跨度，区间中点重建；
  [检验](interactives/readout/model.test.js)覆盖半步长误差、两种饱和边界及数字增益。
- [快门模型](interactives/shutter/model.js)：矩形曝光积分与正弦照明平均；
  [检验](interactives/shutter/model.test.js)覆盖 207.264 px 例子、全局曝光、整数周期与积分守恒。
- [编码模型](interactives/encoding/model.js)：线性、Gamma 2.2 与 C¹ 拼接教学 Log；
  [检验](interactives/encoding/model.test.js)覆盖端点、单调可逆、toe 导数及编码前剪切。
- [HDR 模型](interactives/hdr/model.js)与[位移估计](interactives/hdr/registration.js)：曝光预算、观测配准及阈值去鬼影；
  [检验](interactives/hdr/model.test.js)另覆盖正负位移、无真值字段输入、边界/无纹理/重复纹理失败及含噪相关搜索。
- [斜边模型](interactives/edge/model.js)与[几何拟合](interactives/edge/geometry.js)：行质心、直边拟合、投影、分箱、差分、窗口和 DFT；
  [检验](interactives/edge/model.test.js)另覆盖角度/相位恢复、污染真值字段、低对比停止、弯边残差及两种几何的独立 MTF。
- [平场模型](interactives/flatfield/model.js)：Poisson 平场、固定响应、中心化成对差分与观测拟合；
  [检验](interactives/flatfield/model.test.js)覆盖方差的二倍关系、DN 刻度、无生成参数拟合、PRNU 与漂移、饱和污染和固定图样保留。
- [相关校准模型](interactives/flatfield/calibration.js)：像素、行、列噪声、观测方差分解及同一有限暗场的复用；
  [检验](interactives/flatfield/calibration.test.js)覆盖空间平均尺度、暗场协方差与下限、独立重拍、前缀平均及真值不进入观测分析。该组检验由现有平场模型测试入口载入。
- [Bayer 模型](interactives/bayer/model.js)：同色采样格、倒格、起点相位、方形孔径和双线性插值；
  [检验](interactives/bayer/model.test.js)覆盖方向边界、同样点等价、边界相位消失、二维积分及仿射通道重建。
- [4T/CDS 模型](interactives/pixel/model.js)：共享时序、电荷转移、线性 FD 和独立采样误差；
  [检验](interactives/pixel/model.test.js)覆盖电荷守恒、复位偏移消除、SI 单位及重复读出的理论方差。
- [消色差模型](interactives/achromat/model.js)：目录 Sellmeier 色散与接触薄片光焦度；
  [检验](interactives/achromat/model.test.js)独立对照目录谱线、Abbe 数、F/C 同焦和相同材料退化。
- [PF 模型](interactives/pf/model.js)：等宽相位屏的逐段精确 Fourier 系数与独立中点积分；
  [检验](interactives/pf/model.test.js)覆盖 2/4/8 级设计真值、非设计波长、零相位、级次选择、Parseval 收敛及连续极限。
- [近轴镜组模型](interactives/paraxial/model.js)：两薄组矩阵、主平面、有限共轭及直接倾角追迹；
  [检验](interactives/paraxial/model.test.js)覆盖课本望远例、反望远、主平面重建、无焦/有限物点、虚像及 50 mm 对焦 2 m。
- [多层膜模型](interactives/multilayer/model.js)：特征矩阵与独立界面递推，另保留四分之一波导纳解析真值；
  [检验](interactives/multilayer/model.test.js)覆盖复振幅、空层、单层回归、反序、互易、厚度尺度、能量守恒与失配。
- [变焦模型](interactives/zoom/model.js)：三组矩阵、独立逐面求根与二次方程；
  [检验](interactives/zoom/model.test.js)覆盖线性退化、完整行程、无解停止、固定像面与矩阵方向。
- [防抖模型](interactives/stabilization/model.js)：去心薄组、传感器参考中心及完整正弦周期；
  [检验](interactives/stabilization/model.test.js)覆盖25像素例子、协同/重复补偿、延迟、零输入与独立RMS积分。
- [远心模型](interactives/telecentric/model.js)：矩阵选取过光阑中心的主光线，再逐面追迹；
  [检验](interactives/telecentric/model.test.js)覆盖瞳共轭、单侧/双侧远心、轴上分类、离焦尺度和退化光阑条件。
- [增透膜模型](interactives/coating/model.js)：精确单层反射、透射与复振幅分解；
  [检验](interactives/coating/model.test.js)独立对照特征矩阵，并覆盖零膜厚、折射率匹配、四分之一波与能量守恒。

快门时序还可对照 [Basler 的电子快门说明](https://docs.baslerweb.com/electronic-shutter-types)。
厂商 Log 曲线则应查具体规范，例如 [ARRI LogC4 规范](https://www.arri.com/resource/blob/278790/f3318e8c9c65617d8c5ca3f8b3e32051/2023-05-arri-logc4-specification-data.pdf)；
本轮的教学 Log 与该规范的硬件编码、相对白点和码域参数不同。
