import { besselJ1, circularOtf, polarAmplitude } from '../wave/model.js';
const TAU=2*Math.PI;
export function parameters(input={}) {
 const p={fNumber:8,wavelengthA:500,wavelengthB:650,weightB:.5,shiftUm:5,frequency:100,...input};
 if(!Object.values(p).every(Number.isFinite)||p.fNumber<=0||Math.min(p.wavelengthA,p.wavelengthB)<=0||p.weightB<0||p.weightB>1||p.frequency<0||Math.abs(p.shiftUm)>50) throw RangeError('Invalid spectral scales or detected-signal weight');
 return p;
}
// J1 integral beyond the stable range of the independent power series.
export function j1(x) {
 if(Math.abs(x)<=20)return besselJ1(x);
 if(Math.abs(x)>200)throw RangeError('Display reference restricted to |x| <= 200');
 let sum=0;const n=512;
 for(let i=0;i<n;i++){const t=Math.PI*(i+.5)/n;sum+=Math.cos(t-x*Math.sin(t));}
 return sum/n;
}
export function linePsf(xUm,wavelengthNm,fNumber,shiftUm=0) {
 const scale=wavelengthNm*.001*fNumber;
 const q=Math.PI*Math.abs(xUm-shiftUm)/scale;
 const a=q<1e-10?1:2*j1(q)/q;
 return Math.PI/(4*scale**2)*a*a; // density in um^-2, normalized over the entire 2D plane
}
export function lineOtf(frequency,wavelengthNm,fNumber,shiftUm=0) {
 const rho=frequency*wavelengthNm*.001*fNumber/1000;
 if(rho>=1)return [0,0];
 const h=circularOtf(rho),phase=-TAU*frequency*shiftUm/1000;
 return [h*Math.cos(phase),h*Math.sin(phase)];
}
export function spectralAt(input={},frequency) {
 const p=parameters(input),nu=frequency??p.frequency;
 if(!Number.isFinite(nu)||nu<0)throw RangeError('Nonnegative frequency required');
 const a=lineOtf(nu,p.wavelengthA,p.fNumber),b=lineOtf(nu,p.wavelengthB,p.fNumber,p.shiftUm),w=p.weightB;
 const h=[(1-w)*a[0]+w*b[0],(1-w)*a[1]+w*b[1]];
 return {a,b,h,mtf:Math.hypot(...h),wrongAverage:(1-w)*Math.hypot(...a)+w*Math.hypot(...b)};
}
export function spectralPsf(input={},xUm,yUm=0) {
 const p=parameters(input),w=p.weightB;
 return (1-w)*linePsf(Math.hypot(xUm,yUm),p.wavelengthA,p.fNumber)+w*linePsf(Math.hypot(xUm-p.shiftUm,yUm),p.wavelengthB,p.fNumber);
}
// Independent direct integration over the overlap of two physical unit pupils.
// The integrand evaluates the two pupil phases, without Airy or disk-overlap formulas.
export function pupilIntegral(frequency,wavelengthNm,fNumber,shiftUm=0,samples=4096) {
 const rho=frequency*wavelengthNm*.001*fNumber/1000;
 if(rho>=1)return [0,0];
 const shift=2*rho,left=-1,right=1-shift,step=(right-left)/samples;
 const tilt=shiftUm/(4*wavelengthNm*.001*fNumber);
 let re=0,im=0;
 for(let i=0;i<samples;i++) {
  const x=left+(i+.5)*step;
  const height=2*Math.min(Math.sqrt(Math.max(0,1-x*x)),Math.sqrt(Math.max(0,1-(x+shift)**2)));
  const phase1=TAU*2*tilt*x,phase2=TAU*2*tilt*(x+shift);
  re+=height*(Math.cos(phase1)*Math.cos(phase2)+Math.sin(phase1)*Math.sin(phase2));
  im+=height*(Math.sin(phase1)*Math.cos(phase2)-Math.cos(phase1)*Math.sin(phase2));
 }
 return [re*step/Math.PI,im*step/Math.PI];
}
export function independentPsf(xUm,wavelengthNm,fNumber,shiftUm=0,radial=512) {
 const scale=wavelengthNm*.001*fNumber;
 const a=polarAmplitude({wavelengthNm,fNumber},(xUm-shiftUm)/scale,0,radial,256);
 return Math.PI/(4*scale**2)*(a[0]**2+a[1]**2);
}
