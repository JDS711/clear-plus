import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('account settings do not show a redundant Restore Premium purchase button',()=>{
 const app=fs.readFileSync('src/App.tsx','utf8');
 assert.doesNotMatch(app,/Restore Premium purchase|onClick=\{restorePremium\}/);
 assert.match(app,/Email me a sign-in link/);
 assert.match(app,/verifyPurchase\(premiumSession\)/);
 assert.match(app,/Refresh this device from cloud/);
});
