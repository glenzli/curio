import test from 'node:test';
import assert from 'node:assert/strict';
import {pupils,tracePupil} from './model.js';
const near=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<=e,`${a} vs ${b}`);
test('entrance and exit conjugates agree with independent directed ray intersections and signed magnification',()=>{
 for(const gap of [80,100,150])for(const stop of [10,gap/2,gap-10])for(const power1 of [-20,0,10,20,25])for(const power2 of [-20,0,10,20,25]){
  const m=pupils({gap,stop,power1,power2});near(m.determinant,1);
  for(const [image,trace] of [[m.entrance,m.entranceTrace],[m.exit,m.exitTrace]]) {
   if(image.z===null){assert.equal(trace.z,null);continue;}
   near(image.z,trace.z);near(image.signedRadius,trace.y);near(image.matrixB,0);near(image.diameter,Math.abs(2*trace.y));
  }
 }
});
test('known real and virtual pupil cases retain inversion and physical stop size',()=>{
 const real=pupils({power1:25,power2:25,stop:50,diameter:2});
 near(real.entrance.z,-200);near(real.exit.z,300);near(real.entrance.magnification,-4);near(real.exit.magnification,-4);
 assert.equal(real.entrance.nature,'real');assert.equal(real.exit.nature,'real');near(real.entrance.diameter,8);
 const virtual=pupils({power1:10,power2:10,stop:50});near(virtual.entrance.z,100);near(virtual.exit.z,0);assert.equal(virtual.entrance.nature,'virtual');assert.equal(virtual.exit.nature,'virtual');
 const direct=pupils({power1:0,power2:0});near(direct.entrance.z,25);near(direct.exit.z,25);near(direct.entrance.diameter,2);assert.equal(direct.entrance.nature,'direct');
});
test('focal-plane stops have pupils at infinity and a parallel directed bundle',()=>{
 for(const side of ['entrance','exit']){
  const m=pupils(side==='entrance'?{power1:20,power2:10,stop:50}:{power1:10,power2:20,stop:50});
  assert.equal(m[side].z,null);assert.equal(m[side].diameter,null);const traced=side==='entrance'?m.entranceTrace:m.exitTrace;
  assert.equal(traced.z,null);near(traced.rays[0].u,traced.rays[2].u);
 }
 const both=pupils({power1:20,power2:20,stop:50});assert.equal(both.fNumber,null);
});
test('f number uses entrance pupil, and changing stop diameter changes no conjugate position',()=>{
 const a=pupils(),b=pupils({diameter:4});near(a.focalLength,100);near(a.entrance.z,100/3);near(a.entrance.diameter,8/3);near(a.fNumber,37.5);
 near(b.entrance.z,a.entrance.z);near(b.exit.z,a.exit.z);near(b.fNumber,a.fNumber/2);
});
test('near infinity stays finite on either side and invalid stop positions are rejected',()=>{
 for(const stop of [49.999,50.001]){const m=pupils({power1:20,stop});assert.ok(Number.isFinite(m.entrance.z));near(m.entrance.z,m.entranceTrace.z,.001);}
 for(const p of [{stop:0},{stop:100},{diameter:0},{power1:Infinity}])assert.throws(()=>pupils(p),RangeError);
});
