# 全书展示分析与模型复核

本轮检查序章、17章正文、两篇附录和参考页，按“读者需要比较什么、已有图是否足够、
新增量是否有可核对模型”选择内容。此前选定的14个新组件与三组图像、统计展示已完成，
随后补入亚像素重建、双反射鬼影和等面积光阑的离焦点像，本批再补列条带、重复PTC
与多频Bayer纹理，现为 **65个组件、73处插入、44张无编号静态回退**。25个阅读页面、48幅编号图保留；原62道练习与答案
编号不变，教学整理另补8道实验题，当前合计70题。
科学模型仍由本书持有，Markdown Book继续负责阅读、构建、状态恢复和讨论上下文。

## 逐章判断与本轮结果

| 章节 | 需要加强的地方 | 本轮处理与对照 |
| --- | --- | --- |
| [0 序章](00_preface_scope_and_measurement.md) | 成像链的单位易混淆。 | 新增`signal-chain`分步展示，同次曝光的能量、光子、电子、电压、DN和显示各自保留单位；完整曝光均值不随回放重新生成。 |
| [1 辐射度学](01_radiometry_aperture_and_exposure.md) | 光子预算、运动和有限瞳规律需要连起来读。 | 复用`exposure/offaxis`，补等曝光与小瞳极限的阅读顺序；保留圆锥、面积分、圆周解析和Gardner表值。真实瞳畸变不由教学曲线代替。 |
| [2 光子与像素](02_photons_silicon_and_pixels.md) | 吸收并不等于收集。 | 新增`absorption`，入口失效层、指数吸收与收集概率分开；闭式、分层存活差分与理想端点互核。穿透长度直接指定，不伪造硅波长数据。 |
| [3 CMOS与ADC](03_cmos_pixels_readout_and_adc.md) | 电荷、比较器交叉、时钟锁存、列校准易混用。 | 复用原列ADC，新增`column-stripes`二维观测与校准残差。稳定参考列、观测估计和无偏置真值分开；逐行核对不是时序模拟。 |
| [4 噪声与动态范围](04_noise_snr_full_well_and_dynamic_range.md) | 有限校准复用后又发生漂移；PTC参数散布与DR下端判据。 | 保留`calibration-drift`与原PTC，新增`ptc-repeat`重复24套采集；空间方差、成对差分、参数样本标准差及生成真值分开，筛选与拟合复用观测。 |
| [5 ISO与增益](05_iso_exposure_index_and_gain.md) | ISO、共享双读出、EI比较条件。 | 复用`iso/dual-readout/ei-monitor`，补固定曝光→共享光子→增益位置的顺序。无实测资料时不增加品牌模式优劣图。 |
| [6 快门与结构](06_shutters_bsi_stacking_and_curved_sensors.md) | 曲面传感器必须针对具体两方向焦面。 | 新增`focus-survey`，给定场曲、像散、倾斜和传感器曲率；固定平面与各点最佳分别报告。Gaussian替代模型不声称器件性能。 |
| [7 颜色与采样](07_color_filter_sampling_and_demosaicing.md) | 多方向纹理混叠与插值噪声相关。 | `bayer-texture`叠加三组已知频率，逐项折返核对全部CFA观测；共同内部比较真值、插值和等价图。保留`demosaic-noise`的全协方差、有效源权重及重复观测对照。 |
| [8 多帧与HDR](08_computational_exposure_and_hdr.md) | 一个全局平移不能解释不同区域运动；未知方差。 | 新增`local-motion`，观测全局/局部搜索与已知位移、已知方差支路对照。固定候选支持，饱和剔除；RMSE使用三路共同有效位置。未把观测权重当固定无偏权重。 |
| [9 编码与显示](09_gamma_log_exposure_index_and_display.md) | 高光压缩、量化合并、捕获裁切。 | 新增`tone-map`，明确C¹指数肩部、显式逆与有限白码；捕获白点、显示增益及Gamma分层。原EI实验仍保留硬白点以便比较。 |
| [10 RAW](10_still_raw_video_raw_and_compression.md) | 从标签走到实际文件字节。 | 新增`dng-inspector`和可下载32×32合成DNG；CFA、IFD、字节序、黑白电平与全部1024样本核对。LibRaw独立逐码检查通过；不声称通用解码或真实色度标定。 |
| [11 几何光学](11_geometrical_optics_and_paraxial_systems.md) | 厚系统例子需要玻璃内传播。 | 新增`thick-lens`：两曲面近轴折射、d/n传播，矩阵/厚制镜者公式/逐面倾角互核；保留主平面与BFD、零厚度端点。原两薄组和截光不被替换。 |
| [12 衍射](12_diffraction_psf_otf_mtf_and_sampling.md) | 双谱线横向错位之外的轴向色差。 | 新增`chromatic-focus`：三线PSF按同一μm坐标合成，有符号OTF先求和；轴上sinc²、径向复积分、1D交集、2D交集与零离焦圆盘真值互核。 |
| [13 像差与像场](13_aberrations_and_field_behavior.md) | 畸变几何和最佳焦点定义。 | 新增`distortion`网格、单调逆与Jacobian；共用`chromatic-focus`比较轴上目标和固定频率MTF目标，明确2 μm扫描精度。局部波前不被用于推断全场几何。 |
| [14 材料](14_optical_materials_glass_resin_and_fluorite.md) | 镜片温漂与镜筒伸长；部分色散残差。 | 新增`thermal-focus`，有限温差与一阶导数互核，玻璃/折射率/镜筒分开；已有N-BK7/N-F2目录的部分色散式另核直接谱线差。热参数明确是示意输入。 |
| [15 光学元件](15_aspheres_fresnel_diffractive_optics_and_coatings.md) | 非球面不能只靠放大轮廓。 | 新增`asphere`，实际μm矢高差与无量纲斜率分开，球方程/圆锥极限/有限差分互核。PF与s/p多层膜原有边界保留。 |
| [16 镜头结构](16_lens_architectures_focus_zoom_and_stabilization.md) | 七组模型需要有目的的阅读顺序。 | 补固定像面→固定远景方向→曝光RMS→模糊判据→离轴主光线的五步比较，复用已有几何和动画，不重复造镜组模型。 |
| [17 系统测试](17_lens_testing_and_system_analysis.md) | 对焦包围、四角与重复装夹。 | 共用`focus-survey`；从观测数组找格点峰，真焦点只作对照。共同/各自焦点分开，噪声下不把半步长界或残差当置信区间；不自动诊断偏心。 |
| [附录A](A_probability_fourier_and_units.md) | 把概率公式接回实验。 | 增加插值协方差、共享校准和观测依赖权重的对应链接。 |
| [附录B](B_calculation_reference.md) | 单位换算需要可代入。 | 新增`unit-calculator`：SI光子预算、lp/mm、Airy直径、SNR正根；原公式表仍可独立阅读。 |
| 符号、答案、术语、来源 | 参考页应便于检索。 | 同步局部符号、DNG规范与新模型边界；不增加无关动画。 |

