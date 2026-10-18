#!/usr/bin/env python3
"""Generate deterministic SVG figures for the photographic imaging textbook."""

from __future__ import annotations

import html
import math
import base64
import struct
import zlib
from pathlib import Path


OUT = Path(__file__).resolve().parent
W, H = 1000, 600
INK = "#25303b"
BLUE = "#316fa4"
CYAN = "#388e9f"
GREEN = "#3c9168"
RED = "#bd5b54"
AMBER = "#be8a39"
PURPLE = "#8971ac"
GRAY = "#7a8590"
LIGHT = "#edf0f4"
PALE_BLUE = "#e7eff7"
PALE_GREEN = "#e9f3ed"
PALE_RED = "#f7eae7"
PALE_AMBER = "#f7f0e1"


class SVG:
    def __init__(self, title: str, width: int = W, height: int = H) -> None:
        self.width = width
        self.height = height
        self.axes_boxes = set()
        self.grids = set()
        self.arrow_markers = set()
        self.parts = [
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
            f'viewBox="0 0 {width} {height}" role="img" aria-label="{html.escape(title)}">',
            "<defs>",
            '<marker id="arrow" markerWidth="9" markerHeight="9" refX="7" refY="3" '
            'orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L8,3 z" fill="context-stroke"/></marker>',
            '<marker id="arrow-open" markerWidth="9" markerHeight="9" refX="7" refY="3" '
            'orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,3 L0,6" fill="none" stroke="context-stroke"/></marker>',
            "</defs>",
            f'<rect width="{width}" height="{height}" fill="#fafbfc"/>',
            f'<rect x="8" y="8" width="{width-16}" height="{height-16}" rx="12" fill="#fff" stroke="#e6e9ed"/>',
        ]
        self.text(36, 39, title, size=25, weight="600")
        self.line(36, 60, width-36, 60, color=LIGHT, width=1)

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
        marker = ""
        if arrow:
            marker_id = f'arrow-{color.lstrip("#")}-{width:g}'
            if marker_id not in self.arrow_markers:
                self.arrow_markers.add(marker_id)
                size = min(15, max(9, 5+width*2))
                self.add(f'<defs><marker id="{marker_id}" markerWidth="{size}" markerHeight="{size}" refX="{size-1}" refY="{size/2}" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1L{size-1} {size/2}L1 {size-1}Z" fill="{color}"/></marker></defs>')
            marker = f' marker-end="url(#{marker_id})"'
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
        self.axes_boxes.add((x,y,width,height))
        self.arrow(x, y + height, x + width, y + height, color=INK, width=1.8)
        self.arrow(x, y + height, x, y, color=INK, width=1.8)
        self.text(x + width / 2, y + height + 42, xlabel, size=16, anchor="middle")
        self.text(x - 66, y + height / 2, ylabel, size=16, anchor="middle", rotate=-90)

    def grid(self, box, domain, xticks=None, yticks=None, xfmt=None, yfmt=None):
        x,y,w,h = box
        xmin,xmax,ymin,ymax = domain
        def readable_ticks(lo, hi):
            target = (hi - lo) / 4
            magnitude = 10 ** math.floor(math.log10(target))
            step = min((1, 2, 2.5, 5, 10), key=lambda v: abs(math.log(v * magnitude / target))) * magnitude
            first = math.ceil(lo / step - 1e-10)
            last = math.floor(hi / step + 1e-10)
            return [i * step for i in range(first, last + 1)]

        xticks = xticks if xticks is not None else readable_ticks(xmin, xmax)
        yticks = yticks if yticks is not None else readable_ticks(ymin, ymax)
        for v in xticks:
            px=x+(v-xmin)/(xmax-xmin)*w
            self.line(px,y,px,y+h,color=GRAY,width=.8,opacity=.14)
            self.text(px,y+h+21,xfmt(v) if xfmt else f'{v:g}',size=15,color=GRAY,anchor='middle')
        for v in yticks:
            py=y+h-(v-ymin)/(ymax-ymin)*h
            self.line(x,py,x+w,py,color=GRAY,width=.8,opacity=.14)
            self.text(x-12,py+5,yfmt(v) if yfmt else f'{v:g}',size=15,color=GRAY,anchor='end')
        self.grids.add(tuple(box))

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
        if tuple(box) in self.axes_boxes and tuple(box) not in self.grids:
            self.grid(box,domain)
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
        self.rect(x, y, width, height, fill="#fbfcfd", stroke="#d5dce4", sw=1, radius=9)
        self.text(x + width / 2, y + 29, title, size=18, weight="600", anchor="middle")

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
    s.panel(35, 90, 545, 335, "积累电荷 → 转移到浮动扩散区")
    s.panel(615, 90, 350, 335, "缓冲电压 → 选择列读出")
    s.rect(65, 225, 485, 145, fill=PALE_BLUE, stroke=BLUE, sw=1, radius=8)
    s.rect(90, 263, 180, 75, fill="#c5daec", stroke=BLUE, radius=22)
    s.text(180, 291, "PPD", size=23, color=BLUE, anchor="middle", weight="600")
    s.text(180, 320, "存储光生电荷", size=16, anchor="middle")
    s.rect(303, 210, 74, 25, fill=PALE_AMBER, stroke=AMBER, radius=2)
    s.text(340, 197, "TX 转移门", size=18, color=AMBER, anchor="middle")
    s.arrow(280, 284, 402, 284, color=AMBER, width=3)
    s.circle(435, 284, 25, fill=PALE_RED, stroke=RED, sw=2)
    s.text(435, 291, "FD", size=19, color=RED, anchor="middle", weight="600")
    s.text(435, 339, "电荷 → 电压", size=16, anchor="middle")
    s.rect(395, 144, 80, 40, fill=LIGHT, stroke=GRAY)
    s.text(435, 170, "RST", size=18, anchor="middle", weight="600")
    s.arrow(435, 184, 435, 251, color=GRAY)
    for x,label,fill,color in [(650,"SF",PALE_GREEN,GREEN),(817,"SEL",PALE_BLUE,BLUE)]:
        s.rect(x,241,106,86,fill=fill,stroke=color,radius=8)
        s.text(x+53,279,label,size=22,color=color,anchor="middle",weight="600")
        s.text(x+53,309,"源跟随" if label=="SF" else "行选通",size=16,anchor="middle")
    s.arrow(464,284,638,284,color=GRAY)
    s.arrow(756,284,805,284,color=GRAY)
    s.arrow(923,284,950,284,color=GRAY)
    s.text(932,360,"列线",size=17,anchor="middle")
    s.text(500,493,"转换增益 K ≈ q/CFD：较小的FD电容给出较大的单位电荷电压变化",size=20,anchor="middle")
    s.text(500,548,"功能连接示意；RST复位FD，TX控制电荷转移，SF与SEL完成电压读出",size=18,color=GRAY,anchor="middle")
    s.save("02_4t_pixel.svg")


