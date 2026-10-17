#!/usr/bin/env python3
"""Mechanical checks for readable textbook chapter framing."""

from __future__ import annotations

import argparse
import re
import sys
from collections import defaultdict
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path


ROOT = Path(__file__).resolve().parent

ALL_BOOKS = tuple(
    sorted(path.name for path in ROOT.iterdir() if path.is_dir() and (path / "README.md").is_file())
)
DEFAULT_BOOKS = ALL_BOOKS

FORBIDDEN_HEADING = re.compile(
    r"^#{2,6}\s+(?:\d+(?:\.\d+)*\s+)?"
    r"(?:本章目标|目标|依赖(?:前置知识)?|主线|本章小结)\s*$",
    re.MULTILINE,
)
META_OPENING = re.compile(
    r"^(?:本章目标|本章将|本节将|本章主要|本章首先|下文将依次)"
)
META_PHRASE = re.compile(
    r"本章将|本节将|下文将依次|本书不声称|不能自动|不自动推出|不得"
)
MARKDOWN_NOISE = re.compile(r"[`*_>#\[\]()]|!\[[^\]]*\]\([^)]*\)")
TEMPLATEISH_HEADING = re.compile(
    r"^(?:本章)?(?:目标|学习目标|阅读目标|依赖|依赖前置知识|预备知识|前置知识|"
    r"章节路线|阅读路线|路线图|总结|小结|回顾)$"
)
H2 = re.compile(r"^##\s+(.+?)\s*$", re.MULTILINE)
HEADING = re.compile(r"^#{2,6}\s+(.+?)\s*$", re.MULTILINE)
SECTION_PREFIX = re.compile(r"^(?:\d+|[SPRMV]\d+|[A-Z])(?:\.\d+)*\s+")


@dataclass(frozen=True)
class Finding:
    level: str
    path: Path
    message: str


def chapter_intro(text: str) -> str:
    lines = text.splitlines()
    try:
        h1_index = next(i for i, line in enumerate(lines) if line.startswith("# "))
    except StopIteration:
        return ""

    collected: list[str] = []
    in_fence = False
    for line in lines[h1_index + 1 :]:
        if line.startswith("```"):
            in_fence = not in_fence
            continue
        if not in_fence and line.startswith("## "):
            break
        if not in_fence:
            collected.append(line)
    return "\n".join(collected).strip()


def prose_length(text: str) -> int:
    cleaned = MARKDOWN_NOISE.sub("", text)
    return len(re.sub(r"\s+", "", cleaned))


def normalized_intro(text: str) -> str:
    text = MARKDOWN_NOISE.sub("", text)
    text = re.sub(r"https?://\S+", "", text)
    return re.sub(r"[^0-9A-Za-z\u4e00-\u9fff]+", "", text).lower()


def section_titles(text: str) -> list[str]:
    return [SECTION_PREFIX.sub("", title).strip() for title in H2.findall(text)]


def requires_exercises(book: str, path: Path) -> bool:
    if book == "photographic-imaging-science" and path.name.startswith("00_preface_"):
        return False
    if book != "stochastic-parrot-anatomy":
        return True

    relative = path.relative_to(ROOT / book)
    # Volume I is a historical survey, Volume VI is an essay/autobiography, and
    # the last two chapters of Volume V are reference forms rather than lessons.
    if relative.parts[0] == "vol-06":
        return False
    if relative.parts[0] == "vol-01" and re.match(r"ch0[0-6]_", relative.name):
        return False
    if relative.parts[0] == "vol-05" and re.match(r"ch0[56]_", relative.name):
        return False
    return True


def chapter_paths(book: str, root: Path) -> list[Path]:
    if book == "stochastic-parrot-anatomy":
        preface = root / "00_preface_and_scope.md"
        chapters = sorted(root.glob("vol-*/ch[0-9][0-9]_*.md"))
        return ([preface] if preface.is_file() else []) + chapters
    if book == "condensed-mathematics":
        return sorted(root.rglob("[0-9][0-9]_*.md"))
    return sorted(root.glob("[0-9][0-9]_*.md"))