## 展示之后的教学整理

序章增加全书首读/推导/实验的分层指引，并给出一组贯穿参数。第1章原有光子预算
接续到第2、3、4、5、9、10、12、17章，分别计算电子分布、量化、SNR、增益、
监看剪切、文件往返和预采样响应，最后写成合成模型报告。第16章的五步比较移至
章首，完整推导和原有章节编号保留。

新增练习4.5、6.4、7.4、8.4、13.5、14.5、15.5、17.5及逐题答案。每题先预测，
再控制参数或手算，最后解释与生成真值的关系；无需脚本也能完成主要计算。
第7章白平衡输入明确为线性、已减黑值，固定增益的噪声传播另声明估计误差边界。
第13章区分固定像面的Strehl峰值比与固定原点轴上比S₀，演示和式(13.3)继续使用S₀。
第4章SNR下限只保留式(4.6a)的一次推导，漂移偏置另记δ。

局部HDR只增加评价范围的读数，未改变估计与融合模型：共同有效位置、各支路有效
数和空交集提示同时显示。固定题设下曝光比4、7、8分别为88/88、78/88、0/88；
最后一种仍有66个已知位移支路有效位置。静态回退同样显示默认状态的88/88。

## 新模型入口与独立参考

每个目录均有`model.js`、`model.test.js`、`lesson.js`、`index.js`与`fallback.svg`。
公共`common/lesson*.js`只负责绘图、读数与会话接入，学科计算不集中到公共层。
[generate-lessons.mjs](interactives/generate-lessons.mjs)确定性生成本轮14张回退图和DNG。

