import test from 'node:test';
import assert from 'node:assert/strict';
import { cloudStateKey, cloudStatesEqual } from './cloud-state-key.js';
test('object key ordering is irrelevant at every nested level',()=>{
 assert.equal(cloudStatesEqual({ quitDate: null, journals: [{ id:'one',date:'today',text:'entry' }], settings:{ theme:'blue',font:'comic' } },{ settings:{ font:'comic',theme:'blue' },journals:[{ text:'entry',date:'today',id:'one' }],quitDate:null }),true);
});
test('actual value changes and record order changes are not hidden',()=>{
 assert.equal(cloudStatesEqual({quitDate:'a'},{quitDate:'b'}),false);
 assert.equal(cloudStatesEqual({journals:[1,2]},{journals:[2,1]}),false);
 assert.equal(cloudStatesEqual({count:1},{count:'1'}),false);
});
test('standard JSON date and omitted optional values remain equivalent',()=>{
 assert.equal(cloudStateKey({date:new Date('2026-10-08T00:00:00Z'),note:undefined}),cloudStateKey({date:'2026-10-08T00:00:00.000Z'}));
});