def audit_book(book: str) -> list[Finding]:
    root = ROOT / book
    findings: list[Finding] = []
    if not root.is_dir():
        return [Finding("ERROR", root, "book directory does not exist")]

    chapters = chapter_paths(book, root)
    if not chapters:
        return [Finding("ERROR", root, "no numbered chapters found")]

    intros: dict[Path, str] = {}
    repeated_titles: dict[str, list[Path]] = defaultdict(list)
    all_titles: dict[str, list[Path]] = defaultdict(list)
    unnumbered_preexercise: list[Path] = []

    for path in chapters:
        text = path.read_text(encoding="utf-8")
        for match in FORBIDDEN_HEADING.finditer(text):
            heading = match.group(0).strip()
            findings.append(
                Finding("ERROR", path, f"template heading remains: {heading}")
            )

        intro = chapter_intro(text)
        intros[path] = normalized_intro(intro)
        length = prose_length(intro)
        if length < 60:
            findings.append(
                Finding(
                    "ERROR",
                    path,
                    f"chapter opening has only {length} prose characters before first section",
                )
            )
        elif length < 120:
            findings.append(
                Finding(
                    "WARN",
                    path,
                    f"chapter opening is brief ({length} prose characters)",
                )
            )

        opening = re.sub(r"\s+", "", MARKDOWN_NOISE.sub("", intro))
        if META_OPENING.match(opening):
            findings.append(
                Finding("ERROR", path, "chapter still opens with writing-process narration")
            )

        meta_count = len(META_PHRASE.findall(text))
        if meta_count > 6:
            findings.append(
                Finding(
                    "WARN",
                    path,
                    f"defensive/meta phrasing appears {meta_count} times",
                )
            )

        raw_titles = [title.strip() for title in H2.findall(text)]
        titles = [SECTION_PREFIX.sub("", title).strip() for title in raw_titles]
        all_heading_titles = [
            SECTION_PREFIX.sub("", title.strip()).strip() for title in HEADING.findall(text)
        ]
        exercise_titles = {"练习", "习题", "综合练习"}
        if requires_exercises(book, path) and not exercise_titles.intersection(all_heading_titles):
            findings.append(Finding("ERROR", path, "missing exercise section"))

        exercise_index = next(
            (index for index, title in enumerate(titles) if title in exercise_titles), -1
        )
        if exercise_index > 0 and not SECTION_PREFIX.match(raw_titles[exercise_index - 1]):
            unnumbered_preexercise.append(path)

        for title in set(section_titles(text)):
            if title in {"本章目标", "目标", "依赖", "依赖前置知识", "主线", "本章小结"}:
                continue
            if title not in exercise_titles:
                all_titles[title].append(path)
            if TEMPLATEISH_HEADING.fullmatch(title):
                repeated_titles[title].append(path)

    for title, paths in sorted(repeated_titles.items()):
        if len(paths) < 2:
            continue
        listed = ", ".join(path.name for path in paths)
        findings.append(
            Finding(
                "ERROR",
                root,
                f"replacement template heading {title!r} is repeated in {len(paths)} chapters: {listed}",
            )
        )

    for title, paths in sorted(all_titles.items()):
        if len(paths) < 5 or title in repeated_titles:
            continue
        listed = ", ".join(path.name for path in paths)
        findings.append(
            Finding(
                "WARN",
                root,
                f"section heading {title!r} is repeated in {len(paths)} chapters: {listed}",
            )
        )

    if len(unnumbered_preexercise) >= 5:
        listed = ", ".join(path.name for path in unnumbered_preexercise)
        findings.append(
            Finding(
                "WARN",
                root,
                "an unnumbered closing section appears immediately before exercises "
                f"in {len(unnumbered_preexercise)} chapters: {listed}",
            )
        )

    intro_paths = list(intros)
    for index, left_path in enumerate(intro_paths):
        left = intros[left_path]
        if len(left) < 100:
            continue
        for right_path in intro_paths[index + 1 :]:
            right = intros[right_path]
            if len(right) < 100:
                continue
            ratio = SequenceMatcher(None, left, right, autojunk=False).ratio()
            if ratio >= 0.82:
                findings.append(
                    Finding(
                        "WARN",
                        root,
                        "chapter openings may be boilerplate "
                        f"({left_path.name}, {right_path.name}; similarity={ratio:.2f})",
                    )
                )

    return findings


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("books", nargs="*", choices=ALL_BOOKS)
    parser.add_argument(
        "--all",
        action="store_true",
        help="audit every top-level book directory containing a README",
    )
    parser.add_argument(
        "--summary-only",
        action="store_true",
        help="print only the aggregate error and warning count",
    )
    parser.add_argument(
        "--by-book",
        action="store_true",
        help="print one error/warning count per selected book",
    )
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args()

    if args.all and args.books:
        parser.error("--all cannot be combined with explicit book names")
    selected = ALL_BOOKS if args.all else (tuple(args.books) if args.books else DEFAULT_BOOKS)
    findings_by_book = {book: audit_book(book) for book in selected}
    findings = [
        finding
        for book_findings in findings_by_book.values()
        for finding in book_findings
    ]
    errors = sum(f.level == "ERROR" for f in findings)
    warnings = sum(f.level == "WARN" for f in findings)

    if not args.summary_only:
        for finding in findings:
            path = finding.path.relative_to(ROOT.parent)
            print(f"{finding.level}: {path}: {finding.message}")

    if args.by_book:
        for book, book_findings in findings_by_book.items():
            book_errors = sum(f.level == "ERROR" for f in book_findings)
            book_warnings = sum(f.level == "WARN" for f in book_findings)
            print(f"{book}: errors={book_errors} warnings={book_warnings}")

    print(f"textbook-narrative-audit: errors={errors} warnings={warnings}")
    return 1 if errors or (args.strict and warnings) else 0


if __name__ == "__main__":
    sys.exit(main())
