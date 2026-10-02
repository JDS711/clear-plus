import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/remodel.css', import.meta.url), 'utf8');

test('desktop supports keyboard arrows and horizontal trackpad navigation', () => {
  assert.match(app, /event\.key === 'ArrowRight'/);
  assert.match(app, /event\.key !== 'ArrowLeft'/);
  assert.match(app, /handleWheelNavigation/);
  assert.match(app, /onWheel=\{handleWheelNavigation\}/);
});

test('beating a craving opens a completed log instead of mutating an old entry', () => {
  assert.match(app, /setCravingLogOutcome\('beaten'\);\s*setShowCravingForm\(true\)/);
  assert.match(app, /passed: wasBeaten/);
  assert.doesNotMatch(app, />I passed</);
  assert.doesNotMatch(app, /cravings\.filter\(c => !c\.passed\)\.length/);
});

test('the craving form presents trigger, then a prominent intensity slider, then note', () => {
  const trigger = app.indexOf('>Trigger<');
  const intensity = app.indexOf('id="craving-intensity"');
  const note = app.indexOf('>Note (optional)<');
  assert.ok(trigger > 0 && trigger < intensity && intensity < note);
  assert.match(css, /\.craving-intensity\{/);
  assert.match(css, /\.craving-intensity::-webkit-slider-thumb/);
});
