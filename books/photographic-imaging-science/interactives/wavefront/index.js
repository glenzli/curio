import { mountWave } from "../wave/view.js";
export function mount(context) {
  return mountWave({ ...context, aberrations: true });
}
