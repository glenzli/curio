#!/usr/bin/env python3
"""Generate deterministic SVG figures for the photographic imaging textbook."""

from __future__ import annotations

import html
import math
from pathlib import Path


OUT = Path(__file__).resolve().parent
W, H = 1000, 600
INK = "#17202a"
BLUE = "#2364aa"
CYAN = "#188a9a"
GREEN = "#2a9d6f"
RED = "#c44536"
AMBER = "#d18f00"
PURPLE = "#7353ba"
GRAY = "#66717e"
LIGHT = "#e8edf2"
PALE_BLUE = "#dcecf7"
PALE_GREEN = "#dff2e9"
PALE_RED = "#f7e2df"
PALE_AMBER = "#f7efd8"


class SVG:
    def __init__(self, title: str, width: int = W, height: int = H) -> None:
        self.width = width
        self.height = height
        self.parts = [
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
            f'viewBox="0 0 {width} {height}" role="img" aria-label="{html.escape(title)}">',
            "<defs>",
            '<marker id="arrow" markerWidth="9" markerHeight="9" refX="7" refY="3" '
            'orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L8,3 z" fill="context-stroke"/></marker>',
            '<marker id="arrow-open" markerWidth="9" markerHeight="9" refX="7" refY="3" '
            'orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,3 L0,6" fill="none" stroke="context-stroke"/></marker>',
            "</defs>",
            f'<rect x="0" y="0" width="{width}" height="{height}" fill="#ffffff"/>',
        ]
        self.text(width / 2, 35, title, size=24, weight="700", anchor="middle")

    def add(self, source: str) -> None:
        self.parts.append(source)

    def text(
        self,
        x: float,
        y: float,
        value: str,
        *,
        size: int = 18,
        color: str = INK,
        anchor: str = "start",
        weight: str = "400",
        rotate: float | None = None,
    ) -> None:
        transform = f' transform="rotate({rotate} {x} {y})"' if rotate is not None else ""
        self.add(
            f'<text x="{x:.2f}" y="{y:.2f}" fill="{color}" font-size="{size}" '
            f'font-weight="{weight}" text-anchor="{anchor}" '
            'font-family="Arial, PingFang SC, Hiragino Sans GB, sans-serif"'
            f'{transform}>{html.escape(value)}</text>'
        )

    def line(
        self,
        x1: float,
        y1: float,
        x2: float,
        y2: float,
        *,
        color: str = INK,
        width: float = 2,
        dash: str | None = None,
        arrow: bool = False,
        opacity: float = 1.0,
    ) -> None:
        d = f' stroke-dasharray="{dash}"' if dash else ""
        marker = ' marker-end="url(#arrow)"' if arrow else ""
        self.add(
            f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" '
            f'stroke="{color}" stroke-width="{width}" opacity="{opacity}"{d}{marker}/>'
        )

    def rect(
        self,
        x: float,
        y: float,
        width: float,
        height: float,
        *,
        fill: str = "none",
        stroke: str = INK,
        sw: float = 2,
        radius: float = 4,
        opacity: float = 1.0,
    ) -> None:
        self.add(
            f'<rect x="{x:.2f}" y="{y:.2f}" width="{width:.2f}" height="{height:.2f}" '
            f'rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" opacity="{opacity}"/>'
        )

    def circle(
        self,
        x: float,
        y: float,
        radius: float,
        *,
        fill: str = "none",
        stroke: str = INK,
        sw: float = 2,
        opacity: float = 1.0,
    ) -> None:
        self.add(
            f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{radius:.2f}" fill="{fill}" '
            f'stroke="{stroke}" stroke-width="{sw}" opacity="{opacity}"/>'
        )

    def ellipse(
        self,
        x: float,
        y: float,
        rx: float,
        ry: float,
        *,
        fill: str = "none",
        stroke: str = INK,
        sw: float = 2,
        opacity: float = 1.0,
    ) -> None:
        self.add(
            f'<ellipse cx="{x:.2f}" cy="{y:.2f}" rx="{rx:.2f}" ry="{ry:.2f}" '
            f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}" opacity="{opacity}"/>'
        )

    def polyline(
        self,
        points: list[tuple[float, float]],
        *,
        color: str = INK,
        width: float = 2,
        fill: str = "none",
        dash: str | None = None,
        opacity: float = 1.0,
    ) -> None:
        pts = " ".join(f"{x:.2f},{y:.2f}" for x, y in points)
        d = f' stroke-dasharray="{dash}"' if dash else ""
        self.add(
            f'<polyline points="{pts}" fill="{fill}" stroke="{color}" stroke-width="{width}" '
            f'stroke-linejoin="round" stroke-linecap="round" opacity="{opacity}"{d}/>'
        )

    def polygon(
        self,
        points: list[tuple[float, float]],
        *,
        fill: str = "none",
        stroke: str = INK,
        sw: float = 2,
        opacity: float = 1.0,
    ) -> None:
        pts = " ".join(f"{x:.2f},{y:.2f}" for x, y in points)
        self.add(
            f'<polygon points="{pts}" fill="{fill}" stroke="{stroke}" '
            f'stroke-width="{sw}" opacity="{opacity}"/>'
        )

    def arrow(self, x1: float, y1: float, x2: float, y2: float, *, color: str = INK, width: float = 2) -> None:
        self.line(x1, y1, x2, y2, color=color, width=width, arrow=True)

    def axes(self, x: float, y: float, width: float, height: float, xlabel: str, ylabel: str) -> None:
        self.arrow(x, y + height, x + width, y + height, color=INK, width=1.8)
        self.arrow(x, y + height, x, y, color=INK, width=1.8)
        self.text(x + width / 2, y + height + 35, xlabel, size=15, anchor="middle")
        self.text(x - 42, y + height / 2, ylabel, size=15, anchor="middle", rotate=-90)

    def plot(
        self,
        points: list[tuple[float, float]],
        box: tuple[float, float, float, float],
        domain: tuple[float, float, float, float],
        *,
        color: str = BLUE,
        width: float = 3,
        dash: str | None = None,
    ) -> None:
        x, y, w, h = box
        xmin, xmax, ymin, ymax = domain
        # Reject a sampling-range mistake before it can become a misleading plot.
        xtol, ytol = (xmax - xmin) * 1e-9, (ymax - ymin) * 1e-9
        if any(not (math.isfinite(px) and math.isfinite(py)
                    and xmin - xtol <= px <= xmax + xtol
                    and ymin - ytol <= py <= ymax + ytol)
               for px, py in points):
            raise ValueError(f"plot samples outside domain {domain}")
        mapped = [
            (x + (px - xmin) / (xmax - xmin) * w, y + h - (py - ymin) / (ymax - ymin) * h)
            for px, py in points
        ]
        self.polyline(mapped, color=color, width=width, dash=dash)

    def panel(self, x: float, y: float, width: float, height: float, title: str) -> None:
        self.rect(x, y, width, height, fill="#fbfcfe", stroke="#bcc6d0", sw=1.5, radius=5)
        self.text(x + width / 2, y + 27, title, size=17, weight="700", anchor="middle")

    def save(self, filename: str) -> None:
        self.parts.append("</svg>")
        (OUT / filename).write_text("\n".join(self.parts), encoding="utf-8")


def figure_01_radiance_geometry() -> None:
    s = SVG("图 1.1  辐亮度、投影面积与立体角")
    s.polygon([(120, 420), (360, 470), (390, 400), (150, 350)], fill=PALE_BLUE, stroke=BLUE)
    s.text(220, 465, "接收面 dA", size=19, color=BLUE)
    s.arrow(255, 400, 255, 210, color=INK)
    s.text(270, 225, "法线 n", size=17)
    apex = (760, 210)
    for p in [(180, 365), (260, 385), (345, 410)]:
        s.line(apex[0], apex[1], p[0], p[1], color=AMBER, width=2.5)
    s.circle(*apex, 12, fill=AMBER, stroke=AMBER)
    s.text(760, 175, "方向微元 dΩ", size=19, color=AMBER, anchor="middle")
    s.line(255, 400, 690, 235, color=GRAY, width=1.5, dash="7 6")
    s.text(420, 300, "θ", size=22)
    s.text(500, 520, "dΦ = L cosθ dA dΩ dλ", size=22, anchor="middle", weight="700")
    s.save("01_radiance_geometry.svg")


def figure_01_fnumber_exposure() -> None:
    s = SVG("图 1.2  f 数与像面辐照度")
    for x0, aperture, label, color in [(80, 150, "大入瞳：较小 f 数", BLUE), (535, 75, "小入瞳：较大 f 数", RED)]:
        s.panel(x0, 80, 385, 390, label)
        lx, sx = x0 + 140, x0 + 325
        s.line(lx, 160, lx, 400, color=INK, width=3)
        s.line(sx, 150, sx, 410, color=GRAY, width=5)
        top, bottom = 280 - aperture / 2, 280 + aperture / 2
        s.line(lx, top, sx, 280, color=color, width=3)
        s.line(lx, bottom, sx, 280, color=color, width=3)
        s.line(x0 + 30, top, lx, top, color=color, width=2)
        s.line(x0 + 30, bottom, lx, bottom, color=color, width=2)
        s.line(lx, top - 15, lx, bottom + 15, color=color, width=8)
        s.text(lx, 430, "入瞳 D", size=16, anchor="middle")
        s.text(sx, 435, "像面", size=16, anchor="middle")
    s.text(500, 535, "Eimage ∝ D²/f² = 1/N²", size=24, anchor="middle", weight="700")
    s.save("01_fnumber_exposure.svg")


