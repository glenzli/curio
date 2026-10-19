#!/usr/bin/env python3
"""Generate deterministic SVG figures for the photographic imaging textbook."""

from __future__ import annotations

import html
import math
import base64
import struct
import zlib
import subprocess
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

    def legend_entry(self, x: float, y: float, value: str, color: str,
                     *, dash: str | None = None, size: int = 16) -> None:
        self.line(x, y - 5, x + 28, y - 5, color=color, width=3, dash=dash)
        self.text(x + 38, y, value, size=size, color=color)

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
    s.text(255, 495, "接收面 dA", size=19, color=BLUE, anchor="middle")
    s.arrow(255, 400, 255, 210, color=INK)
    s.text(270, 225, "法线 n", size=17)
    apex = (760, 210)
    for p in [(180, 365), (260, 385), (345, 410)]:
        s.line(apex[0], apex[1], p[0], p[1], color=AMBER, width=2.5)
    s.circle(*apex, 12, fill=AMBER, stroke=AMBER)
    s.text(760, 175, "方向微元 dΩ", size=19, color=AMBER, anchor="middle")
    s.line(255, 400, *apex, color=GRAY, width=1.5, dash="7 6")
    direction_length = math.hypot(apex[0] - 255, apex[1] - 400)
    arc_x = 255 + 55 * (apex[0] - 255) / direction_length
    arc_y = 400 + 55 * (apex[1] - 400) / direction_length
    s.add(f'<path d="M255 345A55 55 0 0 1 {arc_x:.2f} {arc_y:.2f}" fill="none" stroke="{GRAY}" stroke-width="1.4"/>')
    s.text(280, 375, "θ", size=20, anchor="middle")
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


def signal_stage(s, x, y, width, index, title, subtitle, color, kind):
    """Functional symbols inside a stage, not an electrical circuit schematic."""
    s.rect(x, y, width, 207, fill="#fcfdfe", stroke="#dae2e8", sw=1, radius=8)
    s.line(x+12,y+1,x+width-12,y+1,color=color,width=3)
    s.circle(x+23,y+25,11,fill=color,stroke="none",opacity=.13)
    s.text(x+23,y+29,str(index),size=13,color=color,anchor="middle",weight="600")
    s.text(x+width/2,y+66,title,size=17,anchor="middle",weight="600")
    cx, cy = x+width/2, y+120
    if kind == "photons":
        pts=[(cx-42+i*.7,cy+9*math.sin(i/8)) for i in range(121)]
        s.polyline(pts,color=color,width=1.8)
        s.circle(cx+41,cy+9*math.sin(15),3,fill=color,stroke="none")
    elif kind == "filter":
        s.rect(cx-8,cy-23,16,46,fill=color,stroke=color,sw=1,radius=2,opacity=.18)
        for dy in [-15,0,15]:s.line(cx-43,cy+dy,cx-10,cy+dy,color=color,width=1.5)
        for dy in [-15,15]:s.arrow(cx+10,cy+dy,cx+42,cy+dy,color=color,width=1.5)
    elif kind == "electrons":
        for i in range(3):
            for j in range(4):s.circle(cx-27+18*j,cy-18+18*i,3.7,fill=color,stroke="none",opacity=.45+.1*j)
    elif kind == "capacitor":
        s.line(cx-10,cy-23,cx-10,cy+23,color=color,width=2.5)
        s.line(cx+10,cy-23,cx+10,cy+23,color=color,width=2.5)
        s.line(cx-42,cy,cx-10,cy,color=color,width=1.5)
        s.line(cx+10,cy,cx+42,cy,color=color,width=1.5)
    elif kind == "adc":
        s.polyline([(cx-42,cy+23),(cx-24,cy+23),(cx-24,cy+8),(cx-6,cy+8),(cx-6,cy-7),(cx+12,cy-7),(cx+12,cy-22),(cx+42,cy-22)],color=color,width=2)
        s.line(cx-42,cy+26,cx+42,cy-26,color=GRAY,width=.8,dash="3 3",opacity=.4)
    elif kind == "bytes":
        s.text(cx,cy-4,"0101 1010",size=16,color=color,anchor="middle")
        s.text(cx,cy+19,"1001 0110",size=16,color=color,anchor="middle")
    elif kind == "cds":
        s.line(cx-40,cy-14,cx+40,cy-14,color=color,width=1.3)
        s.line(cx-40,cy+16,cx+40,cy+16,color=color,width=1.3)
        for dx,dy in [(-20,-14),(20,16)]:s.circle(cx+dx,cy+dy,4,fill=color,stroke="none")
        s.line(cx+31,cy-14,cx+31,cy+16,color=color,width=1,arrow=True)
    elif kind == "gain":
        s.polygon([(cx-27,cy-26),(cx-27,cy+26),(cx+30,cy)],fill=color,stroke=color,sw=1.5,opacity=.12)
        s.text(cx-7,cy+6,"a",size=22,color=color,anchor="middle")
    elif kind == "levels":
        s.line(cx-37,cy+22,cx+37,cy-22,color=color,width=1.8)
        s.circle(cx-37,cy+22,4,fill=INK,stroke="none")
        s.circle(cx+37,cy-22,4,fill="#fff",stroke=GRAY,sw=1)
    elif kind == "rgb":
        for i,(tint,height) in enumerate(zip([RED,GREEN,BLUE],[32,50,41])):
            s.rect(cx-33+24*i,cy+25-height,18,height,fill=tint,stroke="none",radius=2,opacity=.64)
    elif kind == "matrix":
        s.polyline([(cx-28,cy-24),(cx-35,cy-24),(cx-35,cy+24),(cx-28,cy+24)],color=color,width=1.3)
        s.polyline([(cx+28,cy-24),(cx+35,cy-24),(cx+35,cy+24),(cx+28,cy+24)],color=color,width=1.3)
        for i in range(3):
            for j in range(3):s.circle(cx-17+17*j,cy-16+16*i,2.5,fill=color,stroke="none",opacity=.3+.12*((i+j)%3))
    elif kind == "cfa":
        for j in range(4):
            for i in range(4):
                tint=[RED,GREEN,GREEN,BLUE][(j%2)*2+i%2]
                s.rect(cx-31+16*i,cy-31+16*j,14,14,fill=tint,stroke="none",radius=1,opacity=.64)
    elif kind == "curve":
        s.polyline([(cx-40+i*.8,cy+25-50*(i/100)**.45) for i in range(101)],color=color,width=2)
    else:
        s.polyline([(cx-42+i*.7,cy+15*math.sin(i/20)*(.4+i/200)) for i in range(121)],color=color,width=1.7)
    s.text(cx,y+184,subtitle,size=16,color=color,anchor="middle")


