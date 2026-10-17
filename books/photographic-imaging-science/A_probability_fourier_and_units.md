# 附录 A：概率、Fourier 变换与单位

本附录集中给出正文反复使用的数学工具。它不替代概率论和 Fourier 光学教材，只把
噪声合成、卷积成像和 MTF 计算所需结果闭合起来。

## A.1 期望、方差与协方差

离散随机变量 $X$ 的期望与方差为

$$
\mathbb E[X]=\sum_x x\,\Pr(X=x),
\qquad
\operatorname{Var}(X)=\mathbb E[(X-\mathbb E[X])^2].
$$

展开平方得到

$$
\operatorname{Var}(X)=\mathbb E[X^2]-(\mathbb E[X])^2.   \tag{A.1}
$$

协方差定义为

$$
\operatorname{Cov}(X,Y)
=\mathbb E[(X-\mathbb E[X])(Y-\mathbb E[Y])].
$$

**命题 A.1.** 对具有有限二阶矩的随机变量和常数 $a,b$，

$$
\operatorname{Var}(aX+bY)
=a^2\operatorname{Var}(X)+b^2\operatorname{Var}(Y)
+2ab\operatorname{Cov}(X,Y).                              \tag{A.2}
$$

**证明.** 从 $aX+bY$ 中减去其期望，展开平方并逐项取期望，即得。若 $X,Y$ 独立，
则 $\mathbb E[XY]=\mathbb E[X]\mathbb E[Y]$，协方差为零。$\square$

对 $n$ 个方差相同、两两相关系数为 $\rho$ 的变量，平均值方差

$$
\operatorname{Var}(\bar X)
=\frac{\sigma^2}{n}[1+(n-1)\rho]
$$

由式 (A.2) 对所有方差与协方差求和得到。

## A.2 Poisson 分布

若 $N\sim\operatorname{Poisson}(\mu)$，

$$
\Pr(N=k)=e^{-\mu}\frac{\mu^k}{k!},\qquad k=0,1,2,\ldots.
$$

其概率生成函数

$$
G_N(z)=\mathbb E[z^N]=e^{\mu(z-1)}.
$$

于是 $G_N'(1)=\mu$，且
$G_N''(1)=\mathbb E[N(N-1)]=\mu^2$，由式 (A.1)

$$
\operatorname{Var}(N)
=\mathbb E[N(N-1)]+\mathbb E[N]-(\mathbb E[N])^2
=\mu.
$$

独立 Poisson 变量之和仍为 Poisson：生成函数相乘
$e^{\mu_1(z-1)}e^{\mu_2(z-1)}=e^{(\mu_1+\mu_2)(z-1)}$。

## A.3 加权平均

设 $n\ge1$ 个独立观测均满足 $\mathbb E[X_i]=\mu$，且已知有限方差
$0<\sigma_i^2<\infty$。取固定权重，令
$\widehat\mu=\sum_i w_i X_i$ 且 $\sum_i w_i=1$。其方差为
$\sum_i w_i^2\sigma_i^2$。用 Lagrange 乘子最小化：

$$
2 w_i\sigma_i^2-\lambda=0
\quad\Rightarrow\quad
w_i=\frac{\sigma_i^{-2}}{\sum_j \sigma_j^{-2}}.          \tag{A.3}
$$

这些权重记为 $w_i^*$。任何其他和为一的权重，其方差与最优方差之差为
$\sum_i\sigma_i^2(w_i-w_i^*)^2\ge0$：展开平方后，交叉项由
$\sigma_i^2w_i^*=(\sum_j\sigma_j^{-2})^{-1}$ 和
$\sum_i(w_i-w_i^*)=0$ 消去。这证明了全局最小性，最小方差为
$(\sum_i\sigma_i^{-2})^{-1}$。若某观测方差为零，它已几乎必然等于 $\mu$，可直接
使用该观测；不应把零方差代入倒数公式。

这是假设无偏、独立和方差已知时的最优线性权重。HDR 中的饱和、运动和配准误差会破坏
这些假设，所以还需可靠性权重。

## A.4 卷积与 Fourier 变换

二维卷积定义为

$$
(f*g)(\boldsymbol r)
=\int_{\mathbb R^2}f(\boldsymbol s)
g(\boldsymbol r-\boldsymbol s)\,d^2\boldsymbol s.
$$

按本书 Fourier 约定，

$$
\widehat f(\boldsymbol\nu)
=\int f(\boldsymbol r)e^{-2\pi i\boldsymbol\nu\cdot\boldsymbol r}
\,d^2\boldsymbol r.
$$

**命题 A.2（卷积定理）.** 若积分绝对可积并允许使用 Fubini 定理，则

$$
\widehat{f*g}=\widehat f\,\widehat g.
$$

**证明.** 代入定义并令 $\boldsymbol u=\boldsymbol r-\boldsymbol s$：

$$
\begin{aligned}
\widehat{f*g}(\boldsymbol\nu)
&=\iint f(\boldsymbol s)g(\boldsymbol r-\boldsymbol s)
e^{-2\pi i\boldsymbol\nu\cdot\boldsymbol r}
\,d^2\boldsymbol s\,d^2\boldsymbol r\\
&=\int f(\boldsymbol s)e^{-2\pi i\boldsymbol\nu\cdot\boldsymbol s}
\,d^2\boldsymbol s
\int g(\boldsymbol u)e^{-2\pi i\boldsymbol\nu\cdot\boldsymbol u}
\,d^2\boldsymbol u.
\end{aligned}
$$

右端就是 $\widehat f\widehat g$。$\square$

宽度 $p$、高度 $1/p$ 的归一化矩形
$a(x)=p^{-1}\mathbf1_{[-p/2,p/2]}(x)$ 的 Fourier 变换为

$$
\widehat a(\nu)
=\frac{
\sin(\pi p\nu)}{\pi p\nu},
$$

给出正文的像素孔径 MTF。

## A.5 单位检查

量纲检查不能证明公式正确，但能排除许多错误：

- $hc/\lambda$ 的单位为 J；
- $H_e A_p/(hc/\lambda)$ 无量纲，对应光子计数；
- $1/(\lambda N)$ 的单位为 m$^{-1}$，对应空间频率；
- $Q_\mathrm{FW}/\sigma_r$ 是电子数之比，可取对数；
- $f/D$ 无量纲；
- MTF 是调制度之比，无量纲。

若对带单位量直接取对数，必须先除以同单位参考量。摄影“档数”总是比例的
$\log_2$，不是对某个孤立曝光量取对数。