- [吸收](interactives/absorption/model.js)、[漂移](interactives/calibration-drift/model.js)、[插值协方差](interactives/demosaic-noise/model.js)：分别保留闭式/分层积分、已知预算/独立采集、全矩阵/有效源权重。
- [局部HDR](interactives/local-motion/model.js)、[显示肩部](interactives/tone-map/model.js)、[DNG](interactives/dng-inspector/model.js)：观测估计与生成值分离，显式逆/码区间、文件字节/生成数组/外部LibRaw分开。
- [厚镜](interactives/thick-lens/model.js)、[焦面流程](interactives/focus-survey/model.js)、[三谱线](interactives/chromatic-focus/model.js)：矩阵与逐面、声明焦点与观测扫描、闭式与不同维数的连续积分互核。
- [畸变](interactives/distortion/model.js)、[温漂](interactives/thermal-focus/model.js)、[非球面](interactives/asphere/model.js)：单调逆/差分Jacobian、有限温差/导数、圆方程/解析斜率/差分分别核对。
- [成像链](interactives/signal-chain/model.js)、[单位](interactives/unit-calculator/model.js)：固定SI常数、面积与波长换算，增益位置和捕获裁切端点单列。

## 哪些扩展需要新的外部输入

本轮选定的教学条目已实现。仍可开展的研究与器材测量不靠更多滑块补齐：

- 硅的波长/温度吸收表、DTI与横向载流子收集需要材料和器件输入；当前纵向收集律只证明该模型中的预算。
- 实际相机增益模式、漂移标定、CFA响应及XYZ需可追溯测量；教学矩阵、热参数和DNG恒等矩阵不能替代。
- 真实厚镜的大口径像差、浮动校正和广角暗角需完整处方；曲面Gaussian场不能反推出它。
- 吸收膜层、倏逝波与全反射需复折射率及正确分支，另作电磁模型。当前s/p演示明确限定无损传播波。
- 旋转、视差、遮挡分割、自适应去马赛克与压缩编解码器需新算法和输入。局部整数搜索、线性插值和未压缩DNG不扩大为这些能力。

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

## 模型与复核入口

- [列ADC误差](interactives/adc-errors/model.js)与[检验](interactives/adc-errors/model.test.js)：时钟阈值、连续交叉根、端点/单调/码宽、DNL/INL、线性整码偏置相消与曲率残差。
- [白平衡传播](interactives/white-balance/model.js)与[检验](interactives/white-balance/model.test.js)：均值/标准差/SNR、相关性、矩阵与独立源展开、N−1统计、种子复用和有限样本协方差。
- [EI监看链](interactives/ei-monitor/model.js)与[检验](interactives/ei-monitor/model.test.js)：固定曝光/按表少曝、编码前增益、物理档位、文件/监看/传感器白点和有限码区间。

- [离轴照度](interactives/offaxis/model.js)与[检验](interactives/offaxis/model.test.js)：等面积中点积分、独立圆周闭式、径向积分、轴上锥角、小瞳极限与Gardner表值。
- [孔径截光](interactives/apertures/model.js)与[检验](interactives/apertures/model.test.js)：逐面两横向坐标、首次遮挡、独立ABCD圆盘、圆弧面积、光线格收敛、镜像和限制面转移。
- [斜入射镀膜](interactives/oblique-coating/model.js)与[检验](interactives/oblique-coating/model.test.js)：s/p矩阵和完整电场递推、Snell、独立能流、Brewster、零膜厚、理想匹配及互易性；明确拒绝临界角和倏逝波。

- [传感器结构](interactives/sensor-stack/model.js)与[检验](interactives/sensor-stack/model.test.js)：入光侧和堆栈两维独立，层片顺序、功能晶圆、光电路径与独立参照核对；故意翻层和断开互连能触发不一致。
- [同色异谱](interactives/metamerism/model.js)与[检验](interactives/metamerism/model.test.js)：非负反射率、四波段零方向、照明/响应改变、点积与独立波长积分，保留相机/人眼边界。
- [二维配准](interactives/registration2d/model.js)与[检验](interactives/registration2d/model.test.js)：观测搜索、固定共同支持、整数真值、亚像素插值误差、符号、缺失像素、均匀/单向/重复/遮挡/边界失败。