def figure_02_photon_electron_chain() -> None:
    s = SVG("图 2.1  从光子到 RAW 码值的信号链",height=610)
    s.text(40,103,"光子数、电子数、电压和码值是不同的量",size=21,weight="600")
    stages=[("入射光子","Nγ · 个",AMBER,"photons"),("滤光与收集","效率 η(λ)",GREEN,"filter"),("信号电子","Ne · e−",BLUE,"electrons"),("FD 电压转换","ΔV = q Ne / CFD",RED,"capacitor"),("模数转换","量化为整数码",PURPLE,"adc"),("RAW 样本","码值 · DN",INK,"bytes")]
    for i,(title,sub,color,kind) in enumerate(stages):
        x=35+i*158
        signal_stage(s,x,156,139,i+1,title,sub,color,kind)
        if i<5:s.arrow(x+141,270,x+154,270,color=GRAY,width=1.2)
    for x,w,label,color in [(35,455,"入射光子 → 收集电子",BLUE),(509,139,"电荷 → 电压",RED),(667,297,"电压 → 数字样本",PURPLE)]:
        s.line(x,394,x+w,394,color=color,width=1.2)
        s.text(x+w/2,425,label,size=17,color=color,anchor="middle")
    s.text(40,487,"QE 决定平均收集电子数；FD 将电荷转换为电压，ADC 再对电压量化。",size=19)
    s.text(40,529,"后端增益改变电压或码值的尺度；已经收集的电子数保持不变。",size=19)
    s.text(40,579,"功能顺序示意；增益、偏置与校正在第三章展开，实际 RAW 处理状态由文件字段说明。",size=17,color=GRAY)
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
    s = SVG("图 3.1  CMOS 读出链及噪声注入位置",height=650)
    s.text(40,104,"从像素电压到整数码，噪声在不同位置进入",size=21,weight="600")
    stages=[("像素 SF","缓冲像素电压",BLUE,"voltage"),("列采样 / CDS","复位值 − 信号值",GREEN,"cds"),("模拟增益","放大电压差",AMBER,"gain"),("列 ADC","电压 → DN",RED,"adc"),("数字校正","黑值 / 列偏置等",PURPLE,"matrix")]
    for i,(title,sub,color,kind) in enumerate(stages):
        x=46+i*186
        signal_stage(s,x,157,163,i+1,title,sub,color,kind)
        if i<4:s.arrow(x+166,270,x+182,270,color=GRAY,width=1.3)
    s.arrow(160,439,160,367,color=BLUE,width=1.5)
    s.text(160,468,"增益前读噪 R1",size=17,color=BLUE,anchor="middle")
    s.arrow(687,439,687,367,color=RED,width=1.5)
    s.text(687,468,"增益后噪声 R2 与量化误差",size=17,color=RED,anchor="middle")
    s.text(40,541,"前级噪声随信号一起放大；后级噪声折算到输入端的标准差为 σ2 / a。",size=20)
    s.text(40,585,"CDS 对两次采样作差；它能抑制哪些噪声，取决于两次采样的相关性。",size=18)
    s.text(40,624,"功能链示意；噪声箭头只标注相对于模拟增益的位置，未展开全部器件噪声。",size=16,color=GRAY)
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
    s.arrow(220, 440, 130, 470 - 20 / 500 * 370, color=RED)
    s.text(235, 445, "暗场方差 c [DN²]", size=16, color=RED)
    s.legend_entry(140, 84, "线性斜率 = g [DN/e⁻]", BLUE)
    s.text(700, 128, "饱和 / 非线性", size=17, color=RED)
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
    s.legend_entry(140, 84, "HCG：高 V/e⁻，较早触顶", RED)
    s.legend_entry(510, 84, "LCG：低 V/e⁻，容量更大", BLUE)
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
    s = SVG("图 6.2  行间采样时间差造成运动倾斜", height=650)
    s.panel(35, 100, 425, 405, "同一竖杆在三个时刻的位置")
    s.panel(490, 100, 475, 405, "一张图：每行使用自己的曝光窗口")
    xmap = lambda origin, value: origin + value * 15
    for origin in [80, 560]:
        for x in [0, 5, 10, 15, 20]:
            px = xmap(origin, x)
            s.line(px, 180, px, 431, color=GRAY, width=.7, opacity=.14)
            s.text(px, 460, str(x), size=14, color=GRAY, anchor="middle")
        s.arrow(origin, 440, origin + 320, 440, color=GRAY, width=1)
        s.text(origin + 160, 488, "水平位置 / pixel", size=16, anchor="middle")
    for t, opacity in [(0, .3), (6, .55), (12, .88)]:
        center = 3 + t
        s.rect(xmap(80, center - 1), 205, 30, 215, fill=BLUE, stroke="none", radius=2, opacity=opacity)
        s.text(xmap(80, center), 187, f"{t} ms", size=16, color=BLUE, anchor="middle")
    s.arrow(110, 158, 330, 158, color=BLUE, width=1.5)
    s.text(354, 163, "匀速", size=15, color=BLUE)
    s.add(f'<defs><linearGradient id="row-profile"><stop offset="0" stop-color="{CYAN}" stop-opacity="0"/><stop offset=".333333" stop-color="{CYAN}"/><stop offset=".666667" stop-color="{CYAN}"/><stop offset="1" stop-color="{CYAN}" stop-opacity="0"/></linearGradient></defs>')
    for j in range(7):
        y = 190 + j * 35
        start, center = 3 + 2*j, 3.5 + 2*j
        s.line(560, y, 875, y, color=GRAY, width=.7, opacity=.18)
        # A two-pixel rod convolved with one pixel of travel: trapezoidal row profile.
        s.rect(xmap(560,start-1),y-10,45,24,fill="url(#row-profile)",stroke="none",radius=0)
        s.circle(xmap(560,center),y+2,2.4,fill="#fff",stroke="none")
        s.text(540,y+7,f"R{j}",size=14,color=GRAY,anchor="end")
    s.text(40, 551, "短曝光缩小行内的拖影；相邻行在不同时间取样，仍会把竖杆记录成斜形。", size=19)
    s.text(40, 589, "v = 1 pixel/ms，行间隔 2 ms，曝光 1 ms；杆宽 2 pixel，起始中心 x0 = 3 pixel。", size=18, color=GRAY)
    s.text(40, 622, "右图条带的明暗按曝光积分计算，白点标出该行记录的位置中心。", size=16, color=GRAY)
    s.save("06_rolling_skew.svg")

