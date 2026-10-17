#!/usr/bin/env python3
"""Audit Markdown textbooks against the repository's OET rigor baseline.

This is a structural auditor, not a proof checker.  It reports places where a
human or mathematical reviewer must verify that a theorem has an explicit
proof boundary and that the Markdown source does not hide known incomplete or
renderer-dependent constructs.
"""

from __future__ import annotations

import argparse
import re
import sys
from urllib.parse import unquote
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parent
BOOKS = tuple(
    sorted(path.name for path in ROOT.iterdir() if path.is_dir() and (path / "README.md").is_file())
)

THEOREM = re.compile(r"^\s*(?:>\s*)?\*\*(?:定理|命题|引理|推论)(?:\s|\.|：|:)")
BOUNDARY = re.compile(
    r"\*\*(?:证明|外部输入(?:定理)?|证明路线（外部输入）|"
    r"物理猜想|研究边界|推导(?:说明)?|验证状态)|"
    r"(?:完整)?证明见(?:附录|第)|见附录|外部输入|证明状态"
)
SKETCH = re.compile(r"证明草图|证明思路|推导草图")
PLACEHOLDER = re.compile(
    r"\b(?:TODO|TBD|FIXME)\b|待补(?:充)?|待证(?:明)?|证明略|"
    r"省略证明|证明留作练习|精确编号待补|locator (?:未完成|尚未)"
)
INCOMPATIBLE = re.compile(r"\\begin\{CD\}|\\mathbbm|\\xymatrix")
BARE_COLONEQQ = re.compile(r"(?<!\\)\bcoloneqq\b")
BARE_TEX_SPACING = re.compile(
    r"(?<![\\A-Za-z])(?:quad|qquad)(?=(?:\\[A-Za-z]+|\s+[A-Za-z0-9]))"
)
BARE_TEX_DELIMITER = re.compile(
    r"(?<![\\A-Za-z])(?:left|right)(?=[\[\]\(\)\{\}\\])"
)
MALFORMED_INTEGRAL_DIFFERENTIAL = re.compile(
    r"\\int[^\n$]{0,240}(?<=[\s}\)\]]),d(?=[A-Za-z\\])"
)
LATEX_BEGIN = re.compile(r"\\begin\{([^}]+)\}")
LATEX_END = re.compile(r"\\end\{([^}]+)\}")
MARKDOWN_LINK = re.compile(r"!?\[[^\]]*\]\(([^)]+)\)")
META_NAMES = {
    "MATH_REVIEW.md",
    "TEXTBOOK_REVIEW.md",
    "CLOSURE_REVIEW.md",
    "CONTENT_CLOSURE_AUDIT.md",
    "CHAPTER_CLOSURE_AUDIT.md",
    "PUBLICATION_CLOSURE_AUDIT.md",
    "PUBLICATION_PROOFREADING_AUDIT.md",
    "PUBLICATION_CLOSURE_MATRIX.md",
    "INTERNAL_CLOSURE_MATRIX.md",
    "INTERNAL_COMPLETENESS_AUDIT.md",
    "INTERNAL_CHAPTER_COMPLETENESS_AUDIT.md",
    "CHAPTER_DENSITY_AUDIT.md",
    "FORMAL_TEXTBOOK_COMPLETENESS.md",
    "FORMAL_TEXTBOOK_EXPANSION_AUDIT.md",
    "G_final_textbookization_audit.md",
    "G_formal_textbookization_audit.md",
    "H_content_closure_audit.md",
    "TYPESETTING_AND_NUMBERING.md",
}
META_MARKERS = (
    "AUDIT",
    "REVIEW",
    "MATRIX",
    "LEDGER",
    "LOCATOR",
    "DEPENDENCY",
    "STATUS",
)


@dataclass(frozen=True)
class Finding:
    severity: str
    path: Path
    line: int
    message: str


def markdown_files(book: Path) -> list[Path]:
    return sorted(
        path
        for path in book.rglob("*.md")
        if ".git" not in path.parts and path.name != "MANIFEST.bundle"
    )


def theorem_boundary_findings(path: Path, lines: list[str]) -> list[Finding]:
    findings: list[Finding] = []
    starts = [index for index, line in enumerate(lines) if THEOREM.search(line)]
    for position, start in enumerate(starts):
        stop = starts[position + 1] if position + 1 < len(starts) else len(lines)
        for index in range(start + 1, stop):
            if index > start + 1 and lines[index].startswith("#"):
                stop = index
                break
        body = "\n".join(lines[start:stop])
        if not BOUNDARY.search(body):
            findings.append(
                Finding(
                    "ERROR",
                    path,
                    start + 1,
                    "定理型陈述在下一定理或文件结束前没有证明/外部输入/推导边界",
                )
            )
        elif SKETCH.search(body):
            findings.append(
                Finding(
                    "WARN",
                    path,
                    start + 1,
                    "定理仍以证明草图收束；应补全或改成外部输入定理加证明路线",
                )
            )
    return findings


