import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCameoSequence} from '../dist/cameo-sequence.js';

test('encore unlocks seven seconds after the completed return, rejects duplicate taps, and restarts only the cameo',()=>{
  const sequence=createCameoSequence();
  assert.equal(sequence.sample(6).crouch,1);
  assert.equal(sequence.sample(7.8).phase,'standing');
  assert.ok(sequence.sample(12).x<sequence.sample(10).x);
  assert.ok(sequence.sample(17).x>sequence.sample(15).x);
  assert.equal(sequence.sample(19).phase,'crouching');
  assert.equal(sequence.sample(20.2).crouch,1);
  assert.equal(sequence.sample(27.199).ready,false);
  assert.equal(sequence.shake(27.199),false);
  assert.equal(sequence.sample(27.2).ready,true);
  assert.equal(sequence.shake(27.2),true);
  assert.equal(sequence.shake(27.2),false);
  assert.equal(sequence.sample(27.3).ready,false);
  assert.notEqual(sequence.sample(27.3).shakeAngle,0);
  assert.equal(sequence.sample(28.1).phase,'standing');
  assert.equal(sequence.sample(31).phase,'moonwalk-left');
  assert.equal(sequence.sample(41.251).crouch,1);
  assert.equal(sequence.sample(48.249).ready,false);
  assert.equal(sequence.sample(48.251).ready,true);
  sequence.reset();
  assert.equal(sequence.sample(0).visible,false);
  assert.equal(sequence.sample(0).ready,false);
  assert.equal(sequence.sample(27.3).shakeAngle,0);
});

test('poses stay continuous through stand, both moonwalk directions, return, and crouch',()=>{
  const sequence=createCameoSequence();
  for(const boundary of [7,8.6,9.3,9.6,13.4,13.8,17.6,17.9,18.6,20.2]){
    const before=sequence.sample(boundary-.00001),after=sequence.sample(boundary+.00001);
    for(const key of ['x','z','angle','crouch'])assert.ok(Math.abs(before[key]-after[key])<.001,`${key} jumps at ${boundary}`);
  }
});