def figure_06_sensor_structures() -> None:
    # The numbered plate, static fallback and live view share one layer drawing.
    subprocess.run([
        "node", str(OUT.parent / "interactives/sensor-stack/generate-fallback.js"), "--numbered"
    ], check=True)


def figure_06_curved_sensor() -> None:
    s = SVG("图 6.4  平面传感器与弯曲最佳像面", height=650)
    s.panel(35, 90, 575, 420, "轴上合焦时的离轴光束")
    s.panel(635, 90, 330, 195, "平面传感器")
    s.panel(635, 310, 330, 200, "曲面与最佳焦点匹配")
    axis, pupil, plane = 310, 150, 515
    best = lambda h: plane - 0.005 * h * h
    s.line(60, axis, 590, axis, color=GRAY, width=1, dash="6 5", opacity=.5)
    s.rect(79, 223, 51, 174, fill=LIGHT, stroke="#b7c3ce", sw=1, radius=8)
    for x in [91, 104, 117]:
        s.line(x, 239, x, 381, color=GRAY, width=1, opacity=.45)
    s.text(105, 427, "镜组", size=16, color=GRAY, anchor="middle")
    s.text(105, 450, "示意", size=14, color=GRAY, anchor="middle")
    heights = [-120, 0, 120]
    spans = []
    for h, color in zip(heights, [BLUE, GREEN, PURPLE]):
        fx, fy = best(h), axis + h
        aperture = [axis - 65, axis, axis + 65]
        ends = [yp + (fy - yp) * (plane - pupil) / (fx - pupil) for yp in aperture]
        spans.append(max(ends) - min(ends))
        s.polygon([(pupil, aperture[0]), (fx, fy), (pupil, aperture[-1])], fill=color, stroke="none", opacity=.065)
        for yp, ey in zip(aperture, ends):
            s.polyline([(pupil, yp), (fx, fy), (plane, ey)], color=color, width=1.5, opacity=.82)
        # The central ray only marks propagation; width does not encode energy.
        at = lambda x: axis + (fy - axis) * (x - pupil) / (fx - pupil)
        s.arrow(294, at(294), 316, at(316), color=color, width=1.7)
        s.circle(fx, fy, 4, fill=color, stroke="#fff", sw=1)
        s.line(plane, min(ends), plane, max(ends), color=color, width=7)
        mid = (min(ends) + max(ends)) / 2
        s.circle(plane, mid, 2.5, fill=color, stroke="none")
    assert spans[1] == 0 and spans[0] > 0 and math.isclose(spans[0], spans[2])
    curve = [(best(h), axis + h) for h in range(-148, 149, 2)]
    s.polyline(curve, color=CYAN, width=3.2)
    s.line(plane, 151, plane, 469, color=RED, width=3)
    s.text(323, 153, "逐像高的最佳焦点", size=16, color=CYAN, anchor="middle")
    s.polyline([(389, 158), (421, 158), (best(-132), axis - 132)], color=CYAN, width=1)
    s.circle(plane, axis, 4, fill=GREEN, stroke="#fff", sw=1)
    s.text(549, 490, "平面", size=15, color=RED, anchor="middle")
    s.line(537, 482, plane, 462, color=RED, width=1)
    for row, y in enumerate([197, 418]):
        for i, (label, color) in enumerate(zip(["上边缘", "轴上", "下边缘"], [BLUE, GREEN, PURPLE])):
            cx = 698 + 102 * i
            span = spans[i] if row == 0 else 0
            s.line(cx, y - 31, cx, y + 31, color=GRAY, width=.8, opacity=.2)
            if span:
                s.rect(cx - 5, y - span / 2, 10, span, fill=color, stroke="none", radius=4, opacity=.18)
                s.line(cx, y - span / 2, cx, y + span / 2, color=color, width=4)
                for yy in [y - span / 2, y + span / 2]:
                    s.line(cx - 6, yy, cx + 6, yy, color=color, width=1.2)
            else:
                s.circle(cx, y, 3, fill=color, stroke="none")
            s.text(cx, y + 52, label, size=15, anchor="middle")
        s.text(800, y + 76, "光束的纵向截宽 · 两图同尺度", size=14, color=GRAY, anchor="middle")
    s.text(40, 551, "平面上：轴上光束已会聚，离轴光束在到达传感器前已越过焦点。", size=19)
    s.text(40, 585, "匹配曲面经过各像高的最佳焦点；存在像散时，两个主截面的焦面需分别考察。", size=18)
    s.text(40, 620, "颜色区分像高；最佳焦点轨迹为抛物线示意，未计衍射。", size=16, color=GRAY)
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
    s.legend_entry(140, 84, "ν", BLUE)
    s.legend_entry(360, 84, "ν + 1/p", RED, dash="7 5")
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
    for x, color, label in [(180, BLUE, "B"), (390, GREEN, "G"), (600, RED, "R")]:
        s.legend_entry(x, 84, label, color)
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
        dx, dy, anchor = {1: (8, 25, "start"), 4: (20, 28, "start"),
                          16: (0, -30, "middle"), 64: (0, 0, "end")}[x]
        s.text(px + dx, 84 if x == 64 else py + dy,
               f"{x}帧 → {y:g}×", size=15, anchor=anchor, color=RED)
    s.text(500, 545, "总曝光时间相同时，多帧短曝光需要多次读出", size=20, anchor="middle")
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
    for x, color, label in [(140, GRAY, "Linear"), (360, BLUE, "Gamma"), (580, RED, "Log-like")]:
        s.legend_entry(x, 84, label, color)
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
    s = SVG("图 10.1  RAW 显影流程及可重新选择的步骤",height=650)
    s.text(40,104,"从文件样本到显示图像的处理链",size=21,weight="600")
    stages=[("读取 RAW","解包 / 线性化",GRAY,"bytes"),("黑 / 白电平","减偏置 / 归一化",RED,"levels"),("去马赛克","CFA → 多通道",BLUE,"cfa"),("白平衡","线性通道增益",GREEN,"rgb"),("颜色矩阵","变换颜色坐标",PURPLE,"matrix"),("色调 / 输出","映射 / 编码",AMBER,"curve")]
    for i,(title,sub,color,kind) in enumerate(stages):
        x=35+i*158
        signal_stage(s,x,157,139,i+1,title,sub,color,kind)
        if i<5:s.arrow(x+141,270,x+154,270,color=GRAY,width=1.2)
    s.rect(40,410,442,93,fill=PALE_BLUE,stroke="#d5e3ef",sw=1,radius=8)
    s.rect(508,410,452,93,fill=PALE_AMBER,stroke="#eadfca",sw=1,radius=8)
    s.text(61,441,"文件保留了原始样本与所需元数据",size=18,color=BLUE,weight="600")
    s.text(61,476,"可从样本重新选择后续显影参数",size=17,color=BLUE)
    s.text(529,441,"处理已在写入前不可逆完成",size=18,color=AMBER,weight="600")
    s.text(529,476,"只能调整结果，不能重取原始输入",size=17,color=AMBER)
    s.text(40,552,"文件保留的样本与处理状态决定后期可调整的范围。",size=20)
    s.text(40,592,"图中是典型逻辑顺序；白平衡、去马赛克与降噪的实际次序随流程而变。",size=18)
    s.text(40,628,"RAW 的处理状态以文件字段和相机已经执行的处理为准。",size=16,color=GRAY)
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
    for pts, color, label, xx in [(lens, BLUE, "镜头", 140), (pixel, GREEN, "像素孔径", 360), (system, RED, "乘积系统", 580)]:
        s.plot(pts, box, (0, 1, 0, 1), color=color, width=3)
        s.legend_entry(xx, 84, label, color)
    s.line(830, 100, 830, 470, color=GRAY, width=2, dash="6 5")
    s.text(845, 128, "Nyquist", size=15, color=GRAY)
    s.save("12_system_mtf.svg")


