import {multiply,translation,lens} from '../paraxial/model.js';
export function parameters(input={}) {
 const p={power1:10,power2:20,gap:100,stop:25,diameter:2,progress:100,...input};
 if(!Object.values(p).every(Number.isFinite)||p.gap<=0||p.stop<=0||p.stop>=p.gap||p.diameter<=0||Math.max(Math.abs(p.power1),Math.abs(p.power2))>100)throw RangeError('Invalid pupil construction');
 return p;
}
function conjugate(distance,power,origin,direction,radius) {
 const a=power/1000,denominator=1-distance*a;
 if(Math.abs(denominator)<1e-12)return {z:null,magnification:null,signedRadius:null,diameter:null,nature:'infinity',matrixB:null};
 const q=-distance/denominator, matrix=multiply(translation(q),multiply(lens(a),translation(distance)));
 return {z:origin+direction*q,magnification:matrix[0],signedRadius:matrix[0]*radius,diameter:Math.abs(matrix[0])*2*radius,nature:power===0?'direct':q>0?'real':'virtual',matrixB:matrix[1]};
}
// Independent, directed ray tracing in the common world z coordinate.
export function tracePupil(input={},side='entrance') {
 const p=parameters(input),left=side==='entrance',z=left?0:p.gap,power=(left?p.power1:p.power2)/1000,r=p.diameter/2;
 const rays=[-.006,0,.006].map(u=>{
  const y=r+(z-p.stop)*u;
  return {z,y,u:u+(left?1:-1)*power*y,stop:p.stop,r};
 });
 const denominator=rays[0].u-rays[2].u;
 const q=Math.abs(denominator)<1e-12?null:(rays[2].y-rays[0].y)/denominator;
 return {rays,z:q===null?null:z+q,y:q===null?null:rays[0].y+q*rays[0].u};
}
export function pupils(input={}) {
 const p=parameters(input),r=p.diameter/2;
 const entrance=conjugate(p.stop,p.power1,0,-1,r),exit=conjugate(p.gap-p.stop,p.power2,p.gap,1,r);
 const matrix=multiply(lens(p.power2/1000),multiply(translation(p.gap),lens(p.power1/1000)));
 const power=-matrix[2],f=power>1e-12?1/power:null;
 return {p,entrance,exit,entranceTrace:tracePupil(p,'entrance'),exitTrace:tracePupil(p,'exit'),focalLength:f,fNumber:f===null||entrance.diameter===null?null:f/entrance.diameter,determinant:matrix[0]*matrix[3]-matrix[1]*matrix[2]};
}