def figure_02_photon_electron_chain() -> None:
    s = SVG("图 2.1  从光子到 RAW 码值的信号链")
    labels = [
        ("入射光子", "Nγ", PALE_AMBER, AMBER),
        ("滤色片与 QE", "η(λ)", PALE_GREEN, GREEN),
        ("信号电子", "Ne", PALE_BLUE, BLUE),
        ("FD 转换", "q/CFD", PALE_RED, RED),
        ("ADC", "g · Ne", "#eee8f8", PURPLE),
        ("RAW", "DN", LIGHT, INK),
    ]
    x = 35
    for i, (name, sub, fill, color) in enumerate(labels):
        s.rect(x, 210, 130, 130, fill=fill, stroke=color, sw=2.5)
        s.text(x + 65, 260, name, size=18, anchor="middle", weight="700")
        s.text(x + 65, 305, sub, size=20, color=color, anchor="middle")
        if i < len(labels) - 1:
            s.arrow(x + 132, 275, x + 158, 275, color=GRAY)
        x += 160
    s.text(500, 430, "每一箭头都可能改变均值、方差、饱和点或单位", size=21, anchor="middle")
    s.save("02_photon_electron_chain.svg")


def figure_02_4t_pixel() -> None:
    s = SVG("图 2.3  典型 4T 钉扎光电二极管像素")
    s.rect(70, 230, 190, 150, fill=PALE_BLUE, stroke=BLUE, sw=3)
    s.text(165, 290, "PPD", size=28, color=BLUE, anchor="middle", weight="700")
    s.text(165, 330, "积累电子", size=18, anchor="middle")
    s.rect(295, 260, 95, 90, fill=PALE_AMBER, stroke=AMBER, sw=3)
    s.text(342, 315, "TX", size=24, anchor="middle", weight="700")
    s.rect(425, 230, 150, 150, fill=PALE_RED, stroke=RED, sw=3)
    s.text(500, 285, "FD", size=28, color=RED, anchor="middle", weight="700")
    s.text(500, 330, "CFD", size=20, anchor="middle")
    s.arrow(260, 305, 295, 305, color=BLUE, width=3)
    s.arrow(390, 305, 425, 305, color=AMBER, width=3)
    s.rect(640, 120, 120, 75, fill=LIGHT, stroke=GRAY)
    s.text(700, 167, "RST", size=22, anchor="middle", weight="700")
    s.arrow(640, 158, 545, 230, color=GRAY)
    s.rect(640, 255, 120, 75, fill=PALE_GREEN, stroke=GREEN)
    s.text(700, 302, "SF", size=22, anchor="middle", weight="700")
    s.arrow(575, 305, 640, 292, color=GREEN)
    s.rect(820, 255, 110, 75, fill=LIGHT, stroke=GRAY)
    s.text(875, 302, "SEL", size=21, anchor="middle", weight="700")
    s.arrow(760, 292, 820, 292, color=GRAY)
    s.arrow(930, 292, 965, 292, color=INK)
    s.text(900, 360, "列线", size=18, anchor="middle")
    s.text(500, 500, "转换增益 K ≈ q/CFD；小 CFD 提高 V/e⁻，也压缩电压容量", size=21, anchor="middle")
    s.save("02_4t_pixel.svg")


def figure_02_shot_noise() -> None:
    s = SVG("图 2.2  散粒噪声与信号电子数")
    box = (120, 100, 720, 370)
    s.axes(*box, "平均电子数 μe", "电子数或 SNR")
    xs = [i * 50 for i in range(201)]
    signal = [(x, x / 100) for x in xs]
    root = [(x, math.sqrt(x)) for x in xs]
    domain = (0, 10000, 0, 105)
    s.plot(signal, box, domain, color=BLUE, width=3)
    s.plot(root, box, domain, color=RED, width=3)
    s.text(765, 125, "信号 μ/100", size=17, color=BLUE)
    s.text(705, 260, "σshot = √μ", size=17, color=RED)
    s.text(500, 545, "散粒噪声标准差和 shot-noise-limited SNR 都按 √μ 增长", size=20, anchor="middle")
    s.save("02_shot_noise.svg")


def figure_03_readout_chain() -> None:
    s = SVG("图 3.1  CMOS 读出链及噪声注入位置")
    blocks = [
        (80, "像素 SF", PALE_BLUE, BLUE),
        (255, "列采样 / CDS", PALE_GREEN, GREEN),
        (455, "模拟增益", PALE_AMBER, AMBER),
        (630, "列 ADC", PALE_RED, RED),
        (805, "数字校正", "#eee8f8", PURPLE),
    ]
    for i, (x, label, fill, color) in enumerate(blocks):
        s.rect(x, 230, 140 if i != 1 else 165, 110, fill=fill, stroke=color, sw=2.5)
        s.text(x + (70 if i != 1 else 82), 295, label, size=18, anchor="middle", weight="700")
        if i < len(blocks) - 1:
            next_x = blocks[i + 1][0]
            s.arrow(x + (140 if i != 1 else 165), 285, next_x - 12, 285, color=GRAY)
    s.text(150, 420, "R1：增益前噪声", size=18, color=BLUE)
    s.arrow(190, 398, 190, 340, color=BLUE)
    s.text(590, 420, "R2 / 量化：增益后噪声", size=18, color=RED)
    s.arrow(670, 398, 670, 340, color=RED)
    s.text(500, 505, "模拟增益只能压低其后噪声折算到输入端的贡献", size=21, anchor="middle")
    s.save("03_readout_chain.svg")


def figure_03_quantization_gain() -> None:
    s = SVG("图 3.2  量化步长、系统增益与电子刻度")
    box = (130, 95, 700, 390)
    s.axes(*box, "输入电压", "输出码值")
    steps: list[tuple[float, float]] = []
    levels = 8
    for k in range(levels):
        x0 = k / levels
        x1 = (k + 1) / levels
        y = k / (levels - 1)
        steps.extend([(x0, y), (x1, y)])
        if k < levels - 1:
            steps.append((x1, (k + 1) / (levels - 1)))
    s.plot(steps, box, (0, 1, 0, 1), color=BLUE, width=3)
    s.plot([(0, 0), (1, 1)], box, (0, 1, 0, 1), color=GRAY, width=2, dash="8 6")
    s.text(745, 155, "理想线性", size=16, color=GRAY)
    s.text(640, 340, "量化阶梯 Δ", size=18, color=BLUE)
    s.text(500, 545, "位深规定阶梯数量；有效精度还受读噪与非线性限制", size=20, anchor="middle")
    s.save("03_quantization_gain.svg")


def figure_04_noise_budget() -> None:
    s = SVG("图 4.1  信号电平变化时的噪声预算")
    box = (130, 100, 700, 370)
    s.axes(*box, "信号电子 μe（对数刻度示意）", "噪声 rms（对数刻度示意）")
    ts = [i / 500 * 5 for i in range(501)]
    read = [(t, math.log10(3)) for t in ts]
    shot = [(t, math.log10(math.sqrt(10**t))) for t in ts]
    prnu = [(t, math.log10(0.01 * 10**t)) for t in ts]
    domain = (0, 5, -2.2, 3.2)
    s.plot(read, box, domain, color=RED)
    s.plot(shot, box, domain, color=BLUE)
    s.plot(prnu, box, domain, color=GREEN)
    s.text(150, 125, "读噪", size=17, color=RED)
    s.text(150, 155, "散粒噪声 √μ", size=17, color=BLUE)
    s.text(150, 185, "PRNU · μ", size=17, color=GREEN)
    s.text(500, 545, "阴影、中间调和高光可由不同噪声项主导", size=20, anchor="middle")
    s.save("04_noise_budget.svg")


def figure_04_photon_transfer_curve() -> None:
    s = SVG("图 4.2  Photon Transfer Curve 的均值--方差关系")
    box = (130, 100, 700, 370)
    s.axes(*box, "平均信号 DN", "时间方差 DN²")
    pts = []
    for x in range(0, 1001, 5):
        y = 20 + 0.45 * x
        if x > 820:
            y -= 0.0022 * (x - 820) ** 2
        pts.append((x, max(0, y)))
    s.plot(pts, box, (0, 1000, 0, 500), color=BLUE, width=3)
    s.arrow(250, 430, 130, 470 - 20 / 500 * 370, color=RED)
    s.text(190, 415, "暗场方差 c [DN²]", size=16, color=RED)
    s.text(430, 280, "线性斜率 = g [DN/e⁻]", size=18, color=BLUE)
    s.text(700, 175, "饱和 / 非线性", size=17, color=RED)
    s.save("04_photon_transfer_curve.svg")