- [光子计数](interactives/counting/model.js)与[检验](interactives/counting/model.test.js)：指数到达、固定总数、独立QE标记、PMF递推/卷积、直接混合求和、全方差及保留/舍弃计数协方差。
- [单斜坡ADC](interactives/ramp-adc/model.js)与[检验](interactives/ramp-adc/model.test.js)：交叉时刻、锁存边沿、完整扫描与独立区间搜索，逐码覆盖阈值、区间中点和量程外输入。
- [双增益读出](interactives/dual-readout/model.js)与[检验](interactives/dual-readout/model.test.js)：噪声源路径矩阵、条件协方差、最优固定权重、真实Poisson成对观测、独立曝光的采光代价、负值和截顶回退。

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

## 后续展示复查（2026-10-18）

本次重新对照序章、17章和附录的正文与组件入口。复查时已有56个组件、61处插入，多数基础机制已经能操作或回放。下列前三项
已在后续批次实现并计入当前数量，其余逐章建议仍为候选。

### 已实现的三项

1. **第12、13章：PSF作用于一幅已知图案。** 现有复瞳、点像、复OTF和正弦条纹
   都保留，再放入具有明确像面尺度的二维点阵、细线与文字形状。依次显示输入、
   PSF卷积、像素面积积分和采样，帮助读者把不对称点像与实际纹理联系起来。
   限定局部线性、空间不变、非相干模型；线性强度参与计算，显示编码最后处理。
   空间直接卷积与Fourier乘积互核，检查单位积分、常量输入和边界填充；截断PSF
   的能量误差单列。不能把局部PSF直接铺到整幅存在场变像差的照片上。
2. **第5、9、10章：同一合成场景的捕获与监看。** 在现有EI、编码和肩部曲线旁，
   增加明暗区域与细纹理组成的已知线性图像。分步比较捕获剪切、记录前增益、
   解码后曝光及显示肩部；探针同时读场景值、记录码和显示值。逐像素复用现有
   标量模型，不另造厂商Log。降下监看曝光时，已经合并的捕获值仍须相同。
   默认状态保留可复算静态图；记录裁切与仅监看变白采用明确的对照预设。
3. **第17章：重复拍摄、重新装夹和换样品。** 在第17.6.1节三层变异的文字说明后，
   增加已知输入的分组采样动画，分别增加同一装夹的帧数、
   装夹次数和样品数；并列显示生成方差、观测统计量和相同装夹内的相关性。
   另用重复对焦包围比较观测最大值与生成峰值，显示选择峰值可能带来的偏差。
   固定种子，保留独立重复试验；当前只报告原始矩估计、均值标准差和观测标准误。
   置信区间仍未实现，需要另行声明总体、估计方法与覆盖率检验。

### 逐章取舍

