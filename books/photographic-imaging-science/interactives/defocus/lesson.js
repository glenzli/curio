import {
  propagate,
  directDensity,
  inside,
  displacementUm,
  NAMES,
  WHITE,
  CROP,
} from "./model.js";
import { control, number } from "../common/lesson-view.js";
import { imagePanels } from "../common/image-view.js";
let key, cached;
export const spec = {
  title: "离焦点像与光阑形状",
  alt: "互动示意：等面积光阑与共同像面尺度下的前后离焦PSF",
  intro:
    "先清零球差，比较焦点两侧的点像；再加入球差，观察两侧为何不再相同。改变光阑形状时，连续孔径面积固定为π，图像范围与亮度标尺也固定。",
  staticCaption:
    "550 nm、等面积f/8；圆形光阑；离焦系数±0.45，球差系数+0.12；中央扫描位置c=0。",
  note: "轴上、单色、标量Fourier模型；P=A exp(i2πW/λ)，像面Fourier核取负号。W/λ=c√3(2ρ²−1)+s√5(6ρ⁴−6ρ²+1)。多边形仍以等面积圆半径作ρ单位，系数不称多边形上的RMS。基准圆直径128格、4倍补零；全离散场积分归一，81×81显示裁剪不再归一。三幅PSF共用1.1 μm步长、89.1 μm视场和圆形无像差峰值白点，Gamma 2.2。Δz≈−16√3λN²c为小离焦、固定名义像面尺度近似，不含离焦引起的放大率改变、猫眼、加工环纹、色差或真实镜头测量。播放扫描像面，不是光传播。",
  controls: [
    { ...control("shape", "等面积光阑", 0, 3, 1, 0), format: (v) => NAMES[v] },
    control("amount", "两侧离焦系数绝对值", 0, 0.6, 0.025, 0.45, " λ", 3),
    control("spherical", "球差系数", -0.25, 0.25, 0.005, 0.12, " λ", 3),
    control("scan", "中央像面扫描 · c/|c侧|", -1, 1, 0.01, 0, "", 2),
  ],
  presets: [
    {
      label: "纯离焦 · 两侧对称",
      values: { shape: 0, amount: 0.45, spherical: 0, scan: 0 },
    },
    {
      label: "正球差",
      values: { shape: 0, amount: 0.45, spherical: 0.12, scan: 0 },
    },
    {
      label: "负球差",
      values: { shape: 0, amount: 0.45, spherical: -0.12, scan: 0 },
    },
    {
      label: "六边形光阑",
      values: { shape: 1, amount: 0.6, spherical: 0, scan: 0 },
    },
    {
      label: "五边形与球差",
      values: { shape: 2, amount: 0.45, spherical: 0.12, scan: 0 },
    },
    {
      label: "方形光阑",
      values: { shape: 3, amount: 0.45, spherical: 0, scan: 0 },
    },
  ],
  replay: {
    key: "scan",
    start: -1,
    end: 1,
    durationMs: 10000,
    startOnFirstPlay: true,
    label: "扫描焦点两侧",
  },
  evaluate(s) {
    const cacheKey = JSON.stringify([s.shape, s.amount, s.spherical]);
    if (key !== cacheKey) {
      cached = [propagate(s, s.amount), propagate(s, -s.amount)];
      key = cacheKey;
    }
    const front = cached[0],
      back = cached[1],
      current = propagate(s, s.amount * s.scan),
      all = [front, current, back];
    const mask = Float64Array.from({ length: 81 * 81 }, (_, i) =>
      inside(s.shape, ((i % 81) - 40) / 28, (Math.floor(i / 81) - 40) / 28)
        ? 1
        : 0,
    );
    const images = all.map((g, i) => ({
      label: ["2 像面在焦点前", "3 当前扫描像面", "4 像面在焦点后"][i],
      values: g.crop,
      width: CROP,
      height: CROP,
      white: WHITE,
      detail: `c=${number(g.c, 3)} λ；等效Δz=${number(displacementUm(g.c), 1)} μm`,
      scale: `裁剪内能量 ${number(100 * g.retained, 2)}%；共用白点`,
    }));
    const direct = directDensity(current, 1),
      k = 4,
      fft = current.density[k];
    return {
      ...imagePanels(
        [
          {
            label: "1 等面积光阑",
            values: mask,
            width: 81,
            height: 81,
            white: 1,
            gamma: 1,
            detail: `${NAMES[s.shape]}；连续面积 π`,
            scale: `离散面积 ${number(current.area, 5)}；坐标用等面积圆半径`,
          },
          ...images,
        ],
        { title: "等面积光阑与焦点两侧的离焦点像", tileHeight: 265 },
      ),
      figureHeight: 530,
      stats: [
        [
          "全离散场积分",
          number(current.integral, 9),
          `Parseval比 ${number(current.parseval, 9)}`,
        ],
        [
          "探针 FFT / 独立相量和",
          `${number(fft, 7)} / ${number(direct, 7)}`,
          "q=(1,0)，即像面(4.4,0) μm；单位μm⁻²",
        ],
        [
          "前侧 / 后侧 · 半径4.4 μm处",
          `${number(front.density[4], 6)} / ${number(back.density[4], 6)}`,
          "密度单位μm⁻²；球差与离焦分开控制",
        ],
      ],
      reading: `已知对照：同一光阑下，把c与球差s同时反号，复瞳共轭，PSF应作中心反转。s=0时，圆、六边形和方形的两侧点像相同；五边形需先中心反转坐标再比较。FFT探针与直接求和差${Math.abs(fft - direct).toExponential(2)} μm⁻²；此项核对同一离散瞳，连续孔径的面积误差和积分收敛另有检验。白点固定为圆形无像差峰值${number(WHITE, 6)} μm⁻²，未逐图拉亮。`,
    };
  },
};