def figure_04_dynamic_range() -> None:
    s = SVG("图 4.3  动态范围上端与多种下端判据")
    x0, x1, y = 110, 900, 280
    s.line(x0, y, x1, y, color=INK, width=7)
    marks = [(160, "1×读噪", RED), (235, "SNR=2", AMBER), (850, "线性满阱", BLUE)]
    for x, label, color in marks:
        s.line(x, y - 35, x, y + 35, color=color, width=4)
        s.text(x, y + 75, label, size=18, color=color, anchor="middle")
    s.arrow(165, 180, 845, 180, color=BLUE, width=3)
    s.text(505, 155, "工程 DR：QFW / σr", size=20, color=BLUE, anchor="middle")
    s.arrow(240, 390, 845, 390, color=AMBER, width=3)
    s.text(540, 435, "可用 DR：QFW / μmin(SNR 门槛)", size=20, color=AMBER, anchor="middle")
    s.save("04_dynamic_range.svg")


def figure_05_gain_placement() -> None:
    s = SVG("图 5.1  不同增益位置对信号与噪声的作用")
    s.rect(75, 225, 150, 100, fill=PALE_BLUE, stroke=BLUE)
    s.text(150, 282, "Ne + R1", size=23, anchor="middle", weight="700")
    s.rect(325, 225, 150, 100, fill=PALE_AMBER, stroke=AMBER)
    s.text(400, 282, "模拟增益 a", size=21, anchor="middle", weight="700")
    s.rect(575, 225, 150, 100, fill=PALE_RED, stroke=RED)
    s.text(650, 282, "+ R2", size=23, anchor="middle", weight="700")
    s.rect(805, 225, 120, 100, fill=LIGHT, stroke=GRAY)
    s.text(865, 282, "ADC", size=23, anchor="middle", weight="700")
    for a, b in [(225, 325), (475, 575), (725, 805)]:
        s.arrow(a, 275, b - 10, 275, color=GRAY, width=3)
    s.text(500, 420, "σ²input = σ1² + σ2²/a²", size=26, anchor="middle", weight="700")
    s.save("05_gain_placement.svg")


def figure_05_dual_conversion_gain() -> None:
    s = SVG("图 5.2  双转换增益的容量--读噪权衡")
    box = (130, 100, 700, 370)
    s.axes(*box, "输入电子数", "FD 输出电压")
    hcg = [(0, 0), (0.32, 1)]
    lcg = [(0, 0), (1, 0.63)]
    s.plot(hcg, box, (0, 1, 0, 1), color=RED, width=4)
    s.plot(lcg, box, (0, 1, 0, 1), color=BLUE, width=4)
    s.line(130, 100, 830, 100, color=GRAY, width=2, dash="7 5")
    s.text(340, 125, "HCG：高 V/e⁻，较早触顶", size=18, color=RED)
    s.text(600, 290, "LCG：低 V/e⁻，容量更大", size=18, color=BLUE)
    s.text(500, 545, "同一“ISO”菜单可能在某阈值切换两条读出曲线", size=20, anchor="middle")
    s.save("05_dual_conversion_gain.svg")


def figure_05_ei_headroom() -> None:
    s = SVG("图 5.3  EI 对中灰上下余量的重新分配")
    for y, mid, label in [(190, 590, "较低 EI：更多传感器曝光"), (380, 430, "较高 EI：更少传感器曝光")]:
        s.line(110, y, 890, y, color=INK, width=14)
        s.line(mid, y - 40, mid, y + 40, color=AMBER, width=5)
        s.text(mid, y - 58, "18% 中灰", size=17, color=AMBER, anchor="middle")
        s.text(110, y + 65, "噪声端", size=16, color=RED)
        s.text(890, y + 65, "饱和端", size=16, color=BLUE, anchor="end")
        s.text(500, y + 105, label, size=19, anchor="middle")
    s.text(500, 535, "总传感器范围可不变；场景相对中灰的高光/阴影余量改变", size=20, anchor="middle")
    s.save("05_ei_headroom.svg")


def figure_06_shutter_timing() -> None:
    s = SVG("图 6.1  滚动快门与全局快门的曝光窗口")
    s.panel(65, 75, 410, 450, "滚动快门")
    s.panel(525, 75, 410, 450, "全局快门")
    exposure_ms, scan_ms, now_ms, duration_ms = 4, 12, 8, 20
    for panel_x, global_mode in [(65, False), (525, True)]:
        left, right = panel_x + 65, panel_x + 385
        scale = (right - left) / duration_ms
        for row in range(7):
            y = 175 + row * 38
            start_ms = 0 if global_mode else scan_ms * row / 6
            start = left + start_ms * scale
            elapsed_ms = min(exposure_ms, max(0, now_ms - start_ms))
            s.text(panel_x + 22, y + 14, f"R{row}", size=13, color=GRAY)
            s.line(left, y + 8, right, y + 8, color=LIGHT, width=1)
            s.rect(start, y, exposure_ms * scale, 17, fill=PALE_BLUE, stroke=BLUE, sw=1.2, radius=1)
            if elapsed_ms > 0:
                s.rect(start, y, elapsed_ms * scale, 17, fill=CYAN, stroke="none", sw=0, radius=1)
        s.line(left + now_ms * scale, 160, left + now_ms * scale, 438, color=AMBER, width=2)
        s.arrow(left, 460, right, 460, color=INK)
        for tick in [0, 5, 10, 15, 20]:
            x = left + tick * scale
            s.line(x, 456, x, 465, color=GRAY, width=1)
            s.text(x, 484, str(tick), size=13, color=GRAY, anchor="middle")
        s.text((left + right) / 2, 510, "时间 / ms", size=15, anchor="middle")
    s.text(270, 135, "各行起点错开 2 ms", size=16, color=GRAY, anchor="middle")
    s.text(730, 135, "各行均在 0–4 ms 积分", size=16, color=GRAY, anchor="middle")
    s.text(500, 562, "同一时间刻度；每行曝光 4 ms；橙线为 8 ms；深色表示已积分的时间", size=17, anchor="middle")
    s.save("06_shutter_timing.svg")


def figure_06_rolling_skew() -> None:
    s = SVG("图 6.2  行间采样时间差造成运动倾斜")
    s.panel(80, 90, 360, 390, "真实运动轨迹")
    s.panel(560, 90, 360, 390, "滚动读出的单帧")
    for i, x in enumerate([150, 220, 290, 360]):
        s.rect(x, 180, 18, 210, fill=BLUE, stroke=BLUE, opacity=0.25 + i * 0.18)
        s.text(x + 9, 420, f"t{i}", size=14, anchor="middle")
    s.polygon([(620, 180), (680, 180), (850, 390), (790, 390)], fill=PALE_RED, stroke=RED, sw=4)
    for y in range(190, 390, 35):
        s.line(600, y, 875, y, color=LIGHT, width=1)
    s.text(740, 440, "xj = x0 + v(t0 + jΔt)", size=19, color=RED, anchor="middle")
    s.save("06_rolling_skew.svg")


def figure_06_sensor_structures() -> None:
    s = SVG("图 6.3  FSI、BSI 与逻辑堆栈的层次区别")
    panels = [(35, "FSI"), (350, "BSI"), (665, "BSI + 逻辑堆栈")]
    for x, title in panels:
        s.panel(x, 80, 285, 420, title)
        if title == "FSI":
            layers = [(155, 65, "微透镜", PALE_BLUE), (220, 80, "金属布线", PALE_AMBER), (300, 130, "光敏硅", PALE_GREEN)]
            arrow_top, arrow_bottom = 120, 440
        elif title == "BSI":
            layers = [(155, 65, "微透镜", PALE_BLUE), (220, 130, "减薄光敏硅", PALE_GREEN), (350, 80, "金属布线", PALE_AMBER)]
            arrow_top, arrow_bottom = 120, 345
        else:
            layers = [(145, 55, "微透镜", PALE_BLUE), (200, 105, "像素晶圆", PALE_GREEN), (305, 35, "键合互连", LIGHT), (340, 105, "逻辑 / ADC", PALE_RED)]
            arrow_top, arrow_bottom = 112, 285
        for y, h, label, fill in layers:
            s.rect(x + 35, y, 215, h, fill=fill, stroke=GRAY, sw=1.5, radius=1)
            s.text(x + 142, y + h / 2 + 6, label, size=16, anchor="middle")
        for dx in [85, 142, 199]:
            s.arrow(x + dx, arrow_top, x + dx, arrow_bottom, color=BLUE, width=2.5)
    s.text(500, 555, "结构名称规定层次关系，不直接给出读噪、动态范围或扫描时间", size=20, anchor="middle")
    s.save("06_sensor_structures.svg")


