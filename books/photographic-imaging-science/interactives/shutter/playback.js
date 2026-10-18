import { replay } from "../common/replay.js";

// Both shutter views share bounded playback and save the exact paused state.
export function playback(context) {
  return replay({
    ...context,
    key: "progress",
    start: 0,
    end: 100,
    durationMs: 6000,
    label: "播放曝光过程",
  });
}
