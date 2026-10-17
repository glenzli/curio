# 逐章来源注释

本表说明外部资料在正文中的用途。书内公式能直接推导者仍给出背景专著，但证明责任
由正文承担；工艺细节、标准定义和具体厂商实现作为外部输入。

| 章节 | 主要来源 | 外部输入与边界 |
|---|---|---|
| 0 | Holst--Lomheim；Goodman | 成像链分层由本书组织；完整相机工程不在序章展开 |
| 1 | Born--Wolf；Smith | 辐射度学与近轴像面照度；实际镜头暗角需具体瞳和机械模型 |
| 2 | Fossum；Fossum--Hondongwa 2014；Janesick；Holst--Lomheim | 硅吸收、PPD 工艺为器件物理输入；Beer--Lambert、响应度和 Poisson 稀疏化书内推导；4T/CDS 互动为完整转移、线性 FD 的功能时序模型 |
| 3 | Fossum；Janesick；EMVA 1288 | 列 ADC 电路细节外置；$kT/C$、线性读出、噪声带宽和量化模型书内推导 |
| 4 | EMVA 1288 Release 4.0 Linear §§2.1--2.5，式 (16)--(18)；Janesick, *Photon Transfer* | 标准设备容差外置；互动用 N−1 样本方差及成对差分/2，PRNU 与漂移残差书内推导；不作完整合格性测试 |
| 5 | ISO 12232:2019/Amd 1:2020；Sony Base ISO；Canon DGO | 标准合格性文本不复制；增益位置模型和 DCG 权衡书内计算 |
| 6 | Sony Pregius S；Hamamatsu qCMOS；Guenter et al. 2017 | BSI/DTI/堆栈/曲面具体制造为外部输入；时序畸变书内推导 |
| 7 | Hunt--Pointer；Zhu--Finlayson 2020；DNG specification | 标准配色函数与标定实践外置；同色异谱、精确线性色度映射条件、拟合矩阵和协方差传播书内论证 |
| 8 | Hasinoff et al. 2016；Debevec--Malik 1997；Sony HF-HDR | 具体产品算法外置；独立堆栈与加权估计书内推导；互动另用观测水平梯度相关搜索，不冒充 HDR+ 的 FFT 配准 |
| 9 | ARRI LogC4 2023 §§3.1、4.1；ARRI Dynamic Range 2022 表 4；ITU-R BT.2100 | 区分硬件 EI 增益、固定解码曲线和高 EI 编码限幅；分段连续性与量化误差书内证明 |
| 10 | Adobe DNG 1.7.1.0 pp. 33、52--53、99--100；Apple ProRes RAW | 颜色矩阵方向及 RAW 线性化顺序按规范；位打包、负值裁切偏置与归一化算例书内计算 |
| 11 | Born--Wolf；Smith；Kingslake--Johnson；Ansys BFL 定义；Edmund Optics 瞳定义 | 真实处方数值追迹外置；近轴矩阵、主平面分解和厚透镜算例书内完成；光线图按近轴关系构造 |
| 12 | Goodman；Zeiss MTF notes | 标量 Fourier 模型为外部物理框架；物理瞳坐标、OTF 自相关与圆盘重叠计算在正文展开，宽谱合成注明条件 |
| 13 | Mahajan；Kingslake--Johnson；Ansys Seidel coefficients | 区分三阶光线像差与四阶波像差；Seidel/Zernike 体系为外部经典框架；RMS--Strehl 小误差关系在正文推导 |
| 14 | Nikon Research Report 2022；SCHOTT N-BK7/N-F2 数据表；Canon Fluorite；Zeon COP | 材料目录与制造性质外置；互动使用目录 Sellmeier 系数与谱线数据；接触薄片消色差和二级光谱残差书内推导，不冒充镜头处方 |
| 15 | Born--Wolf；Macleod；Nikon PF；Canon lens technologies | 具体制造外置；量化 blaze 效率与薄膜特征矩阵书内推导 |
| 16 | Smith；Kingslake--Johnson | 复杂变焦与防抖控制外置；镜组矩阵、统一超焦距约定的景深边界和运动 OTF 书内推导 |
| 17 | Burns 2000 pp. 135--136；Zeiss MTF notes；ISO 12233:2024（公开范围） | 互动采用逐行差分质心与直线拟合，并自定支持域、平滑和失败条件；二维 PSF 线积分、有限差分与尺度书内推导，不宣称完成 ISO 合格性实现 |

## 一手资料使用原则

厂商资料只支持其明确披露的实现。例如 Sony Pregius S 可作为“存在背照堆栈全局
快门结构”的来源，不能据此推出所有堆栈传感器的读噪；Nikon PF 资料可支持衍射元件
与普通折射元件色散相反及可能出现 PF flare，不能替代某支镜头的样品测试。

## 图版来源与证据等级

正文 48 幅 SVG 全部由本项目的 `figures/generate_figures.py` 原创生成，没有复制
厂商剖面图、标准测试靶或论文插图。结构图只表达层次、方向和变量关系；解析曲线由
正文模型取示意参数绘制，不作为任何相机或镜头的实测证据。图 13.1 的点列仅模拟
典型形态，未由具体镜头处方追迹；图 12.1 的环纹经亮度增强，不用于比较环纹能量。
若未来加入外部照片或实测图，必须在图注中登记器材、条件、数据处理与许可来源，
并与现有机制图分开编号。


### 互动模型的来源与边界

新增采样、MTF 与像场互动分别按第七章盒积分与频率折返、第十二章圆瞳及像素孔径公式、第十三章明确声明的椭圆 Gaussian 教学假设计算。第十七章重复使用同一像场模型以练习读图，不嵌入或拟合厂商镜头数据。图例读法对照 [Nikon 官方 MTF 说明](https://imaging.nikon.com/imaging/lineup/lens/mtf_chart/)；频率传递对照 [Edmund Optics 的 MTF 说明](https://www.edmundoptics.com/knowledge-center/application-notes/imaging/modulation-transfer-function-mtf-and-mtf-curves/)。系统性像差背景仍以本章列出的光学资料为准。

第二章互动把 PPD 电荷与 FD 读出分开，独立采样噪声不与共同复位噪声混同；固定电荷
只用于考察读出，不代表散粒噪声被消除。第十四章的连续焦移来自两种目录玻璃的完整
Sellmeier 模型，未从 Abbe 数单独猜测光谱。第十五章互动用单层精确反射与透射式，
并与正文特征矩阵逐点对照；复振幅分解中的“膜内返回”已经包含全部多次往返。

第八章位移估计只读取观测与曝光时间；模拟场景的真位移、有效标志和方差不进入
估计器。真位移另用于生成融合对照，理想方差仍只用于教学融合。第十七章拟合器只
读取像素坐标和值，两条几何路径共用观测平台归一化。第四章 PTC 的输入增益、PRNU
和读噪只用于生成及对照曲线，拟合仅用观测矩、黑白电平和声明的区间；重采样保留
固定响应图样。所有示例仍是合成数据，未新增真实器材测量或数据集。