def figure_06_curved_sensor() -> None:
    s = SVG("图 6.4  平面传感器与弯曲最佳像面")
    lens_x = 300
    s.line(80, 300, 900, 300, color=GRAY, width=1.5, dash="8 6")
    s.ellipse(lens_x, 300, 30, 160, fill=PALE_BLUE, stroke=BLUE, sw=3)
    image_points = [(720, 210), (760, 300), (720, 390)]
    object_points = [(80, 170), (80, 300), (80, 430)]
    for op, ip, color in zip(object_points, image_points, [RED, GREEN, PURPLE]):
        s.line(op[0], op[1], lens_x, 300, color=color, width=2)
        s.line(lens_x, 300, ip[0], ip[1], color=color, width=2.5)
    curve = [(720 + 40 * (1 - math.cos(t)), 300 + 150 * math.sin(t)) for t in [(-1.0 + i / 50 * 2.0) for i in range(51)]]
    s.polyline(curve, color=BLUE, width=5)
    s.line(790, 145, 790, 455, color=RED, width=5)
    s.text(680, 130, "弯曲最佳像面", size=18, color=BLUE)
    s.text(805, 130, "平面传感器", size=18, color=RED)
    s.text(500, 535, "曲率必须与具体镜头的场曲和像散共同匹配", size=20, anchor="middle")
    s.save("06_curved_sensor.svg")


def figure_07_bayer_sampling() -> None:
    s = SVG("图 7.2  Bayer CFA 的空间采样")
    colors = {(0, 0): RED, (1, 0): GREEN, (0, 1): GREEN, (1, 1): BLUE}
    x0, y0, p = 190, 95, 70
    for j in range(6):
        for i in range(8):
            c = colors[(i % 2, j % 2)]
            s.rect(x0 + i * p, y0 + j * p, p, p, fill=c, stroke="#ffffff", sw=2, radius=0, opacity=0.78)
            s.text(x0 + i * p + p / 2, y0 + j * p + 44, "G" if c == GREEN else ("R" if c == RED else "B"), size=22, color="#ffffff", anchor="middle", weight="700")
    s.arrow(185, 540, 745, 540, color=INK)
    s.text(465, 575, "完整 photosite 节距 p；单独 R/B 的规则周期更大", size=18, anchor="middle")
    s.save("07_bayer_sampling.svg")


def figure_07_aliasing() -> None:
    s = SVG("图 7.3  两个连续频率产生同一组离散样本")
    box = (110, 100, 780, 370)
    s.axes(*box, "位置 x / p", "归一化强度")
    xs = [i / 2400 * 8 for i in range(2401)]
    low = [(x, 0.5 + 0.4 * math.cos(2 * math.pi * 0.25 * x)) for x in xs]
    high = [(x, 0.5 + 0.4 * math.cos(2 * math.pi * 1.25 * x)) for x in xs]
    s.plot(low, box, (0, 8, 0, 1), color=BLUE, width=3)
    s.plot(high, box, (0, 8, 0, 1), color=RED, width=2, dash="7 5")
    for n in range(9):
        value = 0.5 + 0.4 * math.cos(2 * math.pi * 0.25 * n)
        px = box[0] + n / 8 * box[2]
        py = box[1] + box[3] - value * box[3]
        s.circle(px, py, 6, fill=INK, stroke=INK)
    s.text(650, 145, "ν", size=18, color=BLUE)
    s.text(710, 185, "ν + 1/p", size=18, color=RED)
    s.text(500, 545, "黑点完全相同：采样后无法唯一判断原来的连续频率", size=20, anchor="middle")
    s.save("07_aliasing.svg")


def figure_07_spectral_channels() -> None:
    s = SVG("图 7.1  相机 RGB 通道的重叠光谱响应")
    box = (120, 100, 740, 370)
    s.axes(*box, "波长 λ [nm]", "相对响应")
    xs = list(range(380, 751, 2))
    gauss = lambda x, mu, sigma: math.exp(-0.5 * ((x - mu) / sigma) ** 2)
    curves = [
        ([(x, gauss(x, 610, 55)) for x in xs], RED, "R"),
        ([(x, gauss(x, 540, 48)) for x in xs], GREEN, "G"),
        ([(x, gauss(x, 455, 42)) for x in xs], BLUE, "B"),
    ]
    for pts, color, label in curves:
        s.plot(pts, box, (380, 750, 0, 1.05), color=color, width=4)
    s.text(730, 210, "R", size=20, color=RED)
    s.text(530, 135, "G", size=20, color=GREEN)
    s.text(315, 180, "B", size=20, color=BLUE)
    s.text(500, 545, "曲线为机制示意，不是某一相机的实测响应", size=19, anchor="middle")
    s.save("07_spectral_channels.svg")


def figure_08_stack_snr() -> None:
    s = SVG("图 8.1  独立多帧平均的平方根收益")
    box = (130, 100, 700, 370)
    s.axes(*box, "帧数 m", "相对 SNR")
    xs = list(range(1, 65))
    pts = [(x, math.sqrt(x)) for x in xs]
    s.plot(pts, box, (1, 64, 0, 8.5), color=BLUE, width=4)
    for x in [1, 4, 16, 64]:
        y = math.sqrt(x)
        px = box[0] + (x - 1) / 63 * box[2]
        py = box[1] + box[3] - y / 8.5 * box[3]
        s.circle(px, py, 6, fill=RED, stroke=RED)
        s.text(px + (8 if x in (1, 4) else 0), py + (25 if x == 1 else -14),
               f"{x}帧 → {y:g}×", size=15, anchor="start" if x in (1, 4) else "middle", color=RED)
    s.text(500, 545, "固定总曝光时，每帧还会重复支付读出噪声", size=20, anchor="middle")
    s.save("08_stack_snr.svg")


def figure_08_hdr_exposure_windows() -> None:
    s = SVG("图 8.2  长短曝光覆盖不同的有效辐亮度区间")
    s.arrow(100, 500, 910, 500, color=INK)
    s.text(505, 545, "场景信号率（档，对数坐标）", size=18, anchor="middle")
    bars = [
        (160, 320, 170, "长曝光：暗部有效，高光饱和", BLUE),
        (300, 320, 300, "短曝光：暗部读噪，高光有效", RED),
        (160, 460, 430, "融合后的覆盖", GREEN),
    ]
    for x, width, y, label, color in bars:
        s.rect(x, y, width, 48, fill=color, stroke=color, opacity=0.72)
        s.text(x + width / 2, y - 15, label, size=17, color=color, anchor="middle")
    for x, label in [(160, "长曝光低端"), (480, "长曝光饱和"), (620, "短曝光饱和")]:
        s.line(x, 140, x, 485, color=GRAY, width=1.5, dash="5 5")
        s.text(x, 120, label, size=16, anchor="middle")
    s.save("08_hdr_exposure_windows.svg")


def figure_08_hdr_ghosting() -> None:
    s = SVG("图 8.3  多曝光运动导致鬼影")
    s.panel(50, 90, 270, 390, "短曝光 t₁")
    s.panel(365, 90, 270, 390, "长曝光 t₂")
    s.panel(680, 90, 270, 390, "直接融合")
    positions = [150, 500]
    for panel_x, cx, color in [(50, positions[0], BLUE), (365, positions[1], RED)]:
        s.circle(cx, 215, 32, fill=color, stroke=color, opacity=0.8)
        s.rect(cx - 34, 247, 68, 130, fill=color, stroke=color, opacity=0.8)
        s.line(cx - 20, 377, cx - 40, 445, color=color, width=12)
        s.line(cx + 20, 377, cx + 40, 445, color=color, width=12)
    for cx, color, opacity in [(755, BLUE, 0.45), (865, RED, 0.45)]:
        s.circle(cx, 215, 32, fill=color, stroke=color, opacity=opacity)
        s.rect(cx - 34, 247, 68, 130, fill=color, stroke=color, opacity=opacity)
        s.line(cx - 20, 377, cx - 40, 445, color=color, width=12, opacity=opacity)
        s.line(cx + 20, 377, cx + 40, 445, color=color, width=12, opacity=opacity)
    s.text(815, 465, "两个时刻不能自动成为同一时刻", size=16, anchor="middle", color=PURPLE)
    s.save("08_hdr_ghosting.svg")


def figure_09_transfer_curves() -> None:
    s = SVG("图 9.1  线性、Gamma 与 Log 编码曲线")
    box = (130, 100, 700, 370)
    s.axes(*box, "归一化线性信号 x", "编码值 v")
    xs = [i / 500 for i in range(501)]
    linear = [(x, x) for x in xs]
    gamma = [(x, x ** (1 / 2.4)) for x in xs]
    logc = [(x, math.log2(1 + 63 * x) / 6) for x in xs]
    for pts, color in [(linear, GRAY), (gamma, BLUE), (logc, RED)]:
        s.plot(pts, box, (0, 1, 0, 1), color=color, width=3)
    s.text(730, 170, "Linear", size=16, color=GRAY)
    s.text(600, 130, "Gamma", size=16, color=BLUE)
    s.text(390, 135, "Log-like", size=16, color=RED)
    s.text(500, 545, "非线性编码重新分配码字，不改变传感器已经捕获的电子", size=20, anchor="middle")
    s.save("09_transfer_curves.svg")