def figure_12_frequency_orientation() -> None:
    s = SVG("图 12.4  条纹方向与空间频率方向")
    for x, width in [(36, 326), (390, 276), (688, 276)]:
        s.rect(x, 100, width, 376, fill="#fafbfc", stroke=LIGHT, sw=1, radius=8)
    s.text(54, 132, "像高位置与径向、切向", size=20, weight="600")
    s.rect(62, 162, 274, 264, fill="#fff", stroke="#c7d0d9", sw=1.5)
    center, field = (156, 326), (268, 214)
    s.line(144, 326, 168, 326, color=GRAY, width=1.5)
    s.line(156, 314, 156, 338, color=GRAY, width=1.5)
    s.text(107, 356, "画面中心", size=16, color=GRAY)
    s.line(*center, 287, 195, color=BLUE, width=3, arrow=True)
    s.line(222, 168, 314, 260, color=AMBER, width=3, arrow=True)
    s.circle(*field, 5, fill="#fff", stroke=INK, sw=2)
    s.text(279, 181, "离轴点", size=16, anchor="middle")
    s.text(203, 299, "径向", size=18, color=BLUE)
    s.text(290, 295, "切向", size=18, color=AMBER)
    s.text(199, 452, "径向连接画面中心与离轴点", size=17, anchor="middle")

    # Stripe vectors and frequency vectors are perpendicular in each patch.
    # SVG y increases downwards; the chosen radial direction is (1, -1).
    patches = [
        (414, (1, -1), (1, 1), AMBER, "条纹沿径向", "频率沿切向"),
        (712, (1, 1), (1, -1), BLUE, "条纹沿切向", "频率沿径向"),
    ]
    for i, (x, stripe, frequency, color, heading, label) in enumerate(patches):
        y, side = 170, 228
        cx, cy = x + side / 2, y + side / 2
        s.text(cx, 132, heading, size=20, anchor="middle", weight="600")
        clip = f"orientation-patch-{i}"
        s.add(f'<defs><clipPath id="{clip}"><rect x="{x}" y="{y}" width="{side}" height="{side}" rx="4"/></clipPath></defs>')
        s.rect(x, y, side, side, fill="#fff", stroke="#c7d0d9", sw=1)
        s.add(f'<g clip-path="url(#{clip})">')
        for offset in range(-240, 241, 24):
            ox = cx + offset * frequency[0]
            oy = cy + offset * frequency[1]
            s.line(ox - 260 * stripe[0], oy - 260 * stripe[1],
                   ox + 260 * stripe[0], oy + 260 * stripe[1], color="#dae1e7", width=15)
        s.add('</g>')
        ax, ay = cx - 57 * frequency[0], cy - 57 * frequency[1]
        bx, by = cx + 57 * frequency[0], cy + 57 * frequency[1]
        s.line(ax, ay, bx, by, color="#fff", width=9)
        s.line(ax, ay, bx, by, color=color, width=4, arrow=True)
        # A short perpendicular tick marks the direction in which stripes extend.
        s.line(cx - 18 * stripe[0], cy - 18 * stripe[1],
               cx + 18 * stripe[0], cy + 18 * stripe[1], color=INK, width=2)
        s.text(cx, 433, label, size=21, color=color, anchor="middle", weight="600")
        s.text(cx, 459, "箭头指向明暗交替的方向", size=17, anchor="middle")
    s.text(500, 521, "空间频率方向与条纹延伸方向垂直", size=23, anchor="middle", weight="600")
    s.text(500, 557, "颜色区分径向与切向；厂商的 S/T 或 S/M 字母仍按各自图例读取", size=18, color=GRAY, anchor="middle")
    s.save("12_frequency_orientation.svg")


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
    s = SVG("图 13.2  场曲与同一平面测试", height=650)
    s.text(255, 105, "① 不同像高的最佳焦面", size=21, anchor="middle", weight="600")
    s.text(744, 105, "② 固定焦面与逐像高重新对焦", size=21, anchor="middle", weight="600")
    left, right = (110, 155, 330, 285), (600, 155, 330, 285)
    s.axes(*left, "像高 h / mm", "最佳焦面 z / μm")
    s.axes(*right, "像高 h / mm", "MTF · 30 lp/mm")
    s.grid(left, (0, 21.6, 0, 90), xticks=[0, 7.2, 14.4, 21.6], yticks=[0, 25, 50, 75])
    s.grid(right, (0, 21.6, 0, 1), xticks=[0, 7.2, 14.4, 21.6], yticks=[0, .25, .5, .75, 1])
    heights = [i * 21.6 / 180 for i in range(181)]
    foci = [(h, 75 * (h / 21.6) ** 2) for h in heights]
    mtf = lambda delta: math.exp(-2 * math.pi ** 2 * (1.8 ** 2 + (.08 * delta) ** 2) * (.03) ** 2)
    s.plot(foci, left, (0, 21.6, 0, 90), color=BLUE, width=3)
    s.line(110, 439, 440, 439, color=RED, width=2, dash="6 4")
    s.text(123, 419, "固定平面 z = 0", size=16, color=RED)
    s.plot([(h, mtf(z)) for h, z in foci], right, (0, 21.6, 0, 1), color=RED, width=3)
    s.plot([(h, mtf(0)) for h in heights], right, (0, 21.6, 0, 1), color=GREEN, width=3, dash="7 4")
    s.text(614, 193, "各像高重新对焦", size=16, color=GREEN)
    s.text(765, 364, "固定中心焦面", size=16, color=RED)
    for h in [0, 15.2735064736, 21.6]:
        z = 75 * (h / 21.6) ** 2
        px, py = 110 + h / 21.6 * 330, 440 - z / 90 * 285
        s.circle(px, py, 4, fill=BLUE, stroke="#fff", sw=1)
    s.text(423, 184, "75 μm", size=15, color=BLUE, anchor="end")
    s.text(930, 317, f"{mtf(75):.3f}", size=15, color=RED, anchor="end")
    s.text(40, 531, "场曲使边缘焦点离开中心焦面；逐像高重新对焦后，局部 MTF 恢复至本例的基准值。", size=19)
    s.text(40, 568, "重新对焦后仍有MTF损失，或两方向焦点分离时，还需结合其他像差分析。", size=18)
    s.text(40, 613, "本节高斯 PSF 模型：C = 75 μm，A = 0，σ0 = 1.8 μm；图中未加入像散。", size=17, color=GRAY)
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
    import json
    # Reuse the same catalogue dispersion and contact-thin-doublet model as the panel.
    module = (OUT.parent / "interactives/achromat/model.js").as_uri()
    js = f'''import {{doublet}} from "{module}";
const a=doublet(), m=doublet({{ratio:a.solutionRatio}});
console.log(JSON.stringify({{ratio:m.phi1/m.total,v1:m.a.abbe,v2:m.b.abbe,f:m.focuses}}));'''
    m = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", js], text=True))
    assert math.isclose(m["f"]["F"], m["f"]["C"], abs_tol=1e-9)
    s = SVG("图 14.2  正低色散片与负高色散片组成消色差双片", height=650)
    s.text(40, 100, "接触薄片：正、负光焦度在同一等效平面相加", size=20, weight="600")
    axis, lens = 275, 350
    xmap = lambda z: lens + 4.9*z
    s.line(65, axis, 935, axis, color=GRAY, width=1, dash="6 5", opacity=.6)
    s.rect(lens-27, 146, 54, 250, fill=PALE_BLUE, stroke="#cedbe6", sw=1, radius=9)
    engineering_thin_group(s,lens,axis,105,True,INK)
    s.text(lens, 130, "双片合成光焦度", size=16, anchor="middle", color=GRAY)
    for color, dash, wavelength in [(BLUE,None,"F"),(RED,"7 5","C")]:
        for height in [-65,65]:
            s.line(70,axis+height,lens,axis+height,color=color,width=2,dash=dash)
            s.line(lens,axis+height,xmap(m["f"][wavelength]),axis,color=color,width=2,dash=dash)
    focus = xmap(m["f"]["F"])
    s.circle(focus,axis,5,fill=GREEN,stroke="#fff",sw=1)
    s.text(focus,axis+40,"F、C 两线共焦",size=18,color=GREEN,anchor="middle")
    s.text(88, 176, "F · 486.13 nm",size=16,color=BLUE)
    s.text(88, 366, "C · 656.27 nm（虚线）",size=16,color=RED)
    s.text(353, 427, "N-BK7：正光焦度 / 较高 Abbe 数",size=17,color=INK,anchor="middle")
    s.text(353, 454, "N-F2：负光焦度 / 较低 Abbe 数",size=17,color=INK,anchor="middle")
    s.rect(40,488,920,84,fill="#f6f8fa",stroke=LIGHT,sw=1,radius=8)
    for x, title, value, color in [(62,"d 线总焦距","100 mm",INK),(293,"正片 / 总光焦度",f'{m["ratio"]:.4f}',BLUE),(524,"F、C 共焦位置",f'{m["f"]["F"]:.3f} mm',GREEN),(755,"d 线 Abbe 数",f'{m["v1"]:.2f} / {m["v2"]:.2f}',PURPLE)]:
        s.text(x,514,title,size=15,color=GRAY)
        s.text(x,548,value,size=22,color=color,weight="600")
    s.text(40,612,"SCHOTT 目录色散；按 Φ1/V1 + Φ2/V2 = 0 配比。箭头标出双片合成的正光焦度。",size=17,color=GRAY)
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
    s = SVG("图 16.3  对焦平面前后的弥散圈")
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
    s = SVG("图 16.4  角抖动、像移与防抖补偿", height=650)
    titles = ["① 关闭补偿","② 光学补偿：移等效薄组","③ 机身补偿：移传感器"]
    for i, title in enumerate(titles):
        x=30+i*325
        s.panel(x,100,300,410,title)
        lx,sx,axis=x+108,x+254,287
        shift=34
        lens_center=axis-shift if i==1 else axis
        sensor_center=axis+shift if i==2 else axis
        s.line(x+18,axis,x+280,axis,color=GRAY,width=.8,dash="5 4",opacity=.5)
        engineering_thin_group(s,lx,lens_center,78,True,BLUE)
        s.line(sx,sensor_center-113,sx,sensor_center+113,color=INK,width=3)
        for aperture in [-58,0,58]:
            y=lens_center+aperture
            sy=y-shift/146*78
            endpoint=lens_center+shift
            s.line(x+30,sy,lx,y,color=AMBER,width=1.4)
            s.line(lx,y,sx,endpoint,color=AMBER,width=1.6)
        # All panels share the same ray law: y' = lens_center + f theta.
        actual=lens_center+shift
        residual=actual-sensor_center
        assert residual == (shift if i==0 else 0)
        s.line(sx-12,sensor_center,sx+12,sensor_center,color=GREEN,width=1.5)
        s.circle(sx,actual,4,fill=RED if residual else GREEN,stroke="#fff",sw=1)
        if i==0:
            s.line(sx+15,axis,sx+15,actual,color=RED,width=1.2)
            s.text(x+155,439,"像点偏离传感器中心",size=16,color=RED,anchor="middle")
        elif i==1:
            s.arrow(lx+24,axis,lx+24,lens_center,color=BLUE,width=2)
            s.text(x+155,439,"改变出射光束的位置",size=16,color=BLUE,anchor="middle")
        else:
            s.line(sx+14,axis,sx+14,axis+shift,color=GREEN,width=2,arrow=True)
            s.text(x+155,439,"传感器中心跟随像点",size=16,color=GREEN,anchor="middle")
        s.text(x+150,478,"残余像移：34.9 μm" if i==0 else "理想补偿：残余为 0",size=18,anchor="middle",weight="600")
    s.text(40,553,"同一瞬间：f = 100 mm，θ = 0.02°，像移 fθ ≈ 34.9 μm；三图使用同一方向的入射光。",size=18)
    s.text(40,590,"横向位移放大显示。光学补偿用可平移的正薄组作等效例，实际组的补偿倍率需由处方求得。",size=17,color=GRAY)
    s.text(40,623,"曝光中的模糊还取决于整段残余轨迹；相机防抖不能抵消主体自身的运动。",size=17,color=GRAY)
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
        s.legend_entry(120 + idx * 200, 84, label, color,
                       dash=None if idx % 2 == 0 else "7 5", size=15)
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


