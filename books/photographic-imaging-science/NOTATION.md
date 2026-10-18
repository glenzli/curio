# 符号与约定

## 辐射与曝光

| 符号 | 含义 | 单位 |
|---|---|---|
| $\lambda$ | 真空波长 | m，常用 nm |
| $h$ | Planck 常数 | J s |
| $c$ | 真空光速 | m/s |
| $L_{e,\lambda}$ | 光谱辐亮度 | W m$^{-2}$ sr$^{-1}$ m$^{-1}$ |
| $L_v$ | 光度学亮度，测光模型使用 | cd/m$^2$ |
| $K_m$ | 反射式测光校正常数，单位随亮度与曝光指数约定 | 依式 (5.1) |
| $E_{e,\lambda}$ | 光谱辐照度 | W m$^{-2}$ m$^{-1}$ |
| $H_{e,\lambda}$ | 光谱曝光量，$\int E_{e,\lambda}dt$ | J m$^{-2}$ m$^{-1}$ |
| $t$ | 曝光时间 | s |
| $f$ | 有效焦距 | m 或 mm |
| $D$ | 入瞳直径 | 与 $f$ 同单位 |
| $N=f/D$ | 工作条件另行说明时的相对孔径数（f-number） | 无量纲 |
| $T$ | 镜头透射率；避免与曝光时间 $t$ 混用 | 无量纲 |

## 传感器与统计

| 符号 | 含义 | 单位 |
|---|---|---|
| $A_p$ | QE 参考面上的整个像素单元面积；已计入 QE 的填充损失不再扣除 | m$^2$ |
| $q$ | 元电荷 | C |
| $\alpha(\lambda)$ | 半导体材料的光谱吸收系数 | m$^{-1}$ |
| $\eta(\lambda)$ | 外量子效率（QE） | 无量纲 |
| $\mathcal R(\lambda)$ | 光电响应度 | A/W |
| $N_\gamma$ | 入射光子计数 | photon |
| $N_e$ | 收集到的光电子计数 | e$^-$ |
| $Q_\mathrm{FW}$ | 线性满阱容量 | e$^-$ |
| $\sigma_r$ | 输入等效读出噪声的均方根 | e$^-$ rms |
| $\mu_d$ | 一次曝光内平均暗电子数 | e$^-$ |
| $g$ | 系统转换增益，若无说明取 DN/e$^-$ | DN/e$^-$ |
| $g_c,g_a$ | 单位模拟增益时的系统转换系数、ADC 前无量纲模拟增益 | DN/e$^-$，无量纲 |
| $K$ | 电荷到电压的转换增益 | V/e$^-$ |
| $C_\mathrm{FD}$ | 浮动扩散节点等效电容 | F |
| $k_{\mathrm B}$ | Boltzmann 常数 | J/K |
| $y$ | 黑电平校正前或后的数字码值，依上下文说明 | DN |
| $Q,Q_V$ | 第三章量化误差的码值表示与电压表示，$Q=Q_V/\Delta$ | DN，V |
| $V_\mathrm{FS},\Delta$ | 第三章ADC电压跨度与一个码区间的电压宽度 | V |
| $T_\mathrm{scan},f_\mathrm{clk}$ | 单斜坡完整扫描时间与计数时钟频率 | s，Hz |
| $H,L,Z$（第五章） | 减黑并换回电子刻度的高、低增益读数及融合结果；与光学OTF按章节区分 | e$^-$ |
| $\sigma_c,\sigma_H,\sigma_L$ | 第五章共同前级噪声及两条路径独立读噪的RMS | e$^-$ rms |
| $\epsilon_d$ | 第四章共享平均暗场在单个像素上的校准误差 | e$^-$ |
| $B,W$ | 数字黑电平与白电平；与波像差 $W$ 按章节区分 | DN |
| $E$ | 第八章 HDR 模型中的信号电子率 | e$^-$/s |
| $\mathrm{SNR}$ | 信号均值除以噪声标准差 | 无量纲，亦写 dB |
| $\mathrm{DR}$ | 指定上、下端判据之间的动态范围 | stop 或 dB |

Poisson 分布写作 $N\sim\operatorname{Poisson}(\mu)$，于是
$\mathbb E[N]=\operatorname{Var}(N)=\mu$。独立随机变量的方差相加。

## 光学与成像

