---
name: oet-rigorous-math-physics-textbooks
description: Shared rigor contract for revising mathematical, mathematical-physics, and theoretical-physics textbooks under books/. Local textbook skills extend this contract and may not weaken its proof-status or type-checking requirements.
---

# 数学与物理教材共享写作约束

本文件适用于 `books/` 下全部数学、数学物理和理论物理教材。各书自己的
`SKILL.md` 负责学科特有约定；发生冲突时，采用不夸大定理状态、假设更
完整、类型信息更明确的一方。

教材正文还必须遵循 [人类可读教材叙事标准](TEXTBOOK_NARRATIVE_STANDARD.md)。
OET 标准约束命题是否严谨，叙事标准约束读者如何进入并理解这些命题；
二者不得互相替代。

## 强制基线

完整标准见 [OET_RIGOR_STANDARD.md](OET_RIGOR_STANDARD.md)。每轮正文修订
至少执行以下检查：

1. 先声明对象、定义域、值域、底域/系数、范畴或物理背景，再使用符号。
2. 定义同时处理后文会遇到的空、零、奇异、无穷或不收敛情形。
3. 定理列全量词、假设、结论类型和局部/整体口径。
4. 非平凡陈述必须落到完整书内证明、外部输入定理、物理推导或猜想/研究边界之一。
5. “证明草图”不得作为定理完成状态；补全证明，或改为外部输入的证明路线。
6. 外部输入记录精确版本、用途、来源和未重证边界。
7. 物理公式注明单位、号差、规范、近似参数、截断阶和适用能区。
8. 修改后先运行作用域审计 `python3 books/audit_oet_rigor.py <book> --strict`，再运行各书自己的验证脚本；全仓并行修订结束后重跑无作用域审计。
9. 运行 `git diff --check -- books/<book>`；行尾空白、裸 `coloneqq`、积分中的 `,d...`、未闭合代码围栏和不配对 LaTeX 环境均视为正文错误。
10. 外部输入的来源链接必须指向一手论文、原始讲义或公认专著定位；只有出版级页码尚未核对时，才可在审计账本中保留 warning，正文不得保留占位符。

## 状态词

- `证明`：本书承担并完成证明责任。
- `证明路线（外部输入）`：只帮助读者理解已引用定理，不声称完成证明。
- `推导说明（标准物理口径）`：按标准物理形式主义推导，但可能依赖路径积分、正规化或其他尚未在书内严格构造的输入。
- `外部输入定理`：精确陈述后引用。
- `物理猜想` / `研究边界`：不进入已证明结论链。

不得只更换状态词来隐藏缺口。每次降格都必须让正文的逻辑依赖同步变得
诚实：后续只能把它当作输入，不能再称为书内已证。