def figure_09_codes_per_stop() -> None:
    s = SVG("图 9.2  线性与 Log 的每档码值分配")
    s.text(90, 125, "线性编码", size=20, weight="700")
    widths = [12, 24, 48, 96, 192, 384]
    x = 170
    for i, width in enumerate(widths):
        s.rect(x, 90, width, 75, fill=BLUE, stroke="#ffffff", sw=1, radius=0, opacity=0.72)
        s.text(x + width / 2, 137, f"{i+1}", size=14, color="#ffffff", anchor="middle")
        x += width
    s.text(90, 310, "Log 编码", size=20, weight="700")
    x = 170
    for i in range(6):
        s.rect(x, 275, 126, 75, fill=RED, stroke="#ffffff", sw=1, radius=0, opacity=0.72)
        s.text(x + 63, 322, f"第{i+1}档", size=14, color="#ffffff", anchor="middle")
        x += 126
    s.text(500, 475, "Log 近似让相邻曝光档获得相同码值宽度", size=22, anchor="middle")
    s.save("09_codes_per_stop.svg")


def figure_09_ei_allocation() -> None:
    s = SVG("图 9.3  EI、中灰与固定传感器范围")
    for y, mid, label in [(180, 600, "EI 低：中灰信号高"), (355, 420, "EI 高：中灰信号低")]:
        s.rect(100, y, 800, 58, fill=LIGHT, stroke=GRAY, sw=1.5)
        s.rect(100, y, mid - 100, 58, fill=PALE_GREEN, stroke="none")
        s.rect(mid, y, 900 - mid, 58, fill=PALE_BLUE, stroke="none")
        s.line(mid, y - 18, mid, y + 76, color=AMBER, width=4)
        s.text(mid, y - 28, "中灰", size=16, color=AMBER, anchor="middle")
        s.text(500, y + 100, label, size=18, anchor="middle")
    s.text(190, 520, "阴影侧", size=17, color=GREEN)
    s.text(810, 520, "高光侧", size=17, color=BLUE)
    s.save("09_ei_allocation.svg")


def figure_10_raw_pipeline() -> None:
    s = SVG("图 10.1  RAW 显影流程及可重新选择的步骤")
    labels = ["打包 RAW", "黑/白电平", "去马赛克", "白平衡", "颜色矩阵", "色调/输出"]
    colors = [GRAY, RED, BLUE, GREEN, PURPLE, AMBER]
    x = 25
    for i, (label, color) in enumerate(zip(labels, colors)):
        s.rect(x, 220, 135, 105, fill=LIGHT if i == 0 else "#fbfcfe", stroke=color, sw=2.5)
        s.text(x + 67.5, 280, label, size=17, anchor="middle", weight="700")
        if i < len(labels) - 1:
            s.arrow(x + 135, 272, x + 155, 272, color=GRAY)
        x += 160
    s.text(275, 400, "通常仍可重选", size=18, color=GREEN, anchor="middle")
    s.line(160, 375, 580, 375, color=GREEN, width=3)
    s.text(790, 400, "输出决定逐步烘焙", size=18, color=AMBER, anchor="middle")
    s.line(640, 375, 940, 375, color=AMBER, width=3)
    s.text(500, 500, "RAW 是数据契约，不是“零处理”的同义词", size=22, anchor="middle")
    s.save("10_raw_pipeline.svg")


def figure_10_raw_bit_packing() -> None:
    s = SVG("图 10.2  两个 12-bit 样本打包为三个字节")
    s.text(115, 130, "像素 A（12 bit）", size=19, color=BLUE)
    s.text(560, 130, "像素 B（12 bit）", size=19, color=RED)
    bitw = 26
    for i in range(12):
        s.rect(110 + i * bitw, 160, bitw, 55, fill=PALE_BLUE, stroke=BLUE, sw=1, radius=0)
        s.text(123 + i * bitw, 195, str(11 - i), size=12, anchor="middle")
        s.rect(555 + i * bitw, 160, bitw, 55, fill=PALE_RED, stroke=RED, sw=1, radius=0)
        s.text(568 + i * bitw, 195, str(11 - i), size=12, anchor="middle")
    byte_x = [125, 365, 605]
    for j, x in enumerate(byte_x):
        s.rect(x, 340, 210, 75, fill=[PALE_BLUE, "#eee8f8", PALE_RED][j], stroke=[BLUE, PURPLE, RED][j], sw=2)
        s.text(x + 105, 385, f"Byte {j}", size=20, anchor="middle", weight="700")
    s.arrow(265, 230, 230, 330, color=BLUE)
    s.arrow(425, 230, 470, 330, color=PURPLE)
    s.arrow(710, 230, 710, 330, color=RED)
    s.text(500, 505, "容器按 8 bit 传输；样本的有效位深仍是 12 bit", size=20, anchor="middle")
    s.save("10_raw_bit_packing.svg")


def draw_lens(s: SVG, x: float, y: float, height: float, color: str = BLUE) -> None:
    s.ellipse(x, y, 25, height / 2, fill=PALE_BLUE, stroke=color, sw=3)


def figure_11_thin_lens_rays() -> None:
    s = SVG("图 11.1  薄透镜成像的三条近轴主光线")
    axis_y, lens_x = 310, 500
    s.line(60, axis_y, 940, axis_y, color=GRAY, width=1.5, dash="8 6")
    draw_lens(s, lens_x, axis_y, 310)
    object_x, object_y = 160, 170
    image_x, image_y = 840, 450
    focal_length = 170
    s.arrow(object_x, axis_y, object_x, object_y, color=INK, width=5)
    s.text(object_x, object_y - 20, "物点", size=17, anchor="middle")
    s.arrow(image_x, axis_y, image_x, image_y, color=INK, width=5)
    for x, label in [(lens_x - focal_length, "F"), (lens_x + focal_length, "F′")]:
        s.circle(x, axis_y, 4, fill=GRAY, stroke=GRAY)
        s.text(x, axis_y + 25, label, size=16, anchor="middle")
    s.line(object_x, object_y, lens_x, object_y, color=BLUE, width=2.5)
    s.line(lens_x, object_y, image_x, image_y, color=BLUE, width=2.5)
    s.line(object_x, object_y, lens_x, axis_y, color=RED, width=2.5)
    s.line(lens_x, axis_y, image_x, image_y, color=RED, width=2.5)
    s.line(object_x, object_y, lens_x, image_y, color=GREEN, width=2.5)
    s.line(lens_x, image_y, image_x, image_y, color=GREEN, width=2.5)
    s.text(500, 520, "1/s + 1/s′ = 1/f；m = −s′/s", size=23, anchor="middle", weight="700")
    s.save("11_thin_lens_rays.svg")


def figure_11_principal_planes() -> None:
    s = SVG("图 11.2  厚系统的主平面与等效焦距")
    s.line(70, 300, 930, 300, color=GRAY, width=1.5, dash="8 6")
    s.ellipse(440, 300, 70, 170, fill=PALE_BLUE, stroke=BLUE, sw=3)
    s.ellipse(560, 300, 60, 150, fill=PALE_GREEN, stroke=GREEN, sw=3)
    for x, label, color in [(465, "H", RED), (540, "H′", PURPLE)]:
        s.line(x, 110, x, 490, color=color, width=3, dash="7 5")
        s.text(x, 95, label, size=22, color=color, anchor="middle", weight="700")
    s.line(620, 120, 620, 505, color=GRAY, width=1.2, dash="5 5")
    s.text(620, 105, "后表面", size=14, color=GRAY, anchor="middle")
    for left, yy, color, label in [(540, 420, PURPLE, "有效焦距 f：从 H′ 量起"),
                                   (620, 480, RED, "后焦距 BFD：从后表面量起")]:
        s.line(left, yy, 820, yy, color=color, width=2.5)
        for x in (left, 820):
            s.line(x, yy - 10, x, yy + 10, color=color, width=2)
        s.text((left + 820) / 2, yy + 26, label, size=15, color=color, anchor="middle")
    s.line(540, 205, 820, 300, color=BLUE, width=2.5)
    s.line(80, 205, 465, 205, color=BLUE, width=2.5)
    s.line(465, 205, 540, 205, color=BLUE, width=1.5, dash="5 4")
    s.circle(820, 300, 4, fill=BLUE, stroke=BLUE)
    s.text(835, 290, "F′", size=18, color=BLUE)
    s.text(500, 535, "镜筒长度、后焦距和有效焦距不是同一个量", size=20, anchor="middle")
    s.save("11_principal_planes.svg")


