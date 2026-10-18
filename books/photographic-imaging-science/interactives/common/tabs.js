// Each tab retains its own controls; only the active tab supplies discussion data.
export function tabs({element, signal, session, title, modes}) {
  const root = element.shadowRoot ?? element.attachShadow({mode:'open'});
  root.innerHTML = '<style>:host{display:block;color:var(--text,#263c33)}nav{display:flex;flex-wrap:wrap;gap:8px;padding:18px 24px 0}button{font:11px/1.6 ui-sans-serif,-apple-system,"PingFang SC",sans-serif;color:inherit;border:1px solid #9caea2;border-radius:5px;background:transparent;padding:4px 9px;cursor:pointer}button[aria-pressed=true]{background:#9caea222;border-color:currentColor}button:focus-visible{outline:2px solid currentColor;outline-offset:3px}[hidden]{display:none}</style><nav></nav><div data-panels></div>';
  root.querySelector('nav').setAttribute('aria-label',title);
  const saved=session?.load();
  const state=saved?.version===1 && saved.panels && typeof saved.panels==='object' ? saved : {version:1, panels:{}};
  const panels=new Map(), cleanups=[], descriptions=new Map();
  let active=modes.some(m=>m[0]===state.tab) ? state.tab : modes[0][0];
  const save=()=>session?.save(state);
  session?.describe(()=>({title, tab:modes.find(m=>m[0]===active)[1], ...(descriptions.get(active)?.() ?? {})}));
  function show(key) {
    active=key;state.tab=key;save();
    if(!panels.has(key)) {
      const panel=document.createElement('div');panels.set(key,panel);root.querySelector('[data-panels]').append(panel);
      const child=session ? {load:()=>state.panels[key], save:value=>{state.panels[key]=value;save();},describe:capture=>descriptions.set(key,capture)} : undefined;
      cleanups.push(modes.find(m=>m[0]===key)[2]({element:panel,signal,session:child}));
    }
    for(const [key,panel] of panels) panel.hidden=key!==active;
    for(const b of root.querySelectorAll('nav button')) b.setAttribute('aria-pressed',String(b.dataset.mode===key));
  }
  for(const [key,label] of modes) {const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.mode=key;b.addEventListener('click',()=>show(key),{signal});root.querySelector('nav').append(b);}
  show(active);
  let disposed=false;
  const dispose=()=>{if(disposed)return;disposed=true;for(const cleanup of cleanups)cleanup?.();root.replaceChildren();};
  signal?.addEventListener('abort',dispose,{once:true});return dispose;
}