def audit_file(path: Path) -> list[Finding]:
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    is_meta = path.name in META_NAMES or any(marker in path.name for marker in META_MARKERS)
    findings = [] if is_meta else theorem_boundary_findings(path, lines)

    if text.count("$$") % 2:
        findings.append(Finding("ERROR", path, 1, "显示数学分隔符 $$ 数量为奇数"))
    if sum(line.lstrip().startswith("```") for line in lines) % 2:
        findings.append(Finding("ERROR", path, 1, "Markdown 围栏代码块数量为奇数"))

    begin_counts: dict[str, int] = {}
    end_counts: dict[str, int] = {}
    for environment in LATEX_BEGIN.findall(text):
        begin_counts[environment] = begin_counts.get(environment, 0) + 1
    for environment in LATEX_END.findall(text):
        end_counts[environment] = end_counts.get(environment, 0) + 1
    for environment in sorted(set(begin_counts) | set(end_counts)):
        if begin_counts.get(environment, 0) != end_counts.get(environment, 0):
            findings.append(
                Finding(
                    "ERROR",
                    path,
                    1,
                    f"LaTeX 环境 {environment} 的 begin/end 数量不一致",
                )
            )

    for number, line in enumerate(lines, 1):
        if INCOMPATIBLE.search(line):
            findings.append(
                Finding("ERROR", path, number, "包含目标 Markdown 阅读器不保证支持的 LaTeX 环境或宏")
            )
        if PLACEHOLDER.search(line):
            findings.append(
                Finding(
                    "WARN" if is_meta else "ERROR",
                    path,
                    number,
                    "审计/索引仍记录未闭合项" if is_meta else "正文或来源文件含未闭合占位标记",
                )
            )
        if BARE_COLONEQQ.search(line):
            findings.append(
                Finding("ERROR", path, number, "疑似漏写反斜杠：应使用 \\coloneqq")
            )
        if BARE_TEX_SPACING.search(line):
            findings.append(
                Finding(
                    "ERROR",
                    path,
                    number,
                    "疑似漏写反斜杠：数学间距命令应使用 \\quad 或 \\qquad",
                )
            )
        if BARE_TEX_DELIMITER.search(line):
            findings.append(
                Finding(
                    "ERROR",
                    path,
                    number,
                    "疑似漏写反斜杠：伸缩分隔符应使用 \\left 或 \\right",
                )
            )
        if MALFORMED_INTEGRAL_DIFFERENTIAL.search(line):
            findings.append(
                Finding(
                    "ERROR",
                    path,
                    number,
                    "积分微分前出现普通逗号；疑似应写成 \\,d...",
                )
            )

        for match in MARKDOWN_LINK.finditer(line):
            raw_target = match.group(1).strip().strip("<>")
            target = raw_target.split("#", 1)[0]
            if not target or target.startswith(("http://", "https://", "mailto:")):
                continue
            target = unquote(target)
            suffix = Path(target.rstrip("/")).suffix.lower()
            looks_local = target.endswith("/") or suffix in {
                ".md", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".pdf"
            }
            if looks_local and not (path.parent / target).resolve().exists():
                findings.append(
                    Finding("ERROR", path, number, f"本地链接目标不存在: {raw_target}")
                )
    return findings


def resolve_books(names: list[str]) -> list[Path]:
    selected = names or list(BOOKS)
    books: list[Path] = []
    for name in selected:
        path = ROOT / name
        if not path.is_dir():
            raise SystemExit(f"unknown textbook directory: {name}")
        books.append(path)
    return books


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("books", nargs="*", help="book directory names under books/")
    parser.add_argument("--strict", action="store_true", help="treat warnings as failures")
    args = parser.parse_args()

    findings: list[Finding] = []
    for book in resolve_books(args.books):
        for path in markdown_files(book):
            findings.extend(audit_file(path))

    for finding in findings:
        relative = finding.path.relative_to(ROOT.parent)
        print(f"{finding.severity} {relative}:{finding.line}: {finding.message}")

    errors = sum(f.severity == "ERROR" for f in findings)
    warnings = sum(f.severity == "WARN" for f in findings)
    print(f"oet-rigor-audit: errors={errors} warnings={warnings}")
    return 1 if errors or (args.strict and warnings) else 0


if __name__ == "__main__":
    sys.exit(main())