| 章节 | 本次判断与可选方向 |
| --- | --- |
| 序章、1章 | 现有成像链与曝光预算已够用。后续可让贯穿算例的输入卡带到相关实验，始终显示哪些参数被沿用、哪些只是本章替代模型。 |
| 2、3章 | 保留4T/CDS、斜坡扫描与非线性列校准。列误差可增加二维DN图及行/列剖面，复用同一数组，让条带位置与校准残差对应；无需再做一遍ADC动画。 |
| 4章 | PTC、行列相关、有限暗场和漂移已有对照。可以叠加多次独立采集的结果，显示估计散布；先检查当前观测定义，避免把空间散布当时间噪声。 |
| 5章 | 与第9、10章共用上述合成场景；固定曝光、按EI改变实际曝光、仅监看补偿三种比较仍分开。 |
| 6章 | 时序、平移形变、频闪、结构和曲面焦面已有展示。旋转杆的曝光动画可作为扩展，但需对每一行的整个曝光窗口积分，不能只用某时刻位置画出“螺旋桨”。 |
| 7章 | Bayer目前已有二维方向边界、相位和插值图。可扩展为多频或扫频的已知图案；复用原采样坐标和显示尺度，保留单频例子作为数值基准。 |
| 8章 | 配准和局部HDR已覆盖主要操作。第8.5节的亚像素多帧重建仍值得独立演示：比较重复同相位与不同相位的观测；先做可辨识的一维带限模型，明确光学与像素零响应仍是限制。 |
| 9、10章 | 已补上述捕获—记录—监看图像。DNG字节检查和打包已可复核；真实RAW压缩、视频时序或品牌解码流程需要另行取得输入与规范。 |
| 11章 | 瞳、截光和厚透镜已有足够光路。可把同一光束的空间路径、孔径截面和被挡比例联动，减少读者在几幅图之间找对应位置的负担。 |
| 12、13章 | 已补二维卷积图像。第13.7节还可补焦前/焦后PSF与声明的光阑形状；使用现有标量波动模型，不能从几何光锥宣称洋葱圈或实际镜头散景。 |
| 14章 | 消色差与温漂已有动画和数值。材料目录、部分色散和适用波段更适合保留图表；没有可靠材料数据时，不增加材料“优劣”动画。 |
| 15章 | 第15.6节鬼影目前主要靠文字，值得做两次反射的分步光路。先给一个完整、明确的教学处方，逐路径核对方向和通量；散射光幕需要额外的散射模型，不由几条反射线代替。 |
| 16章 | 七组结构实验已经较密集。优先把固定像面、镜组位置和构图标尺放在同一播放进度中；保留手动停点与无解停止，不再增加重复镜组。 |
| 17章 | 已补分组重复实验和选择峰值偏差。斜边与焦面已有完整流程，后续扩展应解释测量的不确定性。 |
| 附录及参考页 | 概率、Fourier和单位换算继续为正文提供检验入口；公式表、符号和来源以可检索静态内容为主。 |

每一项若进入实现，都要保留真值支路、默认静态图、输入单位、种子或数据来源，
并接入暂停恢复与实验讨论。二维图像需要统一显示范围和线性域误差，动画需要
可暂停、可逐步复查；Three.js只用于确实需要空间位置关系的图，不承担数值真值。

### 本批模型与检验入口

- [二维卷积](interactives/psf-image/model.js)：复用标量复瞳，固定550 nm、f/8及1.1 μm像面网格，截取33×33有限核；线性卷积足量补零，空间求和独立核对，面积采样保持同一视场。测试覆盖非对称核方向、边缘无回绕、完整能量与裁剪、常量内部、像素分区和彗差镜像。
- [捕获与监看](interactives/capture-scene/model.js)：复用EI和肩部模型，固定288×192单色窗边静物；枝叶、帘褶、暗色织物和杯沿高光各有指定EV。六幅图按捕获、编码与监看、降低监看与真值分组，静态图共用相同无损灰阶。测试核对记录链、监看不改码值、满阱和Log裁切不可恢复、有限码与曝光规则，以及旧探针位置向细网格的映射。
- [重复实验](interactives/repeatability/model.js)：三层独立Gaussian随机效应，观测专用ANOVA、有限负矩估计、分组标准误与已知预算；独立完整采集另核均值分布。对焦候选9/17/33为嵌套网格，同位置噪声复用，选中后独立复测，真实峰值不参与选择。

公共层仅增加[灰阶图像绘制](interactives/common/image-view.js)和可选静态图高度；科学模型仍各自持有。三组默认静态图统一由[生成入口](interactives/generate-lessons.mjs)确定性生成。跨章共用组件采用相同默认值，读者参数仍按章节分别保存，不暗中覆盖另一章的实验。

