import { tabs } from "../common/tabs.js";
import { mountThreeLesson } from "../common/three-lesson.js";
import { focusingSpec, zoomingSpec } from "./lesson.js";
import { lensMotionScene } from "./scene.js";
export function mount(context) {
  return tabs({
    ...context,
    title: "三维镜组运动",
    modes: [
      [
        "focus",
        "浮动对焦",
        (ctx) => mountThreeLesson(ctx, focusingSpec, lensMotionScene),
      ],
      [
        "zoom",
        "变焦补偿",
        (ctx) => mountThreeLesson(ctx, zoomingSpec, lensMotionScene),
      ],
    ],
  });
}