def engineering_thin_group(s, x, y, half, positive=True, color=BLUE):
    s.line(x, y-half, x, y+half, color=color, width=2)
    for yy, sign in [(y-half, 1), (y+half, -1)]:
        tip = yy if positive else yy+9*sign
        base = yy+9*sign if positive else yy
        s.polyline([(x-5,base),(x,tip),(x+5,base)],color=color,width=2)


def figure_15_flare_forms():
    s=SVG("图 15.4  鬼影、面纱眩光与衍射星芒")
    for x,label,kind in [(36,"额外反射像","ghost"),(362,"背景抬升","veil"),(688,"孔径衍射","star")]:
        s.panel(x,100,276,368,label)
        s.rect(x+18,155,240,215,fill="#23313d",stroke="none",radius=5)
        for i in range(10):
            s.rect(x+30+i*21,260,16,80,fill="#6e7b86" if i%2 else "#334451",stroke="none",radius=0)
        s.circle(x+211,192,9,fill="#fff9dd",stroke=AMBER,sw=2)
        if kind=="ghost":
            for cx,cy,r in [(x+110,276,32),(x+68,315,17)]:
                pts=[(cx+r*math.cos(j*math.pi/3),cy+r*math.sin(j*math.pi/3)) for j in range(6)]
                s.polygon(pts,fill=CYAN,stroke=CYAN,opacity=.45)
            desc=["亮斑轮廓随光源与光阑改变","用额外反射路径解释"]
        elif kind=="veil":
            s.rect(x+18,155,240,215,fill="#e9e3c5",stroke="none",opacity=.30,radius=5)
            desc=["暗区与亮区同时增加背景","以固定标尺比较局部对比"]
        else:
            for j in range(8):
                angle=j*math.pi/4
                s.line(x+211,192,x+211+42*math.cos(angle),192+42*math.sin(angle),color=PALE_AMBER,width=1.6)
            desc=["点源被孔径的频谱展开","由复瞳与PSF计算形状"]
        for j,line in enumerate(desc):s.text(x+138,408+j*30,line,size=17,anchor="middle")
    s.text(500,518,"三类机制可能同时出现，先记录光源位置、曝光、光圈和附件",size=21,anchor="middle")
    s.text(500,555,"形态示意；颜色不代表波长，图案不用于估计真实能量比例",size=18,color=GRAY,anchor="middle")
    s.save("15_flare_forms.svg")