已完成的数值、构建与实际阅读验证，以及原生面板自动化的本次限制，见[本批核验记录](CONTENT_CLOSURE_AUDIT.md#2026-10-18二维图像捕获场景与重复统计)。窄屏下图像逐幅排列，静态回退保留完整对照版式。

## 末轮复查：剩余内容的优先级（2026-10-18）

此前对照67处组件入口时选定的三项，已在本批分别补齐。它们独立计算新的观测或
光路，不把已有配准、PSF卷积或镀膜动画算作替代；当前合计70处入口。

| 顺序 | 正文已有内容 | 已补展示与对照 |
| --- | --- | --- |
| 1 | [第8.5节：亚像素多帧超分辨率](08_computational_exposure_and_hdr.md#85-为什么计算合成也会造细节) | `subpixel`以33维实Fourier图案显示输入、像素积分观测、估计/已知位移重建与残差；逐帧动画，数值秩33、重复帧秩16、孔径零点秩31。光学模糊、独立观测噪声、配准偏差和正则化分别控制。空间积分和任意合成系数另核前向模型与求解器。 |
| 2 | [第15.6节：鬼影与光幕](15_aspheres_fresnel_diffractive_optics_and_coatings.md#156-鬼影与-veiling-flare) | `ghost`给出四球面两片处方与空气光阑，逐段播放三种指定双反射组合，保留途中全部透射、真实方向、孔径截断和s/p功率。球面轴上极限对照独立近轴矩阵，正入射乘积另核通量。只计算等权子午光束，散射光幕仍在范围外。 |
| 3 | [第13.7节：离焦点像与光阑形状](13_aberrations_and_field_behavior.md#137-散景与像差不是一个分数) | `defocus`比较圆、六边形、五边形和方形，连续面积固定为π；并列焦点两侧与可扫描像面。共同1.1 μm步长、89.1 μm视场及固定白点，裁剪能量单列。复瞳FFT对照独立相量和、连续极坐标积分、Airy/sinc极限及网格加密；五边形中心反转另测。 |

三项均提供默认SVG，逐帧/路径步骤/离焦扫描的动画恢复后暂停，讨论快照包含参数、
单位、读数与模型边界。共用控件与回放生命周期没有改动，科学模型全部留在书籍
仓库。完整验证及原生协议、网页实操的区分见
[本批记录](CONTENT_CLOSURE_AUDIT.md#2026-10-18亚像素重建双反射与等面积离焦点像)。

## 列条带、PTC散布与多频采样（2026-10-18）

上述复查提出的三项已补齐，新增3个组件和3处入口；原单频、单次PTC与列ADC演示
保留，作为可分别复核的基准。

- [`column-stripes`](interactives/column-stripes/model.js)把原12列ADC图样重复到48×32画面，
  均匀校准帧只按列求均值并引用指定稳定列。固定−8…+8 DN误差图、全图RMS及选中
  行剖面共用数组；剪切与显示截断分别计数。独立连续斜坡二分、线性整码相消、
  校准电平端点和参考均值不变性见[检验](interactives/column-stripes/model.test.js)。
- [`ptc-repeat`](interactives/ptc-repeat/model.js)复用每套16个信号级的平场采集，固定
  ROI响应图样并独立生成24套噪声观测。同批观测可重选拟合范围；逐次显露估计点
  时，完整24次汇总与坐标范围不变。N−1参数散布、观测矩重算、已知增益/读噪、
  PRNU、照明漂移与饱和反例见[检验](interactives/ptc-repeat/model.test.js)。
- [`bayer-texture`](interactives/bayer-texture/model.js)保留原RGGB坐标、倒格与双线性
  观测估计，叠加三组正弦并精确计算Gaussian/像素响应。成像后等价RGB仅作样点
  不唯一的已知反例，不冒充插值结果。独立面积积分、各通道相位、显式RGGB插值
  模板和共同内部线性误差见[检验](interactives/bayer-texture/model.test.js)。

三组静态SVG与动画分别表达默认对照、逐行核对、独立采集显露和纹理平移；恢复
后保持暂停。其余章节优先继续检查文字、图注、单位及实际案例；真实器材案例仍需
原始文件、拍摄条件和可追溯的测量记录。

## 鬼影图的阅读关系与全书措辞（2026-10-18）

`ghost`的处方表、预设和光路统一使用S1–S4：S1/S2围成镜片1，S3/S4围成镜片2，
填充区域按原球面帽和净口径闭合。①②表示反射发生顺序，步骤框逐面列出透射与
反射；回放时同步显示下一界面、传播方向和中央光线的逐面记录。蓝色三个行程用
色调、线宽和返程虚线区分，灰色细虚线保留主光路；颜色与线宽承担辨识作用。

科学模型与参数未变。玻璃轮廓、逐段端点、反射前后方向和光阑截断另加检验，防止
绘图为了避开重叠而移动真实光路。全书说明同时改写反复的自我限定句，改用具体
参数、输入来源和计算范围；必要的统计定义、单位、Strehl参考与有效条件保留。
