import {plot,legend} from '../common/ui.js';
import {parameters,linePsf,spectralAt,spectralPsf} from './model.js';
const blue='#528aa6',orange='#b28143',green='#4b8066',purple='#9275a6';
export function spectrumFigures(input={}) {
 const p=parameters(input),span=4*Math.max(p.wavelengthA,p.wavelengthB)*.001*p.fNumber+Math.abs(p.shiftUm)/2,center=p.shiftUm/2;
 const xMin=center-span,xMax=center+span;
 const xs=Array.from({length:241},(_,i)=>xMin+(xMax-xMin)*i/240);
 const psf=[
  {name:'A · 单色归一化 PSF',color:blue,points:xs.map(x=>[x,linePsf(x,p.wavelengthA,p.fNumber)])},
  {name:'B · 单色归一化 PSF',color:orange,points:xs.map(x=>[x,linePsf(x,p.wavelengthB,p.fNumber,p.shiftUm)])},
  {name:'按探测信号权重合成',color:green,points:xs.map(x=>[x,spectralPsf(p,x)])},
 ];
 const max=Math.max(...psf.flatMap(c=>c.points.map(v=>v[1])))*1.05;
 const cutoff=1000/(Math.min(p.wavelengthA,p.wavelengthB)*.001*p.fNumber);
 const points=fn=>Array.from({length:241},(_,i)=>{const x=cutoff*i/240;return [x,fn(spectralAt(p,x))]});
 const otf=[
  {name:'合成 MTF',color:green,points:points(h=>h.mtf)},
  {name:'Re H',color:blue,points:points(h=>h.h[0])},
  {name:'Im H',color:purple,points:points(h=>h.h[1])},
  {name:'错误顺序：先取模再加权',color:orange,dashed:true,points:points(h=>h.wrongAverage)},
 ];
 return {
  psf:plot({curves:psf,xMin,xMax,yMin:0,yMax:max,xLabel:'像面横坐标 · µm',yLabel:'PSF · µm⁻²',title:'两条单色 PSF 与非相干强度和',width:480,topLabelY:16,bottomLabelPadding:8}),
  psfLegend:legend(psf),
  otf:plot({curves:otf,xMax:cutoff,yMin:-1,yMax:1,xLabel:'同一像面空间频率 · lp/mm',yLabel:'复 OTF / MTF',title:'先合成复 OTF，再取模',markers:p.frequency<=cutoff?[{value:p.frequency,label:'探针'}]:[],width:480,topLabelY:16,bottomLabelPadding:8}),
  otfLegend:legend(otf),
 };
}
