import { tabs } from "../common/tabs.js";
import { mountLesson } from "../common/lesson.js";
import { tubeSpec, converterSpec, reverseSpec } from "./lesson.js";
export function mount(context) {
  return tabs({
    ...context,
    title: "近摄与增距附件",
    modes: [
      ["tube", "空延长管", (ctx) => mountLesson(ctx, tubeSpec)],
      ["converter", "增距镜", (ctx) => mountLesson(ctx, converterSpec)],
      ["reverse", "反装与共轭", (ctx) => mountLesson(ctx, reverseSpec)],
    ],
  });
}
