#!/usr/bin/env python3
"""Mechanical closure checks for the photographic imaging science textbook."""

from __future__ import annotations

import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


ROOT = Path(__file__).resolve().parent
FIGURE_ROOT = ROOT / "figures"
CHAPTER_RE = re.compile(r"^\d{2}_.+\.md$")
EXERCISE_RE = re.compile(r"\*\*练习\s+(\d+\.\d+)\.\*\*")
ANSWER_RE = re.compile(r"\*\*答案\s+(\d+\.\d+)\.\*\*")
NUMBERED_BLOCK_RE = re.compile(
    r"\*\*(?:定义|命题|引理|定理|推论|例子|推导|约定|说明)\s+(\d+\.\d+)"
)
LINK_RE = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
IMAGE_RE = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")
FIGURE_CAPTION_RE = re.compile(
    r"!\[图 [^\]]+\]\([^)]+\)\n\n\*图\s+(\d+\.\d+)\b"
)
FIGURE_NUMBER_RE = re.compile(r"^图\s+(\d+\.\d+)\b")
TAG_RE = re.compile(r"\\tag\{([^}]+)\}")
EQUATION_REFERENCE_RE = re.compile(
    r"(?:式\s*|--)\((\d+\.\d+[a-z]?)\)"
)
DISPLAY_MATH_RE = re.compile(r"\$\$(.*?)\$\$", re.DOTALL)
ENV_TOKEN_RE = re.compile(r"\\(begin|end)\{([^}]+)\}")
EXPECTED_EXERCISES = {
    0: 0,
    1: 3,
    2: 4,
    3: 4,
    4: 4,
    5: 3,
    6: 3,
    7: 3,
    8: 3,
    9: 4,
    10: 4,
    11: 4,
    12: 4,
    13: 4,
    14: 4,
    15: 4,
    16: 3,
    17: 4,
}
EXPECTED_FIGURES = {
    0: 0,
    1: 2,
    2: 3,
    3: 2,
    4: 3,
    5: 3,
    6: 4,
    7: 3,
    8: 3,
    9: 3,
    10: 2,
    11: 3,
    12: 3,
    13: 3,
    14: 2,
    15: 3,
    16: 3,
    17: 3,
}
FORBIDDEN = (
    "TODO",
    "placeholder",
    "证明略",
    "证明草图",
    "完整证明需要",
    "显然",
    "容易看出",
    "不难看出",
)


def fail(message: str) -> None:
    print(f"error: {message}", file=sys.stderr)
    raise SystemExit(1)


def local_target(raw: str) -> str | None:
    target = raw.split("#", 1)[0].strip()
    if not target or "://" in target or target.startswith("mailto:"):
        return None
    return target