| 符号 | 含义 |
|---|---|
| $n(\lambda)$ | 材料折射率 |
| $V_d$ | 以 Fraunhofer $d,F,C$ 线定义的 Abbe 数 |
| $\boldsymbol r=(x,y)$ | 像面坐标 |
| $\boldsymbol\nu=(\nu_x,\nu_y)$ | 空间频率，单位 cycles/mm 或 cycles/pixel |
| $h(\boldsymbol r)$ | 非相干强度点扩散函数（PSF），归一化积分为 $1$ |
| $H(\boldsymbol\nu)$ | OTF，即 $h$ 的 Fourier 变换 |
| $\operatorname{MTF}(\boldsymbol\nu)=|H(\boldsymbol\nu)|$ | 调制传递函数 |
| $p$ | 像素节距 |
| $\boldsymbol\xi,a_p$ | 物理瞳坐标与瞳半径；$\boldsymbol\rho=\boldsymbol\xi/a_p$ 为归一化坐标 |
| $\nu_N=1/(2p)$ | 一维 Nyquist 空间频率 |
| $\ell_1,\ell_2$ | 厚系统参考面与两主平面之间的有向距离 |
| $W,\sigma_W$ | 波像差及去除声明模式后的瞳面 RMS |
| $\mathcal S$ | Strehl ratio，像面中心强度相对无像差系统之比 |
| $\ell(x)$ | 沿一方向积分二维 PSF 所得的 LSF |
| $H,s_N,s_F,c_0$ | 第十六章超焦距、近景深界、远景深界与容许弥散圈直径 |
| $\alpha_T$ | 材料线膨胀系数，单位 K$^{-1}$ |

Fourier 变换统一采用
$$
\widehat f(\boldsymbol\nu)
=\int_{\mathbb R^2}f(\boldsymbol r)
e^{-2\pi i\boldsymbol\nu\cdot\boldsymbol r}\,d^2\boldsymbol r.
$$

第1章有限圆瞳小节局部采用$a,z,h$表示瞳半径、两平面轴向距离与像点高度，
三者用同一长度单位；$\theta=\arctan(h/z)$指向出瞳中心。该处$h$不是Planck常数。
第11章截光例中，$\boldsymbol h=(h_x,h_y)$为入口坐标（mm），$u$为近轴倾角（rad）；
$A_i,B_i$把入口高度和倾角映到第$i$个孔面，$c_i,r_i$为映回入口平面的圆心与半径（mm）。

第15章斜入射小节中，$\kappa=n_j\sin\theta_j$无量纲，$d_j,\lambda$同用nm；
$Y^{(s)}=n\cos\theta$、$Y^{(p)}=n/\cos\theta$为归一化切向场导纳，
$\delta_j=2\pi n_jd_j\cos\theta_j/\lambda$用rad。$r,t$采用切向电场振幅，
$T_\sigma=(Y_s^{(\sigma)}/Y_0^{(\sigma)})|t_\sigma|^2$；$Y_s$的下标表示基底。
$w_p$是入射能流中p偏振的比例，s/p反射与透射按功率加权。时间约定为$e^{+i\omega t}$。

## 码值与色彩

- “线性”默认指码值与到达相应通道的曝光量成正比，不表示已经是场景绝对辐亮度。
- $x$ 常表示归一化线性相机信号，$v=f(x)$ 表示 OETF 或 Log 编码后的码值。
- RAW 马赛克样本以 $R,G_1,G_2,B$ 表示；去马赛克后的相机 RGB 向量写作
  $\boldsymbol c_\mathrm{cam}$。
- $W_b$ 表示白平衡对角矩阵，$\Sigma$ 表示声明坐标中的噪声协方差矩阵。
- 第7章四波段教学例中，$S_0$ 为参照相机的 $3\times4$ 响应矩阵，
  $\boldsymbol q=(1,-1,1,-1)^{\mathsf T}$ 为其零方向；
  $\boldsymbol\varrho$ 为分段反射率，$\boldsymbol e$ 为相对谱曝光密度。
  积分除以75 nm后得到无单位的相对线性响应，不能当作显示RGB或人眼XYZ。
- 第8章二维配准中，$x,y$ 向右、向下为正，$d_x,d_y$ 是生成位移，
  $s_x,s_y$ 是观测搜索的对应偏移，均用px；匹配 $R(x,y)$ 与 $M(x+s_x,y+s_y)$。
  $\Omega$ 在所有候选间固定，$\rho(\boldsymbol s)$ 为归一化相关系数，非置信度。
- 曝光值差一档表示曝光量乘以 $2$；$n$ 档对应比例 $2^n$。
- 强度比的分贝采用 $10\log_{10}$；幅度比采用 $20\log_{10}$。本书的传感器
  动态范围以电子计数比定义，行业惯例写为 $20\log_{10}$，并同时给出 stop 值
  $\log_2$ 以避免歧义。