def figure_02_shot_noise() -> None:
    s = SVG("图 2.2  散粒噪声的绝对幅度与相对幅度")
    samples = [100, 400, 1600, 6400]
    for box, label, ylabel, fn, ymax, color, yticks in [
        ((110, 140, 355, 290), "绝对噪声", "标准差 σshot [e⁻ rms]",
         lambda mu: math.sqrt(mu), 85, BLUE, [0, 20, 40, 60, 80]),
        ((600, 140, 355, 290), "相对噪声", "标准差 / 平均信号 [%]",
         lambda mu: 100 / math.sqrt(mu), 10.5, RED, [0, 2.5, 5, 7.5, 10]),
    ]:
        x, y, w, h = box
        s.text(x + w / 2, 102, label, size=21, anchor="middle", weight="600")
        s.axes(*box, "平均电子数 μe（对数刻度）", ylabel)
        s.grid(box, (0, 3, 0, ymax), xticks=[0, 1, 2, 3],
               yticks=yticks, xfmt=lambda u: str(round(100 * 4 ** u)))
        values = [(3 * i / 180, fn(100 * 4 ** (3 * i / 180))) for i in range(181)]
        s.plot(values, box, (0, 3, 0, ymax), color=color)
        for i, mu in enumerate(samples):
            value = fn(mu)
            px, py = x + i * w / 3, y + h - h * value / ymax
            s.circle(px, py, 4.5, fill=color, stroke="#fff", sw=1)
            s.text(px, py - 13, f"{value:g}" + ("%" if color == RED else ""),
                   size=17, color=color, anchor="middle")
    s.text(500, 526, "均值增至4倍：标准差增至2倍，相对噪声减半", size=22, anchor="middle", weight="600")
    s.text(500, 562, "Poisson模型；仅含散粒噪声，SNR = μe / σshot = √μe", size=18, color=GRAY, anchor="middle")
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
    box = (130, 95, 700, 365)
    s.axes(*box, "归一化输入电压", "归一化输出码值")
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
    s.axes(*box, "信号电子 μe / e⁻（对数刻度）", "噪声 rms / e⁻（对数刻度）")
    ts = [i / 500 * 5 for i in range(501)]
    read = [(t, math.log10(3)) for t in ts]
    shot = [(t, math.log10(math.sqrt(10**t))) for t in ts]
    prnu = [(t, math.log10(0.01 * 10**t)) for t in ts]
    domain = (0, 5, -2.2, 3.2)
    s.grid(box, domain, xticks=[0,1,2,3,4,5], yticks=[-2,-1,0,1,2,3], xfmt=lambda v:f"10^{v:g}", yfmt=lambda v:f"10^{v:g}")
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
    s.axes(*box, "相对输入电子数", "相对FD输出电压")
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
    s.text(740, 440, "xj = x0 + v(t0 + jΔt + Te/2)", size=19, color=RED, anchor="middle")
    s.save("06_rolling_skew.svg")