def figure_16_classical_layouts():
    # The numbered atlas and the interactive share their prescription geometry.
    subprocess.run([
        "node", str(OUT.parent / "interactives/lens-atlas/generate-fallback.js"), "--numbered"
    ], check=True)


def figure_18_pupil_clearance():
    s=SVG("图 18.1  入瞳、实际光孔与前部通光空间")
    diameter=100;length=40;angle=math.radians(8)
    front=diameter+2*length*math.tan(angle)
    x0,x1,axis=155,545,286
    sy=2.0
    s.text(350,106,"空前部空间：ℓ=40 mm，半视场8°",size=21,anchor="middle")
    s.line(65,axis,655,axis,color=GRAY,width=1,dash="5 5")
    for a,color in [(-angle,AMBER),(0,BLUE),(angle,PURPLE)]:
        for sign in [-1,1]:
            y1=sign*diameter/2
            y0=y1-length*math.tan(a)
            s.line(x0,axis-sy*y0,x1,axis-sy*y1,color=color,width=2.4,arrow=True,opacity=.8)
    for lo,hi in [(137,axis-sy*front/2),(axis+sy*front/2,435)]:
        s.line(x0,lo,x0,hi,width=6)
    s.line(x1,axis-sy*diameter/2,x1,axis+sy*diameter/2,color=BLUE,width=4)
    s.text(x0,470,"前开口≥111.24 mm",size=20,anchor="middle")
    s.text(x1,470,"入瞳100 mm",size=20,color=BLUE,anchor="middle")
    s.text(x0,139,"前部开口",size=18,anchor="middle")
    s.text(x1,139,"入瞳参考面",size=18,anchor="middle")
    s.rect(706,135,246,325,fill="#fafbfc",stroke=LIGHT,sw=1,radius=8)
    s.text(829,171,"另看瞳与实际光孔",size=19,anchor="middle")
    s.circle(829,265,64,fill=PALE_BLUE,stroke=BLUE,sw=2)
    s.circle(829,265,64/1.5,fill=PALE_AMBER,stroke=AMBER,sw=2)
    s.text(829,367,"M入瞳=1.5",size=20,anchor="middle")
    s.text(829,400,"实际光孔66.67 mm",size=18,anchor="middle")
    s.text(500,526,"开孔大小、入瞳大小与前筒通光余量，需要分别计算",size=22,anchor="middle")
    s.text(500,563,"前部模型限定为空气且无折射面；右图比较直径，不是前组光路",size=18,color=GRAY,anchor="middle")
    s.save("18_pupil_clearance.svg")