def figure_11_pupils() -> None:
    s = SVG("图 11.3  孔径光阑、入瞳与出瞳")
    s.line(50, 305, 950, 305, color=GRAY, width=1.5, dash="8 6")
    draw_lens(s, 280, 305, 270, BLUE)
    draw_lens(s, 720, 305, 250, GREEN)
    s.line(500, 220, 500, 390, color=INK, width=10)
    s.text(500, 420, "孔径光阑", size=18, anchor="middle")
    entrance_y = 305 + 85 * 110 / 220
    exit_y = 305 + 85 * 115 / 220
    s.line(170, 610 - entrance_y, 170, entrance_y, color=RED, width=5, dash="6 4")
    s.text(170, 225, "入瞳（前组所成像）", size=16, color=RED, anchor="middle")
    s.line(835, 610 - exit_y, 835, exit_y, color=PURPLE, width=5, dash="6 4")
    s.text(835, 225, "出瞳（后组所成像）", size=16, color=PURPLE, anchor="middle")
    # Trace the upper rim of the stop through each thin lens.  The entrance
    # construction travels toward object space; bending occurs at the lens.
    for lens_x, pupil_x, pupil_y, color in [(280, 170, entrance_y, AMBER),
                                          (720, 835, exit_y, CYAN)]:
        for lens_y in (220, 305):
            s.line(500, 220, lens_x, lens_y, color=color, width=2)
            s.line(lens_x, lens_y, pupil_x, pupil_y, color=color, width=2)
    s.text(500, 535, "f 数使用入瞳直径，不是前玉直径", size=21, anchor="middle")
    s.save("11_pupils.svg")


def bessel_j1(x: float) -> float:
    total = 0.0
    term = x / 2
    for m in range(35):
        if m == 0:
            term = x / 2
        elif m > 0:
            term *= -(x * x / 4) / (m * (m + 1))
        total += term
    return total


def airy_intensity(x: float) -> float:
    if abs(x) < 1e-9:
        return 1.0
    return (2 * bessel_j1(x) / x) ** 2


def figure_12_airy_psf() -> None:
    s = SVG("图 12.1  理想圆孔的 Airy 点扩散函数")
    cx, cy = 275, 290
    for radius in range(124, 1, -2):
        x = radius / 125 * 18
        opacity = min(1.0, 0.01 + 2.0 * math.sqrt(airy_intensity(x)))
        s.circle(cx, cy, radius, stroke=BLUE, sw=2.2, opacity=opacity)
    first_zero_radius = 125 * 3.8317 / 18
    s.circle(cx, cy, first_zero_radius, stroke=RED, sw=1.5, opacity=0.8)
    s.circle(cx, cy, 2.5, fill=BLUE, stroke=BLUE, sw=1)
    s.text(cx, 470, "环纹示意（亮度增强）", size=18, anchor="middle")
    box = (500, 110, 390, 330)
    s.axes(*box, "归一化半径 u = πr/(λN)", "归一化强度")
    xs = [i / 500 * 18 for i in range(501)]
    pts = [(x, airy_intensity(x)) for x in xs]
    s.plot(pts, box, (0, 18, 0, 1.05), color=BLUE, width=3)
    s.line(500 + 3.8317 / 18 * 390, 110, 500 + 3.8317 / 18 * 390, 440, color=RED, width=2, dash="6 5")
    s.text(590, 465, "第一暗环：r = 1.22 λN", size=16, color=RED, anchor="middle")
    s.save("12_airy_psf.svg")


def circular_mtf(rho: float) -> float:
    if rho <= 0:
        return 1.0
    if rho >= 1:
        return 0.0
    return 2 / math.pi * (math.acos(rho) - rho * math.sqrt(1 - rho * rho))


def figure_12_diffraction_mtf() -> None:
    s = SVG("图 12.2  不同 f 数的理想衍射 MTF")
    box = (130, 100, 700, 370)
    s.axes(*box, "空间频率 [lp/mm]", "MTF")
    for n, color in [(4, BLUE), (8, GREEN), (16, RED)]:
        cutoff = 1000 / (0.55 * n)
        xs = [i / 400 * 500 for i in range(401)]
        pts = [(x, circular_mtf(x / cutoff)) for x in xs]
        s.plot(pts, box, (0, 500, 0, 1), color=color, width=3)
        s.text(750, 125 + (n.bit_length() - 3) * 30, f"f/{n}  νc≈{cutoff:.0f}", size=16, color=color)
    s.text(500, 545, "收小光圈使截止频率下降，但实际镜头像差也会同时减小", size=20, anchor="middle")
    s.save("12_diffraction_mtf.svg")


def figure_12_system_mtf() -> None:
    s = SVG("图 12.3  镜头、像素孔径与系统 MTF")
    box = (130, 100, 700, 370)
    s.axes(*box, "归一化到 Nyquist 的频率", "MTF")
    xs = [i / 500 for i in range(501)]
    lens = [(x, max(0, 1 - 0.65 * x**1.5)) for x in xs]
    pixel = [(x, 1 if x == 0 else math.sin(math.pi * x / 2) / (math.pi * x / 2)) for x in xs]
    system = [(x, lens[i][1] * pixel[i][1]) for i, x in enumerate(xs)]
    for pts, color, label, yy in [(lens, BLUE, "镜头", 150), (pixel, GREEN, "像素孔径", 185), (system, RED, "乘积系统", 220)]:
        s.plot(pts, box, (0, 1, 0, 1), color=color, width=3)
        s.text(735, yy, label, size=16, color=color)
    s.line(830, 100, 830, 470, color=GRAY, width=2, dash="6 5")
    s.text(830, 495, "Nyquist", size=15, anchor="middle")
    s.save("12_system_mtf.svg")


def spot_cluster(cx: float, cy: float, kind: str) -> list[tuple[float, float]]:
    pts = []
    for i in range(80):
        a = i * math.pi * (3 - math.sqrt(5))
        r = 3 + 27 * math.sqrt((i + 0.5) / 80)
        if kind == "spherical":
            x, y = cx + r * math.cos(a), cy + r * math.sin(a)
        elif kind == "coma":
            x = cx + 0.7 * r * math.cos(a) + 0.025 * r * r
            y = cy + 0.45 * r * math.sin(a)
        elif kind == "astig_s":
            x, y = cx + 1.7 * r * math.cos(a), cy + 0.25 * r * math.sin(a)
        elif kind == "astig_t":
            x, y = cx + 0.25 * r * math.cos(a), cy + 1.7 * r * math.sin(a)
        else:
            x, y = cx + r * math.cos(a), cy + r * math.sin(a)
        pts.append((x, y))
    return pts


def figure_13_aberration_spots() -> None:
    s = SVG("图 13.1  典型像差的点列形态示意")
    panels = [(35, "球差", "spherical"), (280, "彗差", "coma"), (525, "弧矢像散", "astig_s"), (770, "切向像散", "astig_t")]
    for x, title, kind in panels:
        s.panel(x, 105, 195, 365, title)
        cx, cy = x + 98, 300
        for px, py in spot_cluster(cx, cy, kind):
            s.circle(px, py, 2.2, fill=BLUE, stroke=BLUE, sw=0.4, opacity=0.65)
        s.circle(cx, cy, 50, stroke=GRAY, sw=1, opacity=0.5)
    s.text(500, 535, "点列为机制示意；真实形状由完整处方、光阑和波长决定", size=19, anchor="middle")
    s.save("13_aberration_spots.svg")


def figure_13_field_curvature() -> None:
    s = SVG("图 13.2  场曲与同一平面测试")
    s.line(80, 300, 920, 300, color=GRAY, width=1.5, dash="8 6")
    draw_lens(s, 300, 300, 300)
    curve = [(700 + 75 * (1 - math.cos(t)), 300 + 175 * math.sin(t)) for t in [(-1.1 + i / 60 * 2.2) for i in range(61)]]
    s.polyline(curve, color=BLUE, width=5)
    s.line(805, 105, 805, 495, color=RED, width=5)
    for y in [145, 225, 300, 375, 455]:
        target_x = 700 + 75 * (1 - math.cos((y - 300) / 175))
        s.line(300, 300, target_x, y, color=GREEN, width=1.8)
    s.text(660, 90, "逐像高最佳焦面", size=17, color=BLUE)
    s.text(820, 90, "平面靶 / 传感器", size=17, color=RED)
    s.text(500, 540, "边缘重新对焦后的性能可把场曲与局部像差分开", size=20, anchor="middle")
    s.save("13_field_curvature.svg")


def distorted_grid(panel_x: float, panel_y: float, k: float) -> list[list[tuple[float, float]]]:
    curves: list[list[tuple[float, float]]] = []
    cx, cy, scale = panel_x + 125, panel_y + 150, 105
    for fixed in [-1, -0.5, 0, 0.5, 1]:
        for vertical in [True, False]:
            pts = []
            for j in range(41):
                t = -1 + j / 20
                x, y = (fixed, t) if vertical else (t, fixed)
                r2 = x * x + y * y
                fac = 1 + k * r2
                pts.append((cx + scale * x * fac, cy + scale * y * fac))
            curves.append(pts)
    return curves


