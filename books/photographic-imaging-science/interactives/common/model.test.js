import test from 'node:test';
import assert from 'node:assert/strict';
import {restoredControlValue} from './ui.js';
import {replay} from './replay.js';
test('stored continuous optical values preserve ideal matching and quarter-wave thickness with step any',()=>{
 const index=Math.sqrt(1.52),thickness=550/(4*index);
 assert.equal(restoredControlValue({min:1,max:2.2,step:'any',value:1.38},index),index);
 assert.equal(restoredControlValue({min:0,max:300,step:'any',value:100},thickness),thickness);
});
test('restored replay coefficients are not requantized into a different wavefront',()=>{
 const coefficient=.123456789;
 assert.equal(restoredControlValue({min:-.25,max:.25,step:.005,value:0},coefficient),coefficient);
});
test('out-of-range stored controls clamp and nonfinite values use authored defaults',()=>{
 const control={min:0,max:2,step:.01,value:1};
 assert.equal(restoredControlValue(control,-1),0);assert.equal(restoredControlValue(control,3),2);
 for(const value of [undefined,null,'1',NaN,Infinity])assert.equal(restoredControlValue(control,value),1);
});

test('a first frame older than the click keeps strict progress valid; finite replay and pause still work',(t)=>{
 const pending=new Map();let nextId=0,button,clock=1000,dispose;
 class Button extends EventTarget {
  dataset={};attributes={};textContent='';
  setAttribute(k,v){this.attributes[k]=v;}
 }
 const actions=new EventTarget();actions.prepend=b=>{button=b;};
 const root=new EventTarget();root.querySelector=()=>actions;
 const doc=new EventTarget();doc.hidden=false;doc.createElement=()=>new Button();
 const replacements={
  document:doc,
  requestAnimationFrame:fn=>{const id=++nextId;pending.set(id,fn);return id;},
  cancelAnimationFrame:id=>pending.delete(id),
  IntersectionObserver:class {observe(){} disconnect(){}},
 };
 const descriptors=Object.fromEntries(Object.keys(replacements).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 t.after(()=>{
  dispose?.();
  for(const [key,descriptor] of Object.entries(descriptors))
   if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
 });
 for(const [key,value] of Object.entries(replacements)){
  Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
 }
 t.mock.method(performance,'now',()=>clock);
 const state={progress:1},drawn=[];
 dispose=replay({root,state,key:'progress',start:0,end:1,durationMs:100,
  element:{},signal:new AbortController().signal,label:'追迹',startOnFirstPlay:true,
  render(){assert.ok(state.progress>=0&&state.progress<=1);drawn.push(state.progress);},
 });
 const frame=time=>{assert.equal(pending.size,1);const [id,fn]=pending.entries().next().value;pending.delete(id);fn(time);};
 button.dispatchEvent(new Event('click'));frame(999);
 assert.equal(state.progress,0);
 frame(1049);assert.ok(state.progress>0&&state.progress<1);
 frame(1200);assert.equal(state.progress,1);assert.equal(pending.size,0);
 assert.equal(button.textContent,'追迹');
 clock=2000;button.dispatchEvent(new Event('click'));frame(1999);
 assert.equal(state.progress,0);
 frame(2010);assert.ok(state.progress>drawn.at(-1));
 root.dispatchEvent(new Event('input'));
 assert.equal(pending.size,0);assert.equal(button.attributes['aria-pressed'],'false');
 assert.equal(drawn.at(-1),state.progress);
 assert.ok(drawn.includes(1));
});