def figure_18_teleconverter():
    s=SVG("图 18.2  负增距组改变会聚角与像面位置")
    px=lambda z:100+6*z
    py=lambda y:282-15*y
    s.text(500,104,"100 mm f/4 → 理想2倍增距 → 200 mm f/8",size=24,anchor="middle")
    s.line(55,282,917,282,color=GRAY,width=1,dash="5 5")
    engineering_thin_group(s,px(0),282,125,True,BLUE)
    engineering_thin_group(s,px(80),282,80,False,PURPLE)
    for y in [-6,-3,0,3,6]:
        y2=y*(1-80/100)
        s.polyline([(px(-7),py(y)),(px(0),py(y)),(px(80),py(y2)),(px(120),py(0))],color=BLUE,width=2.5)
        s.line(px(80),py(y2),px(100),py(0),color=GRAY,width=1.5,dash="4 4")
    s.arrow(px(28),282,px(42),282,color=BLUE,width=2.5)
    s.line(px(100),160,px(100),425,color=GRAY,width=2,dash="6 4")
    s.line(px(120),160,px(120),425,color=AMBER,width=4)
    for z,label in [(0,"主镜 0"),(80,"负组 80"),(100,"原焦面100"),(120,"新焦面120")]:
        s.text(px(z),460,label,size=18,anchor="middle")
    s.text(500,503,"负组焦距−40 mm；原余下20 mm像程增加为40 mm",size=22,anchor="middle")
    s.text(500,550,"蓝实线为实际传播，灰虚线为不加负组的参考；z用mm，横纵比例不同",size=18,color=GRAY,anchor="middle")
    s.save("18_teleconverter.svg")