def figure_06_sensor_structures() -> None:
    s=SVG("图 6.3  FSI、BSI 与逻辑堆栈的层次区别")
    for x,title,back,stacked in [(35,"FSI",False,False),(350,"BSI",True,False),(665,"BSI + 逻辑堆栈",True,True)]:
        s.panel(x,85,285,410,title)
        for j in range(3):
            a=x+46+j*64
            s.add(f'<path d="M{a},163 Q{a+24},127 {a+48},163 Z" fill="{PALE_BLUE}" stroke="{BLUE}" stroke-width="1.4"/>')
            s.rect(a,170,48,15,fill=[RED,GREEN,BLUE][j],stroke="none",radius=1,opacity=.45)
        sy,sh=(268,126) if not back else ((211,100) if stacked else (211,128))
        my=211 if not back else (321 if stacked else 354)
        s.rect(x+32,sy,221,sh,fill=PALE_BLUE,stroke=BLUE,sw=1,radius=3)
        s.text(x+222,sy+23,"光敏硅",size=15,color=BLUE,anchor="end")
        pd=sy+sh*.63
        for center in [x+70,x+142,x+215]:
            s.rect(center-22,pd-12,44,24,fill="#b7d4e5",stroke=BLUE,sw=1,radius=11)
        s.text(x+143,pd+33,"PPD",size=15,color=BLUE,anchor="middle")
        s.rect(x+32,my,221,40,fill=PALE_AMBER,stroke=AMBER,sw=1,radius=3)
        for yy in [my+9,my+26]:
            s.rect(x+37,yy,74,6,fill=AMBER,stroke="none",radius=0)
            s.rect(x+173,yy,74,6,fill=AMBER,stroke="none",radius=0)
        s.text(x+221,my+57 if not back else my-7,"布线 / 晶体管",size=14,color=AMBER,anchor="end")
        s.arrow(x+143,137,x+143,pd-17,color=AMBER,width=2.5)
        target=432 if stacked else my+20
        s.polyline([(x+173,pd),(x+240,pd),(x+240,target)],color=BLUE,width=2,dash="5 4")
        s.circle(x+240,target,3,fill=BLUE,stroke=BLUE)
        if stacked:
            s.rect(x+32,369,221,19,fill="#eee6f4",stroke=PURPLE,sw=1)
            for a in [x+70,x+143,x+225]:s.line(a,369,a,388,color=PURPLE,width=4)
            s.rect(x+32,398,221,64,fill=PALE_GREEN,stroke=GREEN,sw=1)
            s.text(x+142,441,"逻辑 / ADC",size=16,anchor="middle")
            s.text(x+53,384,"键合",size=12,color=PURPLE)
        else:
            s.text(x+142,470,"像素与读出同片",size=16,anchor="middle")
    s.text(500,535,"FSI/BSI 区分入光侧；堆栈区分像素与逻辑的晶圆分工",size=20,anchor="middle")
    s.text(500,565,"橙线：入光；蓝线：电信号。功能层序示意，非工艺比例。",size=17,color=GRAY,anchor="middle")
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
    s.text(500, 545, "曲线为示意函数，峰值与带宽由本例指定", size=19, anchor="middle")
    s.save("07_spectral_channels.svg")


