import test from 'node:test';
import assert from 'node:assert/strict';
import {restoredControlValue} from './ui.js';
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