def figure_18_macro_conjugates():
    s=SVG("图 18.3  延长管与反装时的物像共轭")
    def conjugate(x,y,width,a,b,height,label):
        px=lambda z:x+width*z/(a+b)
        sy=14
        s.text(x,y-76,label,size=19)
        s.line(x-8,y,x+width+8,y,color=GRAY,width=1)
        engineering_thin_group(s,px(a),y,48,True,BLUE)
        s.arrow(px(0),y,px(0),y-sy*height,color=PURPLE,width=3)
        s.arrow(px(a+b),y,px(a+b),y+sy*height*b/a,color=AMBER,width=3)
        for h in [-2,0,2]:
            s.polyline([(px(0),y-sy*height),(px(a),y-sy*h),(px(a+b),y+sy*height*b/a)],color=BLUE,width=1.8)
        s.text(x,y+69,f"s={a:g} mm",size=17)
        s.text(x+width,y+69,f"b={b:g} mm；m={-b/a:g}",size=17,anchor="end")
    conjugate(90,209,810,150,75,4,"空延长管：50 mm薄镜，从无穷远位置增加25 mm像距")
    conjugate(70,426,385,300,60,4,"原缩小共轭")
    conjugate(555,426,375,60,300,.8,"交换共轭并倒转")
    s.text(500,540,"延长管改变像距；光路倒转且交换共轭，使倍率成为倒数",size=21,anchor="middle")
    s.text(500,574,"反装不改变理想薄镜焦距；实际倍率还需安装距离、主平面和对焦状态",size=17,color=GRAY,anchor="middle")
    s.save("18_macro_conjugates.svg")


def figure_18_focus_drives():
    s=SVG("图 18.4  转动传动、音圈直驱与超声摩擦驱动")
    for x,title in [(30,"旋转 → 丝杠位移"),(354,"音圈：电磁力直驱"),(678,"超声：振动与摩擦")]:
        s.panel(x,105,292,382,title)
    s.circle(105,242,39,fill=PALE_BLUE,stroke=BLUE,sw=2)
    for j in range(4):
        a=j*math.pi/2
        s.line(105+15*math.cos(a),242+15*math.sin(a),105+32*math.cos(a),242+32*math.sin(a),color=BLUE,width=5)
    s.arrow(76,192,133,192,color=AMBER,width=2.5)
    s.text(105,322,"转子",size=18,anchor="middle")
    s.text(243,327,"镜组滑块",size=16,color=GREEN,anchor="middle")
    s.line(149,242,295,242,color=GRAY,width=9)
    for x in range(157,295,11):s.line(x-4,251,x+4,233,color=INK,width=1.4)
    s.rect(221,217,43,50,fill=PALE_GREEN,stroke=GREEN,sw=2)
    s.arrow(221,292,279,292,color=GREEN,width=3)
    s.text(176,366,"导程 p / 每转",size=19,anchor="middle")
    s.text(176,418,"指令细分 ≠ 实际位置精度",size=17,anchor="middle")
    s.rect(425,186,146,28,fill=PALE_RED,stroke=RED,sw=2)
    s.rect(425,316,146,28,fill=PALE_BLUE,stroke=BLUE,sw=2)
    s.text(498,207,"N",size=18,anchor="middle")
    s.text(498,337,"S",size=18,anchor="middle")
    s.arrow(451,225,451,303,color=GRAY,width=2.5)
    s.text(432,266,"B",size=19,anchor="end")
    s.rect(490,236,81,53,fill=PALE_GREEN,stroke=GREEN,sw=2)
    s.circle(514,261,12,stroke=INK,sw=2)
    s.circle(514,261,3,fill=INK,stroke=INK)
    s.arrow(547,261,613,261,color=GREEN,width=3)
    s.text(604,242,"F",size=19,color=GREEN,anchor="middle")
    s.text(575,307,"镜组滑块",size=16,color=GREEN,anchor="middle")
    s.text(500,372,"有效线段电流朝纸外",size=17,anchor="middle")
    s.text(500,418,"F ≈ K_F I；位置另由反馈控制",size=16,anchor="middle")
    wave=[(706+i,270+10*math.sin(i/243*6*math.pi)) for i in range(244)]
    s.polyline(wave,color=BLUE,width=4)
    s.rect(716,235,218,25,fill=PALE_AMBER,stroke=AMBER,sw=2,radius=2)
    s.arrow(894,210,760,210,color=AMBER,width=3)
    s.arrow(721,319,928,319,color=BLUE,width=2.5)
    s.text(824,346,"行波传播",size=17,color=BLUE,anchor="middle")
    s.text(824,372,"接触面振动带动上方滑块/转子",size=15,anchor="middle")
    s.text(824,418,"图示为局部侧视，不按振幅比例",size=15,anchor="middle")
    s.text(500,535,"镜组质量、传动、位置传感与伺服共同决定到位过程",size=22,anchor="middle")
    s.text(500,572,"功能示意：直线输出既可来自电磁力，也可来自压电超声驱动",size=18,color=GRAY,anchor="middle")
    s.save("18_focus_drives.svg")


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
    figure_12_frequency_orientation,
    figure_13_aberration_spots,
    figure_13_field_curvature,
    figure_13_distortion_grid,
    figure_14_glass_map,
    figure_14_achromat,
    figure_15_asphere_profile,
    figure_15_pf_dispersion,
    figure_15_ar_coating,
    figure_15_flare_forms,
    figure_16_lens_architectures,
    figure_16_classical_layouts,
    figure_16_depth_of_field,
    figure_16_stabilization,
    figure_17_mtf_chart,
    figure_17_slanted_edge_pipeline,
    figure_17_test_protocol,
    figure_18_pupil_clearance,
    figure_18_teleconverter,
    figure_18_macro_conjugates,
    figure_18_focus_drives,
]


def main() -> None:
    for render in FIGURES:
        render()
    print(f"generated_figures={len(FIGURES)}")


if __name__ == "__main__":
    main()
