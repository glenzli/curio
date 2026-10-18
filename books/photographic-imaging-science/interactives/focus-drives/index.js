import { tabs } from "../common/tabs.js";
import { mountThreeLesson } from "../common/three-lesson.js";
import { stepperSpec, voiceSpec, ultrasonicSpec } from "./lesson.js";
import { stepperScene, voiceScene, ultrasonicScene } from "./scene.js";
export function mount(context) {
  return tabs({
    ...context,
    title: "三维对焦驱动",
    modes: [
      [
        "stepper",
        "步进与丝杠",
        (ctx) => mountThreeLesson(ctx, stepperSpec, stepperScene),
      ],
      [
        "voice",
        "音圈与制动",
        (ctx) => mountThreeLesson(ctx, voiceSpec, voiceScene),
      ],
      [
        "ultrasonic",
        "环形超声",
        (ctx) => mountThreeLesson(ctx, ultrasonicSpec, ultrasonicScene),
      ],
    ],
  });
}