def figure_13_distortion_grid() -> None:
    s = SVG("图 13.3  桶形与枕形畸变的网格映射")
    for x, title, k, color in [(55, "无畸变", 0, GRAY), (365, "桶形", -0.16, BLUE), (675, "枕形", 0.13, RED)]:
        s.panel(x, 100, 270, 380, title)
        for curve in distorted_grid(x + 10, 130, k):
            s.polyline(curve, color=color, width=1.7)
    s.text(500, 535, "畸变改变位置映射；数字反变换还会重采样并改变边缘像素密度", size=19, anchor="middle")
    s.save("13_distortion_grid.svg")


def figure_14_glass_map() -> None:
    s = SVG("图 14.1  折射率--Abbe 数玻璃图")
    box = (130, 100, 700, 370)
    s.axes(*box, "Abbe 数 Vd", "折射率 nd")
    points = [
        (25, 1.78, "高折射 Flint", RED), (35, 1.68, "Flint", AMBER),
        (45, 1.62, "Dense crown", PURPLE), (60, 1.52, "Crown", BLUE),
        (75, 1.49, "低色散玻璃", GREEN), (95, 1.43, "CaF₂", CYAN),
    ]
    for vx, nd, label, color in points:
        px = box[0] + (vx - 20) / 80 * box[2]
        py = box[1] + box[3] - (nd - 1.4) / 0.42 * box[3]
        s.circle(px, py, 8, fill=color, stroke=color)
        s.text(px + 10, py - 10, label, size=14, color=color)
    s.text(500, 545, "位置为教学示意；实际设计必须查材料目录与完整色散曲线", size=19, anchor="middle")
    s.save("14_glass_map.svg")


def figure_14_achromat() -> None:
    s = SVG("图 14.2  正低色散片与负高色散片组成消色差双片")
    axis = 310
    s.line(70, axis, 930, axis, color=GRAY, width=1.5, dash="8 6")
    s.ellipse(430, axis, 35, 165, fill=PALE_BLUE, stroke=BLUE, sw=3)
    s.add(f'<path d="M470,165 Q512,310 470,455 L530,455 Q488,310 530,165 Z" '
          f'fill="{PALE_RED}" stroke="{RED}" stroke-width="3"/>')
    s.text(430, 500, "+Φ₁ / 高 V₁", size=17, color=BLUE, anchor="middle")
    s.text(500, 535, "−Φ₂ / 低 V₂", size=17, color=RED, anchor="middle")
    for y, color, focus_y in [(210, BLUE, 310), (255, RED, 310)]:
        after_positive = axis + (y - axis) * (1 - 70 / 200)
        s.line(80, y, 430, y, color=color, width=2.5)
        s.line(430, y, 500, after_positive, color=color, width=2.5)
        s.line(500, after_positive, 820, focus_y, color=color, width=2.5)
    s.circle(820, axis, 7, fill=GREEN, stroke=GREEN)
    s.text(820, 350, "F、C 两线共焦", size=18, color=GREEN, anchor="middle")
    s.text(670, 125, "Φ₁/V₁ + Φ₂/V₂ = 0", size=22, anchor="middle", weight="700")
    s.save("14_achromat.svg")


def figure_15_asphere_profile() -> None:
    s = SVG("图 15.1  球面与非球面的矢高差")
    box = (130, 100, 700, 370)
    s.axes(*box, "归一化径向坐标 r", "归一化矢高 z")
    xs = [i / 300 for i in range(301)]
    curvature = 0.7
    sphere = [(x, curvature * x * x / (1 + math.sqrt(1 - curvature**2 * x**2))) for x in xs]
    asphere = [(x, z - 0.11 * x**4) for x, z in sphere]
    s.plot(sphere, box, (0, 1, 0, 0.45), color=BLUE, width=4)
    s.plot(asphere, box, (0, 1, 0, 0.45), color=RED, width=4)
    s.text(695, 145, "球面", size=17, color=BLUE)
    s.text(700, 270, "非球面", size=17, color=RED)
    s.text(500, 545, "边缘矢高的微小改变可重新分配大孔径光线", size=20, anchor="middle")
    s.save("15_asphere_profile.svg")


def figure_15_pf_dispersion() -> None:
    s = SVG("图 15.2  折射元件与 PF 元件的相反色散")
    s.panel(45, 85, 285, 410, "正折射透镜")
    s.panel(357, 85, 285, 410, "正 PF 元件")
    s.panel(670, 85, 285, 410, "组合校色")
    for base_x, pf, combined in [(45, False, False), (357, True, False), (670, False, True)]:
        lx = base_x + 100
        s.line(base_x + 25, 300, base_x + 260, 300, color=GRAY, width=1, dash="6 5")
        s.line(lx, 175, lx, 425, color=INK, width=5)
        if combined:
            s.line(lx + 35, 190, lx + 35, 410, color=PURPLE, width=5)
        blue_focus = base_x + (175 if not pf else 235)
        red_focus = base_x + (235 if not pf else 175)
        if combined:
            blue_focus = red_focus = base_x + 225
        for y, color, focus in [(230, BLUE, blue_focus), (370, RED, red_focus)]:
            s.line(base_x + 25, y, lx, y, color=color, width=2.5)
            if combined:
                refractive_f = 180 if color == BLUE else 225
                second_y = 300 + (y - 300) * (1 - 35 / refractive_f)
                s.line(lx, y, lx + 35, second_y, color=color, width=2.5)
                s.line(lx + 35, second_y, focus, 300, color=color, width=2.5)
            else:
                s.line(lx, y, focus, 300, color=color, width=2.5)
        s.circle(blue_focus, 300, 5, fill=BLUE, stroke=BLUE)
        s.circle(red_focus, 300, 5, fill=RED, stroke=RED)
    s.text(500, 555, "PF：f(λ) ∝ 1/λ；与普通折射色差配对后可减轻长焦校色负担", size=19, anchor="middle")
    s.save("15_pf_dispersion.svg")


def figure_15_ar_coating() -> None:
    s = SVG("图 15.3  四分之一波长增透膜的反射相消")
    s.rect(150, 300, 700, 180, fill=PALE_BLUE, stroke=BLUE, sw=2)
    s.text(500, 450, "玻璃 ns", size=22, color=BLUE, anchor="middle")
    s.rect(150, 230, 700, 70, fill=PALE_GREEN, stroke=GREEN, sw=2)
    s.text(500, 275, "膜层 nc，光学厚度 λ/4", size=20, color=GREEN, anchor="middle")
    s.text(500, 120, "空气 n₀", size=20, anchor="middle")
    s.arrow(340, 90, 340, 230, color=AMBER, width=4)
    s.arrow(340, 230, 340, 145, color=RED, width=3)
    s.arrow(620, 90, 620, 300, color=AMBER, width=4)
    s.arrow(620, 300, 620, 145, color=BLUE, width=3)
    s.text(185, 170, "上界面反射", size=16, color=RED)
    s.text(650, 170, "膜内往返后反射", size=16, color=BLUE)
    s.text(500, 510, "两条正入射光程并列示意；出射反射波叠加", size=17, anchor="middle")
    s.text(500, 550, "设计波长正入射时，nc² = n₀ns 使总反射振幅为零", size=19, anchor="middle")
    s.save("15_ar_coating.svg")


def figure_16_lens_architectures() -> None:
    s = SVG("图 16.1  双高斯、反望远与望远型的光焦度布局")
    architectures = [
        (75, "双高斯", [("+", BLUE), ("−", RED), ("|", INK), ("−", RED), ("+", BLUE)]),
        (375, "反望远", [("−", RED), ("−", RED), ("|", INK), ("+", BLUE), ("+", BLUE)]),
        (675, "望远", [("+", BLUE), ("+", BLUE), ("|", INK), ("−", RED), ("−", RED)]),
    ]
    for x, title, groups in architectures:
        s.panel(x, 100, 250, 350, title)
        gx = x + 28
        for symbol, color in groups:
            if symbol == "|":
                s.line(gx + 15, 210, gx + 15, 350, color=INK, width=5)
            else:
                s.ellipse(gx + 15, 280, 16, 70 if symbol == "+" else 55, fill=PALE_BLUE if symbol == "+" else PALE_RED, stroke=color, sw=3)
                s.text(gx + 15, 288, symbol, size=22, color=color, anchor="middle", weight="700")
            gx += 42
        s.line(x + 15, 280, x + 235, 280, color=GRAY, width=1, dash="5 4")
    s.text(500, 520, "符号只表示一阶光焦度；真实镜片形状和像差校正远更复杂", size=19, anchor="middle")
    s.save("16_lens_architectures.svg")


