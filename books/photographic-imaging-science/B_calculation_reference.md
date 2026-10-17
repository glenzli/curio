# 附录 B：常用计算表与换算

## B.1 物理常数

| 常数 | 数值 |
|---|---:|
| $h$ | $6.62607015\times10^{-34}\ \mathrm{J\,s}$（精确） |
| $c$ | $299792458\ \mathrm{m/s}$（精确） |
| $q$ | $1.602176634\times10^{-19}\ \mathrm C$（精确） |
| $k_{\mathrm B}$ | $1.380649\times10^{-23}\ \mathrm{J/K}$（精确） |
| $hc$ | $1.98644586\times10^{-25}\ \mathrm{J\,m}$ |

单个光子能量可速算为

$$
\varepsilon_\gamma[\mathrm{eV}]
\approx\frac{1240}{\lambda[\mathrm{nm}]}.
$$

## B.2 档、比例与分贝

| 档数 $n$ | 曝光比例 $2^n$ | 强度比 dB，$10\log_{10}$ | 电子计数比按行业 DR 写法，$20\log_{10}$ |
|---:|---:|---:|---:|
| 1 | 2 | 3.010 | 6.021 |
| 2 | 4 | 6.021 | 12.041 |
| 3 | 8 | 9.031 | 18.062 |
| 4 | 16 | 12.041 | 24.082 |
| 10 | 1024 | 30.103 | 60.206 |

传感器行业常把电子容量与读噪的比按幅度比写 $20\log_{10}$，同时又用
$\log_2$ 报 stop。换算为

$$
1\ \mathrm{stop}=20\log_{10}2\approx6.0206\ \mathrm{dB}.
$$

## B.3 标准整档 f 数

理想整档序列满足 $N_{k+1}=\sqrt2N_k$：

```text
1.0  1.4  2.0  2.8  4.0  5.6  8  11  16  22  32
```

任意两个 f 数的曝光差为

$$
\Delta n=2\log_2\frac{N_2}{N_1}.
$$

## B.4 传感器采样

像素节距 $p$ 以微米给出时，Nyquist 频率

$$
\nu_N[\mathrm{lp/mm}]=\frac{500}{p[\mu\mathrm m]}.
$$

画幅宽 $w$ mm、横向像素 $M$ 时

$$
p[\mu\mathrm m]=1000\frac wM,
\qquad
\nu_N=\frac{M}{2w}.
$$

## B.5 衍射速算

以 $\lambda=0.55\ \mu$m：

$$
d_\mathrm{Airy}[\mu\mathrm m]
=2.44\lambda N\approx1.342N,
$$

$$
\nu_c[\mathrm{lp/mm}]
=\frac{1000}{\lambda[\mu\mathrm m]N}
\approx\frac{1818}{N}.
$$

Airy 直径等于像素节距 $p$ 时的 f 数约为
$N\approx p/(1.342\ \mu\mathrm m)$；这不是“衍射开始”的硬阈值，只是一种尺度比较。

## B.6 视频码率

未压缩单 photosite 码率为

$$
R=W\times H\times b\times F,
$$

$W,H$ 为样本尺寸，$b$ 为每样本 bit，$F$ 为帧率。十进制
$1\ \mathrm{MB/s}=8\ \mathrm{Mbit/s}$。还需另计行填充、打包、音频和元数据；
压缩 RAW 的实际码率由编码器和画面内容决定。

## B.7 常用分析顺序

传感器问题按下列顺序计算最不容易跨层：

$$
H_{e,\lambda}
\rightarrow N_\gamma
\rightarrow N_e
\rightarrow \mathrm{SNR}_e
\rightarrow \mathrm{DN}
\rightarrow \text{编码值}.
$$

镜头与系统问题按下列顺序：

$$
\text{物距/视角/光圈}
\rightarrow\text{瞳与波前}
\rightarrow\mathrm{PSF/MTF}
\rightarrow\text{像素积分}
\rightarrow\text{采样与处理}.
$$