def figure_08_stack_snr() -> None:
    s = SVG("图 8.1  独立多帧平均的平方根收益")
    box = (130, 100, 700, 370)
    s.axes(*box, "帧数 m", "相对 SNR")
    xs = list(range(1, 65))
    pts = [(x, math.sqrt(x)) for x in xs]
    s.grid(box,(1,64,0,8.5),xticks=[1,16,32,48,64],yticks=[0,2,4,6,8])
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
    s=SVG("图 8.3  多曝光运动导致鬼影")
    def person(cx,color,opacity=1):
        s.circle(cx,247,18,fill=color,stroke="none",opacity=opacity)
        s.add(f'<path d="M{cx-13},272 Q{cx},260 {cx+15},276 L{cx+9},330 L{cx-15},330 Z" fill="{color}" opacity="{opacity}"/>')
        for points in [[(cx-10,279),(cx-31,305),(cx-19,325)],[(cx+12,280),(cx+35,301),(cx+48,284)],[(cx-8,327),(cx-29,365),(cx-47,392)],[(cx+7,327),(cx+22,364),(cx+48,379)]]:
            s.polyline(points,color=color,width=9,opacity=opacity)
    for i,(x,title) in enumerate([(35,"短曝光 t₁"),(365,"长曝光 t₂"),(695,"直接叠加")]):
        s.panel(x,100,270,390,title)
        for dx in [22,175]:
            s.rect(x+dx,188,55,126,fill=LIGHT,stroke="none",radius=3)
            for yy in [206,239,272]:s.line(x+dx+10,yy,x+dx+45,yy,color="#fff",width=4)
        s.line(x+17,394,x+253,394,color=GRAY,width=1.2,opacity=.5)
        if i==0:person(x+103,BLUE)
        elif i==1:person(x+157,RED)
        else:
            person(x+103,BLUE,.45);person(x+157,RED,.45)
        s.text(x+135,451,["背景与主体处于 t₁","背景不变，主体已位移","静态背景重合，主体出现双像"][i],size=16,anchor="middle")
    s.text(500,548,"两种线色标识拍摄时刻；叠加示意不指定实际HDR融合权重",size=19,anchor="middle")
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
    s=SVG("图 9.2  线性与 Log 的每档码值分配")
    s.text(188,116,"六档等宽曝光区间，由低信号向高信号排列",size=19,color=GRAY)
    for y,logarithmic,color,label in [(170,False,BLUE,"线性编码"),(340,True,RED,"Log 编码")]:
        s.text(55,y+42,label,size=21,weight="600")
        start=188
        for i in range(6):
            share=1 if logarithmic else 2**i
            width=744*(share/(6 if logarithmic else 63))
            s.rect(start,y,width,72,fill=color,stroke="#fff",sw=1,radius=0,opacity=.58+.06*i)
            s.text(start+width/2,y+44,str(share),size=15,color="#fff",anchor="middle",weight="600")
            start+=width
        s.text(188,y+108,"码宽比 1 : 1 : 1 : 1 : 1 : 1" if logarithmic else "码宽比 1 : 2 : 4 : 8 : 16 : 32",size=19,color=color)
    s.text(500,520,"色块长度表示各曝光档占用的码宽；数字为归一化比例",size=20,anchor="middle")
    s.text(500,555,"Log在对数区近似均匀分配码字；有限位深与曲线参数决定实际分配",size=18,color=GRAY,anchor="middle")
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
    s.text(500, 500, "RAW 的含义由文件字段与已经执行的处理共同规定", size=22, anchor="middle")
    s.save("10_raw_pipeline.svg")