def figure_16_depth_of_field() -> None:
    s = SVG("图 16.2  对焦平面前后的弥散圈")
    lens_x, sensor_x, axis = 300, 760, 300
    s.line(70, axis, 930, axis, color=GRAY, width=1.5, dash="8 6")
    draw_lens(s, lens_x, axis, 260)
    s.line(sensor_x, 120, sensor_x, 480, color=INK, width=5)
    s.text(sensor_x, 510, "传感器", size=17, anchor="middle")
    cases = [(575, RED, "远物：焦点在前"), (760, GREEN, "对焦物：焦点在面上"), (900, BLUE, "近物：焦点在后")]
    for focus_x, color, label in cases:
        end_x = max(sensor_x + 35, focus_x)
        for aperture_y in (205, 395):
            end_y = axis + (aperture_y - axis) * (1 - (end_x - lens_x) / (focus_x - lens_x))
            s.line(lens_x, aperture_y, end_x, end_y, color=color, width=2.2)
        s.circle(focus_x, axis, 3, fill=color, stroke=color)
        if focus_x != sensor_x:
            radius = 95 * abs(1 - (sensor_x - lens_x) / (focus_x - lens_x))
            s.line(sensor_x, axis - radius, sensor_x, axis + radius, color=color, width=5)
            for yy in (axis - radius, axis + radius):
                s.line(sensor_x - 8, yy, sensor_x + 8, yy, color=color, width=3)
        s.text(focus_x if focus_x < 850 else 890, 90 + 30 * cases.index((focus_x, color, label)), label, size=15, color=color, anchor="middle")
    s.text(500, 555, "景深是弥散圈低于所选阈值 c₀ 的物距范围", size=20, anchor="middle")
    s.save("16_depth_of_field.svg")


def figure_16_stabilization() -> None:
    s = SVG("图 16.3  角抖动、像移与防抖补偿")
    s.panel(55, 95, 420, 390, "未补偿")
    s.panel(525, 95, 420, 390, "移动光学组 / 传感器补偿")
    for base_x, compensated in [(55, False), (525, True)]:
        lx, sx, axis = base_x + 150, base_x + 350, 300
        lens_center = axis - (20 if compensated else 0)
        s.ellipse(lx, lens_center, 22, 130, fill=PALE_BLUE, stroke=BLUE, sw=3)
        s.line(sx, 155, sx, 445, color=INK, width=4)
        s.line(base_x + 30, 263, lx, 275, color=RED, width=2.5)
        target_y = 300 if compensated else 320
        s.line(lx, 275, sx, target_y, color=RED, width=3)
        s.circle(sx, target_y, 8, fill=RED, stroke=RED)
        if compensated:
            s.arrow(lx, 420, lx, 385, color=GREEN, width=4)
            s.text(lx + 25, 420, "补偿位移", size=15, color=GREEN)
        else:
            s.line(sx - 30, 300, sx + 30, 300, color=GREEN, width=3, dash="5 4")
            s.text(sx - 40, 290, "理想位置", size=14, color=GREEN, anchor="end")
    s.text(500, 545, "小角度像移 Δx ≈ fθ；防抖不冻结主体运动", size=20, anchor="middle")
    s.save("16_stabilization.svg")


def figure_17_mtf_chart() -> None:
    s = SVG("图 17.1  厂商像高 MTF 图的读法")
    box = (130, 100, 700, 370)
    s.axes(*box, "像高：中心 → 角落 [mm]", "MTF")
    xs = [i / 300 * 21.6 for i in range(301)]
    curves = [
        ([(x, 0.95 - 0.12 * (x / 21.6) ** 2) for x in xs], BLUE, "10 lp/mm S"),
        ([(x, 0.95 - 0.20 * (x / 21.6) ** 2) for x in xs], CYAN, "10 lp/mm T"),
        ([(x, 0.78 - 0.32 * (x / 21.6) ** 1.6) for x in xs], RED, "40 lp/mm S"),
        ([(x, 0.78 - 0.48 * (x / 21.6) ** 1.5) for x in xs], AMBER, "40 lp/mm T"),
    ]
    for idx, (pts, color, label) in enumerate(curves):
        s.plot(pts, box, (0, 21.6, 0, 1), color=color, width=3, dash=None if idx % 2 == 0 else "7 5")
        s.text(690, 130 + idx * 30, label, size=15, color=color)
    s.text(500, 545, "比较前先统一频率、光圈、物距、波长以及设计值/实测值", size=19, anchor="middle")
    s.save("17_mtf_chart.svg")


def figure_17_slanted_edge_pipeline() -> None:
    s = SVG("图 17.2  斜边法的 ESF--LSF--MTF 流程")
    panels = [(35, "斜边图像"), (280, "ESF"), (525, "LSF = d(ESF)/dx"), (770, "|FFT(LSF)|")]
    for x, title in panels:
        s.panel(x, 105, 195, 340, title)
    s.polygon([(65, 390), (65, 155), (200, 155), (160, 390)], fill=INK, stroke=INK)
    s.line(160, 390, 200, 155, color=RED, width=3)
    box1 = (300, 175, 155, 200)
    box2 = (545, 175, 155, 200)
    box3 = (790, 175, 155, 200)
    xs = [i / 200 * 8 - 4 for i in range(201)]
    esf = [(x, 0.5 * (1 + math.erf(x / math.sqrt(2)))) for x in xs]
    lsf = [(x, math.exp(-0.5 * x*x) / math.sqrt(2 * math.pi)) for x in xs]
    mtf = [(i / 200, math.exp(-2 * math.pi**2 * (i / 200)**2)) for i in range(201)]
    s.plot(esf, box1, (-4, 4, 0, 1), color=BLUE, width=3)
    s.plot(lsf, box2, (-4, 4, 0, 0.55), color=RED, width=3)
    s.plot(mtf, box3, (0, 1, 0, 1), color=GREEN, width=3)
    for x in [230, 475, 720]:
        s.arrow(x, 275, x + 38, 275, color=GRAY)
    s.text(500, 525, "测试得到的是相机系统响应；RAW 解码和锐化必须记录", size=20, anchor="middle")
    s.save("17_slanted_edge_pipeline.svg")


def figure_17_test_protocol() -> None:
    s = SVG("图 17.3  镜头测试中必须分离的误差来源")
    center = (500, 285)
    s.circle(*center, 75, fill=LIGHT, stroke=INK, sw=3)
    s.text(center[0], center[1] - 5, "测得的", size=20, anchor="middle", weight="700")
    s.text(center[0], center[1] + 25, "系统 MTF", size=20, anchor="middle", weight="700")
    nodes = [
        (170, 145, "镜头像差", BLUE), (500, 95, "对焦误差", RED), (830, 145, "样品偏心", PURPLE),
        (170, 430, "测试靶 / 空气", GREEN), (500, 500, "传感器采样", AMBER), (830, 430, "RAW 解码 / 锐化", CYAN),
    ]
    for x, y, label, color in nodes:
        s.rect(x - 80, y - 35, 160, 70, fill="#fbfcfe", stroke=color, sw=2.5)
        s.text(x, y + 7, label, size=17, color=color, anchor="middle", weight="700")
        s.arrow(x, y + (35 if y < center[1] else -35), center[0] + (0.75 * (x - center[0]) / 4), center[1] + (0.75 * (y - center[1]) / 4), color=color, width=2)
    s.text(500, 575, "旋转、重复装卸、对焦包围和多样品统计用于分离这些来源", size=19, anchor="middle")
    s.save("17_test_protocol.svg")


FIGURES = [
    figure_01_radiance_geometry,
    figure_01_fnumber_exposure,
    figure_02_photon_electron_chain,
    figure_02_4t_pixel,
    figure_02_shot_noise,
    figure_03_readout_chain,
    figure_03_quantization_gain,
    figure_04_noise_budget,
    figure_04_photon_transfer_curve,
    figure_04_dynamic_range,
    figure_05_gain_placement,
    figure_05_dual_conversion_gain,
    figure_05_ei_headroom,
    figure_06_shutter_timing,
    figure_06_rolling_skew,
    figure_06_sensor_structures,
    figure_06_curved_sensor,
    figure_07_bayer_sampling,
    figure_07_aliasing,
    figure_07_spectral_channels,
    figure_08_stack_snr,
    figure_08_hdr_exposure_windows,
    figure_08_hdr_ghosting,
    figure_09_transfer_curves,
    figure_09_codes_per_stop,
    figure_09_ei_allocation,
    figure_10_raw_pipeline,
    figure_10_raw_bit_packing,
    figure_11_thin_lens_rays,
    figure_11_principal_planes,
    figure_11_pupils,
    figure_12_airy_psf,
    figure_12_diffraction_mtf,
    figure_12_system_mtf,
    figure_13_aberration_spots,
    figure_13_field_curvature,
    figure_13_distortion_grid,
    figure_14_glass_map,
    figure_14_achromat,
    figure_15_asphere_profile,
    figure_15_pf_dispersion,
    figure_15_ar_coating,
    figure_16_lens_architectures,
    figure_16_depth_of_field,
    figure_16_stabilization,
    figure_17_mtf_chart,
    figure_17_slanted_edge_pipeline,
    figure_17_test_protocol,
]


def main() -> None:
    for render in FIGURES:
        render()
    print(f"generated_figures={len(FIGURES)}")


if __name__ == "__main__":
    main()
