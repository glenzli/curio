import test from 'node:test';
import assert from 'node:assert/strict';
import {parameters,j1,linePsf,lineOtf,spectralAt,spectralPsf,pupilIntegral,independentPsf} from './model.js';
import {spectrumFigures} from './figures.js';
const near=(a,b,e=1e-9)=>assert.ok(Math.abs(a-b)<=e,`${a} vs ${b}, tolerance ${e}`);
test('spectral weights use detected signal and reduce to each monochromatic endpoint',()=>{
 for(const w of [0,.1,.5,1])for(const frequency of [0,40,100,220,400]){
  const p=parameters({weightB:w,frequency}),m=spectralAt(p);
  near(m.h[0],(1-w)*m.a[0]+w*m.b[0]);near(m.h[1],(1-w)*m.a[1]+w*m.b[1]);
  assert.ok(m.mtf<=m.wrongAverage+1e-14);assert.ok(m.mtf<=1+1e-14);
  if(frequency===0){near(m.h[0],1);near(m.h[1],0);}
 }
 const p=parameters({frequency:220});assert.deepEqual(spectralAt(p).b,[0,0]);assert.ok(spectralAt(p).a[0]>0);
});
test('equal monochromatic OTF magnitudes can cancel through spatial phase, without optical field interference',()=>{
 const p={wavelengthA:550,wavelengthB:550,weightB:.5,shiftUm:5,frequency:100},m=spectralAt(p);
 near(m.mtf,0,1e-15);assert.ok(m.wrongAverage>.4);
 assert.ok(spectralPsf(p,2.5)>0);
 near(spectralPsf(p,0),.5*(linePsf(0,550,8)+linePsf(0,550,8,5)));
 const reverse=spectralAt({...p,shiftUm:-5});near(reverse.h[0],m.h[0]);near(reverse.h[1],-m.h[1]);
});
test('analytic complex OTF agrees with independent continuous pupil correlation, including phase sign',()=>{
 for(const lambda of [400,550,700])for(const shift of [-5,0,5])for(const nu of [0,50,100,200,400]) {
  const analytic=lineOtf(nu,lambda,8,shift),quadrature=pupilIntegral(nu,lambda,8,shift);
  near(analytic[0],quadrature[0],6e-6);near(analytic[1],quadrature[1],6e-6);
 }
});
test('Airy density has physical area units and agrees with independent two-dimensional pupil quadrature',()=>{
 for(const lambda of [400,550,700])for(const x of [0,1,3,7]) {
  const a=linePsf(x,lambda,8),b=independentPsf(x,lambda,8);
  near(a,b,2e-6/(lambda*.008)**2);
 }
 near(linePsf(0,500,8),Math.PI/64);
 near(linePsf(4,500,8)/4,linePsf(8,500,16),1e-12);
 near(j1(25),-.1253502495802899,1e-12);
});
test('PSF radial energy matches the independent encircled-energy identity with the finite tail retained',()=>{
 const qmax=20,n=4096,dr=qmax/n;let integral=0;
 for(let i=0;i<n;i++){const r=(i+.5)*dr;integral+=2*Math.PI*r*linePsf(r,1000,1)*dr;}
 let j0=0;const count=1024,x=Math.PI*qmax;
 for(let i=0;i<count;i++)j0+=Math.cos(x*Math.sin(Math.PI*(i+.5)/count))/count;
 const exact=1-j0*j0-j1(x)**2;near(integral,exact,1.1e-5);assert.ok(integral<1&&integral>.98);
});
test('spectral model rejects zero scales, nonfinite inputs and invalid weights',()=>{
 for(const p of [{weightB:-.1},{weightB:1.1},{wavelengthA:0},{fNumber:0},{shiftUm:NaN},{frequency:-1}])assert.throws(()=>parameters(p),RangeError);
 assert.throws(()=>j1(300),RangeError);
});
test('physical plot axes stay fixed across aperture, wavelength and image shift presets',()=>{
 for(const p of [{fNumber:2,wavelengthA:400,wavelengthB:700,shiftUm:-10},
  {fNumber:8,shiftUm:5},{fNumber:16,wavelengthA:700,wavelengthB:400,shiftUm:10}]) {
  const f=spectrumFigures(p);
  assert.ok(!/NaN|Infinity/.test(f.psf+f.otf));
  for(const tick of ['-40','-20','0','20','40']) assert.ok(f.psf.includes('>'+tick+'</text>'));
  for(const tick of ['0','100','200','300','400']) assert.ok(f.otf.includes('>'+tick+'</text>'));
 }
});
