import { mountThreeLesson } from "../common/three-lesson.js";
import { spec } from "./lesson.js";
import { createScene } from "./scene.js";
export function mount(context) {
  return mountThreeLesson(context, spec, createScene);
}