def main() -> None:
    markdown = sorted(ROOT.glob("*.md"))
    chapters = [path for path in markdown if CHAPTER_RE.match(path.name)]
    if len(chapters) != 18:
        fail(f"expected 18 numbered chapters, found {len(chapters)}")

    for path in markdown:
        text = path.read_text(encoding="utf-8")
        bad_controls = [
            (index, ord(char))
            for index, char in enumerate(text)
            if ord(char) < 32 and char not in "\n\t"
        ]
        if bad_controls:
            fail(f"control character in {path.name}: {bad_controls[0]}")
        if any(line.rstrip() != line for line in text.splitlines()):
            fail(f"trailing whitespace in {path.name}")
        if any(token in text for token in (",qquad", ",quad", r"\n+")):
            fail(f"broken LaTeX or patch artifact in {path.name}")
        for marker in FORBIDDEN:
            if marker in text:
                fail(f"forbidden marker {marker!r} in {path.name}")
        if text.count("```") % 2:
            fail(f"unclosed code fence in {path.name}")
        if text.count("$$") % 2:
            fail(f"unclosed display-math fence in {path.name}")
        if text.replace("$$", "").count("$") % 2:
            fail(f"unclosed inline-math fence in {path.name}")
        for block in DISPLAY_MATH_RE.findall(text):
            if block.count("{") != block.count("}"):
                fail(f"unbalanced braces in display math in {path.name}")
            environment_stack: list[str] = []
            for token, environment in ENV_TOKEN_RE.findall(block):
                if token == "begin":
                    environment_stack.append(environment)
                elif not environment_stack or environment_stack.pop() != environment:
                    fail(f"unbalanced math environment in {path.name}")
            if environment_stack:
                fail(f"unclosed math environment in {path.name}")
        tags = TAG_RE.findall(text)
        if len(tags) != len(set(tags)):
            fail(f"duplicate equation tag in {path.name}")
        for raw_target in LINK_RE.findall(text):
            target = local_target(raw_target)
            if target is not None and not (path.parent / target).exists():
                fail(f"broken local link in {path.name}: {target}")

    exercises: list[str] = []
    chapter_tags: set[str] = set()
    referenced_figures: list[Path] = []
    referenced_figure_numbers: dict[Path, str] = {}
    referenced_figure_alts: dict[Path, str] = {}
    for path in chapters:
        text = path.read_text(encoding="utf-8")
        number = int(path.name[:2])
        first_section = text.find("\n## ")
        if first_section < 0 or first_section < 120:
            fail(f"chapter lacks a substantive natural introduction: {path.name}")
        if number == 0 and "## 练习" in text:
            fail(f"preface should not contain exercises: {path.name}")
        if number != 0 and "## 练习" not in text:
            fail(f"chapter lacks exercises: {path.name}")
        ids = EXERCISE_RE.findall(text)
        expected_exercises = EXPECTED_EXERCISES[number]
        if len(ids) != expected_exercises:
            fail(
                f"expected {expected_exercises} exercises in {path.name}, "
                f"found {len(ids)}"
            )
        expected_exercise_ids = [
            f"{number}.{index}" for index in range(1, expected_exercises + 1)
        ]
        if ids != expected_exercise_ids:
            fail(
                f"non-contiguous exercise numbering in {path.name}; "
                f"expected={expected_exercise_ids}, found={ids}"
            )
        block_ids = NUMBERED_BLOCK_RE.findall(text)
        expected_block_ids = [
            f"{number}.{index}" for index in range(1, len(block_ids) + 1)
        ]
        if block_ids != expected_block_ids:
            fail(
                f"non-contiguous numbered blocks in {path.name}; "
                f"expected={expected_block_ids}, found={block_ids}"
            )
        tags = TAG_RE.findall(text)
        if any(not tag.startswith(f"{number}.") for tag in tags):
            fail(f"equation tag has wrong chapter prefix in {path.name}")
        duplicate_tags = chapter_tags.intersection(tags)
        if duplicate_tags:
            fail(f"duplicate equation tags across chapters: {sorted(duplicate_tags)}")
        chapter_tags.update(tags)
        exercises.extend(ids)

        images = IMAGE_RE.findall(text)
        expected_figures = EXPECTED_FIGURES[number]
        if len(images) != expected_figures:
            fail(
                f"expected {expected_figures} figures in {path.name}, "
                f"found {len(images)}"
            )
        caption_numbers = FIGURE_CAPTION_RE.findall(text)
        if len(caption_numbers) != len(images):
            fail(f"figure lacks numbered adjacent caption in {path.name}")
        chapter_figure_numbers: list[str] = []
        for alt, raw_target in images:
            number_match = FIGURE_NUMBER_RE.match(alt)
            if number_match is None:
                fail(f"figure alt text lacks number in {path.name}: {alt!r}")
            figure_number = number_match.group(1)
            chapter_figure_numbers.append(figure_number)
            target = local_target(raw_target)
            if target is None:
                fail(f"chapter figure must be local in {path.name}: {raw_target}")
            resolved_target = (path.parent / target).resolve()
            if resolved_target in referenced_figure_numbers:
                fail(f"a figure is referenced more than once: {target}")
            referenced_figure_numbers[resolved_target] = figure_number
            referenced_figure_alts[resolved_target] = alt
            referenced_figures.append(resolved_target)
        expected_figure_numbers = [
            f"{number}.{index}" for index in range(1, expected_figures + 1)
        ]
        if chapter_figure_numbers != expected_figure_numbers:
            fail(
                f"non-contiguous figure numbering in {path.name}; "
                f"expected={expected_figure_numbers}, found={chapter_figure_numbers}"
            )
        if caption_numbers != chapter_figure_numbers:
            fail(
                f"figure alt/caption mismatch in {path.name}; "
                f"alt={chapter_figure_numbers}, caption={caption_numbers}"
            )

    if len(exercises) != len(set(exercises)):
        fail("duplicate exercise identifiers")

    solutions = (ROOT / "SOLUTIONS.md").read_text(encoding="utf-8")
    answers = ANSWER_RE.findall(solutions)
    if len(answers) != len(set(answers)):
        fail("duplicate answer identifiers")
    if set(exercises) != set(answers):
        missing = sorted(set(exercises) - set(answers))
        extra = sorted(set(answers) - set(exercises))
        fail(f"exercise/answer mismatch; missing={missing}, extra={extra}")
    if answers != exercises:
        fail("answer order does not match chapter/exercise order")

    for path in markdown:
        text = path.read_text(encoding="utf-8")
        for reference in EQUATION_REFERENCE_RE.findall(text):
            if reference not in chapter_tags:
                fail(f"unknown equation reference ({reference}) in {path.name}")

    figure_paths = sorted(path.resolve() for path in FIGURE_ROOT.glob("*.svg"))
    if len(figure_paths) != 48:
        fail(f"expected 48 generated SVG figures, found {len(figure_paths)}")
    if set(figure_paths) != set(referenced_figures):
        missing = sorted(
            str(path.relative_to(ROOT))
            for path in set(figure_paths) - set(referenced_figures)
        )
        extra = sorted(
            str(path)
            for path in set(referenced_figures) - set(figure_paths)
        )
        fail(f"figure inventory mismatch; unreferenced={missing}, unknown={extra}")
    if not (FIGURE_ROOT / "generate_figures.py").is_file():
        fail("missing deterministic figure generator")
    for path in figure_paths:
        try:
            root = ET.parse(path).getroot()
        except ET.ParseError as error:
            fail(f"invalid SVG {path.name}: {error}")
        if not root.tag.endswith("svg"):
            fail(f"invalid SVG root in {path.name}")
        for attribute in ("width", "height", "viewBox", "role", "aria-label"):
            if not root.get(attribute):
                fail(f"SVG lacks {attribute} in {path.name}")
        aria_label = root.get("aria-label", "")
        number_match = FIGURE_NUMBER_RE.match(aria_label)
        if number_match is None:
            fail(f"SVG aria-label lacks figure number in {path.name}")
        svg_number = number_match.group(1)
        if svg_number != referenced_figure_numbers[path]:
            fail(
                f"SVG/text figure-number mismatch in {path.name}; "
                f"svg={svg_number}, text={referenced_figure_numbers[path]}"
            )
        if " ".join(aria_label.split()) != " ".join(
            referenced_figure_alts[path].split()
        ):
            fail(f"SVG/text figure-title mismatch in {path.name}")

    source_notes = (ROOT / "CHAPTER_SOURCE_NOTES.md").read_text(encoding="utf-8")
    for number in range(18):
        if f"| {number} |" not in source_notes:
            fail(f"missing chapter {number} in source notes")

    print(f"markdown_files={len(markdown)}")
    print(f"numbered_chapters={len(chapters)}")
    print(f"exercises={len(exercises)}")
    print(f"answers={len(answers)}")
    print(f"svg_figures={len(figure_paths)}")
    print(f"figure_references={len(referenced_figures)}")
    print("validation=ok")


if __name__ == "__main__":
    main()