def figure_10_raw_bit_packing() -> None:
    s=SVG("图 10.2  两个 12-bit 样本打包为三个字节")
    a,b=0xabc,0x123
    for x,value,label,color in [(100,a,"A = 0xabc",BLUE),(550,b,"B = 0x123",RED)]:
        s.text(x,119,label,size=21,color=color,weight="600")
        for j in range(12):
            bit=11-j
            s.text(x+j*27+13.5,151,str(bit),size=12,color=GRAY,anchor="middle")
            s.rect(x+j*27,162,27,46,fill=PALE_BLUE if color==BLUE else PALE_RED,stroke=color,sw=.8,radius=0)
            s.text(x+j*27+13.5,192,str((value>>bit)&1),size=18,anchor="middle")
    byte_values=[a&255,((b&15)<<4)|((a>>8)&15),(b>>4)&255]
    for i,(x,value) in enumerate(zip([100,390,680],byte_values)):
        s.text(x,310,f"Byte {i} = 0x{value:02x}",size=20,weight="600")
        for j in range(8):
            color=BLUE if i==0 or (i==1 and j>=4) else RED
            s.rect(x+j*27,330,27,54,fill=PALE_BLUE if color==BLUE else PALE_RED,stroke=color,sw=.8,radius=0)
            s.text(x+j*27+13.5,364,str((value>>(7-j))&1),size=18,anchor="middle")
        s.text(x+108,414,["A 的低8位","B低4位 | A高4位","B 的高8位"][i],size=17,anchor="middle")
    s.arrow(250,224,208,286,color=BLUE)
    s.arrow(160,224,485,286,color=BLUE)
    s.arrow(825,224,523,286,color=RED)
    s.arrow(710,224,788,286,color=RED)
    s.text(500,491,"按式(10.1)的教学格式排列：每个字节从左到右为 bit 7 → bit 0",size=20,anchor="middle")
    s.text(500,545,"蓝色来自样本A，红色来自样本B；存储顺序由所采用的像素格式规定",size=18,color=GRAY,anchor="middle")
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
    s.line(500, 145, 500, 220, color=INK, width=8)
    s.line(500, 390, 500, 465, color=INK, width=8)
    s.text(500, 493, "孔径光阑", size=18, anchor="middle")
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
    s=SVG("图 12.1  理想圆孔的 Airy 点扩散函数")
    n=256
    raw=bytearray()
    for j in range(n):
        raw.append(0)
        for i in range(n):
            u=18*math.hypot((i+.5-n/2)/(n/2),(j+.5-n/2)/(n/2))
            intensity=airy_intensity(min(18,u)) if u<=18 else 0
            raw.append(round(255*math.sqrt(max(0,min(1,intensity)))))
    def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data))
    png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',n,n,8,0,0,0,0))+chunk(b'IDAT',zlib.compress(bytes(raw),9))+chunk(b'IEND',b'')
    s.add(f'<image x="92" y="136" width="310" height="310" href="data:image/png;base64,{base64.b64encode(png).decode()}"/>')
    s.circle(247,291,155*3.8317/18,stroke=AMBER,sw=1.4)
    s.text(247,488,"点像显示：√I，峰值归一",size=18,anchor="middle")
    box=(530,120,350,290)
    s.axes(*box,"归一化半径 u = πr/(λN)","归一化强度 I")
    xs=[i/500*18 for i in range(501)]
    s.plot([(x,airy_intensity(x)) for x in xs],box,(0,18,0,1.05),color=BLUE,width=3)
    s.line(530+3.8317/18*350,120,530+3.8317/18*350,410,color=AMBER,width=1.5,dash="5 4")
    s.text(705,488,"第一暗环：r ≈ 1.22 λN",size=18,color=AMBER,anchor="middle")
    s.text(500,548,"点像与剖面使用同一Airy函数；左图增强弱环，右图按线性强度绘制",size=19,anchor="middle")
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
    s=SVG("图 13.1  典型像差的点列形态示意")
    panels=[(35,"球差","spherical",BLUE),(280,"彗差","coma",AMBER),(525,"弧矢像散","astig_s",PURPLE),(770,"切向像散","astig_t",GREEN)]
    for x,title,kind,color in panels:
        s.panel(x,120,195,310,title)
        cx,cy=x+98,280
        s.line(cx-76,cy,cx+76,cy,color=GRAY,width=.8,opacity=.25)
        s.line(cx,cy-76,cx,cy+76,color=GRAY,width=.8,opacity=.25)
        s.circle(cx,cy,75,stroke=GRAY,sw=1,opacity=.3)
        for px,py in spot_cluster(cx,cy,kind):
            s.circle(cx+1.5*(px-cx),cy+1.5*(py-cy),2.8,fill=color,stroke="none",opacity=.72)
        s.text(cx,401,["旋转对称","单侧拖尾","沿一方向拉长","在另一焦面拉长"][len([p for p in panels if p[0]<x])],size=16,color=color,anchor="middle")
    s.text(500,495,"各图保持相同坐标比例；颜色区分像差类型",size=20,anchor="middle")
    s.text(500,548,"点列为形态示意；实际点像取决于处方、物距、像高、光阑和波长",size=18,color=GRAY,anchor="middle")
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
    s.grid(box,(20,100,1.4,1.82),xticks=[20,40,60,80,100],yticks=[1.4,1.5,1.6,1.7,1.8])
    for vx, nd, label, color in points:
        px = box[0] + (vx - 20) / 80 * box[2]
        py = box[1] + box[3] - (nd - 1.4) / 0.42 * box[3]
        s.circle(px, py, 8, fill=color, stroke=color)
        s.text(px + 10, py - 10, label, size=14, color=color)
    s.text(500, 545, "位置采用教学参数；材料选择需结合目录和完整色散曲线", size=19, anchor="middle")
    s.save("14_glass_map.svg")


