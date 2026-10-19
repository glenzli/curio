import {experiment} from '../common/ui.js';
import {parameters,spectralAt,pupilIntegral,independentPsf,linePsf} from './model.js';
import {spectrumFigures} from './figures.js';
const complex=z=>(Math.abs(z[0])<1e-12?0:z[0]).toFixed(4)+(z[1]<-1e-12?' − ':' + ')+(Math.abs(z[1])<1e-12?0:Math.abs(z[1])).toFixed(4)+'i';
export function mount({element,signal,session}) {
 return experiment({element,signal,session,kicker:'第十二章 · 双波长非相干成像',title:'两条谱线的点像与复 OTF',intro:'分别绘制两条谱线，再按探测信号权重合成。B谱线的像点位置可调；各曲线使用同一像面坐标和空间频率。',
 controls:[
  {key:'fNumber',label:'光圈 f 数',min:2,max:16,step:.5,value:8,format:v=>'f/'+v},
  {key:'wavelengthA',label:'A 谱线波长',min:400,max:700,step:10,value:500,format:v=>v+' nm'},
  {key:'wavelengthB',label:'B 谱线波长',min:400,max:700,step:10,value:650,format:v=>v+' nm'},
  {key:'weightB',label:'B 的探测信号权重',min:0,max:1,step:.05,value:.5,format:v=>(100*v).toFixed(0)+'%'},
  {key:'shiftUm',label:'B 像点的横向偏移',min:-10,max:10,step:.25,value:5,format:v=>v.toFixed(2)+' µm'},
  {key:'frequency',label:'OTF 探针频率',min:0,max:400,step:5,value:100,format:v=>v+' lp/mm'},
 ],
 presets:[
  {label:'只看 A',values:{weightB:0}}, {label:'只看 B',values:{weightB:1}},
  {label:'双波长 · 等权',values:{fNumber:8,wavelengthA:500,wavelengthB:650,weightB:.5,shiftUm:5,frequency:100}},
  {label:'同波长 · 相位抵消',values:{fNumber:8,wavelengthA:550,wavelengthB:550,weightB:.5,shiftUm:5,frequency:100}},
  {label:'无横向偏移',values:{shiftUm:0}},
 ],
 content:'<style>.spectral-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.spectral-grid>div{min-width:0}.spectral-grid svg{width:100%;height:auto;display:block}.spectral-grid text{fill:currentColor;font:11px ui-sans-serif,sans-serif}.truth{font-size:11px;line-height:1.9;border:1px solid #9caea255;padding:12px;border-radius:6px;overflow-wrap:anywhere}.spectral-grid h4{font-size:12px;margin:12px 0}@media(max-width:900px){.spectral-grid{grid-template-columns:1fr}}</style><div class="stats"></div><div class="spectral-grid"><div><h4>像面强度</h4><div data-psf></div><div class="legend" data-psf-legend></div></div><div><h4>复传递函数</h4><div data-otf></div><div class="legend" data-otf-legend></div></div></div><p class="reading" data-reading></p><div class="truth" data-truth aria-label="双波长独立真值对照"></div>',
 note:'各谱线采用标量近轴模型与均匀完整圆瞳；不同波长按非相干强度相加，物体光谱与空间结构可分离。权重表示各谱线经光源、透射与探测响应后的信号份额，不是显示 RGB 比例。B 的位移由指定的线性瞳相位表示，只示意横向色差；未建立真实材料处方或轴向色差。PSF 为完整二维像面的归一化密度，图中只画 y=0 截面；截面面积不等于总能量。Airy 曲线与解析圆盘 OTF 为主路径，独立极坐标瞳积分及瞳重叠数值积分作对照。无像差且无位移时 OTF 非负实数，直接平均 MTF 才与正确结果一致。',
 update(root,state) {
  const p=parameters(state),m=spectralAt(p),a=pupilIntegral(p.frequency,p.wavelengthA,p.fNumber),b=pupilIntegral(p.frequency,p.wavelengthB,p.fNumber,p.shiftUm);
  const h=a.map((v,i)=>(1-p.weightB)*v+p.weightB*b[i]);
  const figures=spectrumFigures(p);
  for(const [name,html] of [['psf',figures.psf],['otf',figures.otf],['psf-legend',figures.psfLegend],['otf-legend',figures.otfLegend]])root.querySelector('[data-'+name+']').innerHTML=html;
  root.querySelector('.stats').innerHTML='<div><small>合成 MTF</small><strong>'+m.mtf.toFixed(4)+'</strong><em>'+p.frequency+' lp/mm</em></div><div><small>先取模再平均</small><strong>'+m.wrongAverage.toFixed(4)+'</strong><em>橙色虚线 · 错误顺序</em></div><div><small>合成 OTF 相位</small><strong>'+(m.mtf<1e-9?'无定义':(Math.atan2(m.h[1],m.h[0])*180/Math.PI).toFixed(1)+'°')+'</strong><em>零模处不报告相位</em></div>';
  root.querySelector('[data-reading]').textContent='A 的截止频率 '+(1000/(p.wavelengthA*.001*p.fNumber)).toFixed(2)+' lp/mm；B 为 '+(1000/(p.wavelengthB*.001*p.fNumber)).toFixed(2)+' lp/mm。当前 H = '+complex(m.h)+'。复 OTF 相位描述空间图样的位移，不表示不同颜色的光场发生相干干涉。';
  const probe=2,analytic=linePsf(probe,p.wavelengthA,p.fNumber),direct=independentPsf(probe,p.wavelengthA,p.fNumber);
  root.querySelector('[data-truth]').textContent='独立真值对照：解析复 OTF '+complex(m.h)+'；直接瞳积分 '+complex(h)+'；差 '+Math.hypot(h[0]-m.h[0],h[1]-m.h[1]).toExponential(2)+'。A 谱线 x=2 µm 处：Airy '+analytic.toExponential(6)+' µm⁻²，独立连续瞳积分 '+direct.toExponential(6)+' µm⁻²。两条 PSF 各自全平面积分为 1；权重和为 1，H(0)=1。数值瞳积分有有限网格误差。';
  Object.assign(root.querySelector('.lab').dataset,{mtf:String(m.mtf),wrongAverage:String(m.wrongAverage),otfReal:String(m.h[0]),otfImag:String(m.h[1])});
 }
 });
}
