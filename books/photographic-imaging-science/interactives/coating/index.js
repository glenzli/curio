import { mount as single } from "./single-layer-view.js";
import { mount as multilayer } from "../multilayer/index.js";

export function mount({ element, signal }) {
  const root = element.shadowRoot ?? element.attachShadow({ mode: "open" });
  root.innerHTML = `<style>:host{display:block;color:var(--text,#263c33)}nav{display:flex;flex-wrap:wrap;gap:8px;padding:20px 24px 0}button{font:11px/1.6 ui-sans-serif,-apple-system,"PingFang SC",sans-serif;color:inherit;border:1px solid #9caea2;border-radius:5px;background:transparent;padding:4px 9px;cursor:pointer}button[aria-pressed=true]{border-color:currentColor;background:#9caea222}button:focus-visible{outline:2px solid currentColor;outline-offset:3px}[hidden]{display:none}@media(max-width:550px){nav{padding:18px 18px 0}}</style><nav aria-label="镀膜实验"></nav><div data-panels></div>`;
  const modes = [["single", "单层相消", single], ["multilayer", "多层膜", multilayer]];
  const panels = new Map(), disposers = [];
  function show(key) {
    if (!panels.has(key)) {
      const panel = document.createElement("div");
      panel.dataset.coatingPanel = key;
      root.querySelector("[data-panels]").append(panel);
      panels.set(key, panel);
      disposers.push(modes.find((m) => m[0] === key)[2]({ element: panel, signal }));
    }
    for (const [name, panel] of panels) panel.hidden = name !== key;
    for (const b of root.querySelectorAll("nav button")) b.setAttribute("aria-pressed", String(b.dataset.mode === key));
  }
  for (const [key, label] of modes) {
    const b = document.createElement("button");
    b.textContent = label; b.dataset.mode = key;
    b.addEventListener("click", () => show(key), { signal });
    root.querySelector("nav").append(b);
  }
  show("single");
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const f of disposers) f?.();
    root.replaceChildren();
  };
  signal?.addEventListener("abort", dispose, { once: true });
  return dispose;
}