def figure_14_achromat() -> None:
    s = SVG("图 14.2  正低色散片与负高色散片组成消色差双片")
    axis = 310
    s.line(70, axis, 930, axis, color=GRAY, width=1.5, dash="8 6")
    s.ellipse(430, axis, 35, 165, fill=PALE_BLUE, stroke=BLUE, sw=3)
    s.add(f'<path d="M470,165 Q512,310 470,455 L530,455 Q488,310 530,165 Z" '
          f'fill="{PALE_RED}" stroke="{RED}" stroke-width="3"/>')
    s.text(430, 500, "Φ₁ > 0 · 高 V₁", size=17, color=BLUE, anchor="middle")
    s.text(500, 535, "Φ₂ < 0 · 低 V₂", size=17, color=RED, anchor="middle")
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
    s=SVG("图 15.3  四分之一波长增透膜的反射相消")
    s.panel(35,95,475,375,"代表反射路径")
    s.panel(540,95,425,375,"反射振幅分子的两项")
    s.rect(65,260,415,45,fill=PALE_GREEN,stroke=GREEN,sw=1)
    s.rect(65,305,415,125,fill=PALE_BLUE,stroke=BLUE,sw=1)
    s.text(450,233,"空气 n₀",size=17,anchor="end")
    s.text(450,288,"膜层 nc · nc d = λ/4",size=17,color=GREEN,anchor="end")
    s.text(450,402,"玻璃 ns",size=18,color=BLUE,anchor="end")
    for xx,deep,color in [(150,260,AMBER),(245,305,BLUE)]:
        s.arrow(xx,170,xx,deep,color=GRAY,width=1.8)
        s.line(xx,deep,xx,177,color=color,width=2.3,dash="5 4")
        s.arrow(xx,203,xx,175,color=color,width=2.3)
    s.text(155,454,"橙：膜面反射；蓝：膜底反射",size=16)
    for yy,label,color,sign in [(220,"r₀c",AMBER,1),(325,"r_cs exp(−2iδ)",BLUE,-1)]:
        pts=[(580+i*1.55,yy-sign*27*math.sin(i/200*4*math.pi)) for i in range(201)]
        s.line(575,yy,920,yy,color=GRAY,width=.8,opacity=.3)
        s.polyline(pts,color=color,width=2.7)
        s.text(575,yy-46,label,size=17,color=color)
    s.text(750,427,"设计点两项等幅反相 → 分子为零",size=18,anchor="middle")
    s.text(500,520,"正入射、设计波长、nc² = n₀ns；图中两条路径来自同一波长",size=20,anchor="middle")
    s.text(500,555,"多次反射由振幅公式的分母合计；路径颜色标识反射位置，层厚为示意",size=17,color=GRAY,anchor="middle")
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
                s.line(gx+15,190,gx+15,246,color=INK,width=5)
                s.line(gx+15,314,gx+15,370,color=INK,width=5)
            else:
                cx,top,bottom=gx+15,210,350
                s.rect(cx-7,top,14,bottom-top,fill=color,stroke="none",radius=6,opacity=.10)
                s.line(cx,top,cx,bottom,color=color,width=2)
                for y,direction in [(top,1),(bottom,-1)]:
                    tip=y if symbol=="+" else y+12*direction
                    base=y+12*direction if symbol=="+" else y
                    s.polyline([(cx-6,base),(cx,tip),(cx+6,base)],color=color,width=2)
                s.text(cx,389,symbol,size=22,color=color,anchor="middle",weight="600")
            gx += 42
        s.line(x + 15, 280, x + 235, 280, color=GRAY, width=1, dash="5 4")
    s.text(500, 520, "箭头向外：正薄组；向内：负薄组；黑色开口：光阑", size=19, anchor="middle")
    s.text(500,555,"薄组符号定位等效平面，实际玻璃外形由处方给出",size=17,color=GRAY,anchor="middle")
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
    s.text(377, 414, "x/σ", size=16, anchor="middle")
    s.text(622, 414, "x/σ", size=16, anchor="middle")
    s.text(867, 414, "νσ", size=16, anchor="middle")
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
