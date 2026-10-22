import {plot,legend} from '../common/ui.js';
import {parameters,linePsf,spectralAt,spectralPsf} from './model.js';
const blue='#528aa6',orange='#b28143',green='#4b8066',purple='#9275a6';
export function spectrumFigures(input={}) {
 const p=parameters(input),xMin=-40,xMax=40;
 const xs=Array.from({length:601},(_,i)=>xMin+(xMax-xMin)*i/600);
 const psf=[
  {name:'A · 单色归一化 PSF',color:blue,points:xs.map(x=>[x,linePsf(x,p.wavelengthA,p.fNumber)])},
  {name:'B · 单色归一化 PSF',color:orange,points:xs.map(x=>[x,linePsf(x,p.wavelengthB,p.fNumber,p.shiftUm)])},
  {name:'按探测信号权重合成',color:green,points:xs.map(x=>[x,spectralPsf(p,x)])},
 ];
 const max=Math.max(...psf.flatMap(c=>c.points.map(v=>v[1])))*1.05;
 const frequencyMax=400;
 const points=fn=>Array.from({length:241},(_,i)=>{const x=frequencyMax*i/240;return [x,fn(spectralAt(p,x))]});
 const otf=[
  {name:'合成 MTF',color:green,points:points(h=>h.mtf)},
  {name:'Re H',color:blue,points:points(h=>h.h[0])},
  {name:'Im H',color:purple,points:points(h=>h.h[1])},
  {name:'错误顺序：先取模再加权',color:orange,dashed:true,points:points(h=>h.wrongAverage)},
 ];
 return {
  psf:plot({curves:psf,xMin,xMax,yMin:0,yMax:max,xLabel:'像面横坐标 · µm（范围固定）',yLabel:'PSF · µm⁻²',title:'固定80 µm像面范围内的两条PSF与强度和',width:480,topLabelY:16,bottomLabelPadding:8}),
  psfLegend:legend(psf),
  otf:plot({curves:otf,xMax:frequencyMax,yMin:-1,yMax:1,xLabel:'像面空间频率 · lp/mm（范围固定）',yLabel:'复 OTF / MTF',title:'固定物理频率坐标：先合成复OTF再取模',markers:[{value:p.frequency,label:'探针'}],width:480,topLabelY:16,bottomLabelPadding:8}),
  otfLegend:legend(otf),
 };
}
