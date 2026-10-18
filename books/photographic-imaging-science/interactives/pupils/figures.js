import {thinGroup} from "../common/optics-drawing.js";
import {pupils} from './model.js';
export function pupilFigure(input={},side='entrance') {
 const m=pupils(input),p=m.p,left=side==='entrance',image=left?m.entrance:m.exit,trace=left?m.entranceTrace:m.exitTrace;
 const min=-240,max=340,x=z=>35+(z-min)/(max-min)*450;
 const radii=[m.entrance,m.exit].filter(v=>v.z!==null&&v.z>=min&&v.z<=max).map(v=>Math.abs(v.signedRadius));
 const bound=Math.max(3,...radii.map(v=>v*1.4)),y=v=>135-v/bound*65;
 const color=left?'#528aa6':'#b28143';
 const ready=p.progress>=(left?35:85),rays=p.progress>=(left?10:60);
 let s='<defs><clipPath id="pupil-'+side+'"><rect x="34" y="51" width="452" height="170"/></clipPath></defs><path d="M35 135H485" stroke="currentColor" opacity=".25"/>';
 for(const [z,label] of [[0,'前组'],[p.gap,'后组']])s+=thinGroup(x(z),135,60,z===0?p.power1:p.power2,'#6f98b0')+'<text x="'+x(z)+'" y="43" text-anchor="middle">'+label+'</text>';
 s+='<path d="M'+x(p.stop)+' 59V'+y(p.diameter/2)+'M'+x(p.stop)+' '+y(-p.diameter/2)+'V211" stroke="#60836a" stroke-width="4"/><circle cx="'+x(p.stop)+'" cy="'+y(p.diameter/2)+'" r="3" fill="#60836a"/><text x="'+x(p.stop)+'" y="233" text-anchor="middle">光阑</text>';
 if(rays) {
  s+='<g clip-path="url(#pupil-'+side+')">';
  for(const r of trace.rays) {
   const end=left?min:max;
   s+='<path d="M'+x(p.stop)+' '+y(p.diameter/2)+'L'+x(r.z)+' '+y(r.y)+'L'+x(end)+' '+y(r.y+(end-r.z)*r.u)+'" fill="none" stroke="'+color+'" stroke-width="1.4"/>';
   if(ready&&image.nature==='virtual'&&image.z!==null) {
    const z=Math.max(min,Math.min(max,image.z));
    s+='<path d="M'+x(r.z)+' '+y(r.y)+'L'+x(z)+' '+y(r.y+(z-r.z)*r.u)+'" fill="none" stroke="'+color+'" stroke-dasharray="4 4" opacity=".65"/>';
   }
  }
  s+='</g>';
 }
 if(ready&&image.z!==null&&image.z>=min&&image.z<=max)s+='<path d="M'+x(image.z)+' '+y(image.signedRadius)+'V'+y(-image.signedRadius)+'" stroke="'+color+'" stroke-width="3"/><circle cx="'+x(image.z)+'" cy="'+y(image.signedRadius)+'" r="3.5" fill="'+color+'"/><text x="'+x(image.z)+'" y="260" text-anchor="middle">'+(left?'入瞳':'出瞳')+'</text>';
 else if(ready)s+='<text x="260" y="260" text-anchor="middle">'+(image.z===null?'像位于无穷远，光线平行':'瞳像位于视窗外，见数值读数')+'</text>';
 for(const z of [-200,-100,0,100,200,300])s+='<text x="'+x(z)+'" y="289" text-anchor="middle">'+z+'</text>';
 s+='<text x="260" y="312" text-anchor="middle">轴向 z / mm · 横纵比例不同</text>';
 return '<svg viewBox="0 0 520 325" role="img" aria-label="'+(left?'光阑经前组成入瞳':'光阑经后组成出瞳')+'，虚线为反向延长">'+s+'</svg>';
}
