import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { formatJournalTimestamp, journalDateTime } from './journal-time.js';
const app=fs.readFileSync('src/App.tsx','utf8');
const remodel=fs.readFileSync('src/Remodel.tsx','utf8');
test('journal submission saves and clears the input without navigating away',()=>{
 const submit=app.slice(app.indexOf('  const addJournal = () => {'),app.indexOf('  const handleCheckout'));
 assert.match(submit,/setJournals\(next\)/);assert.match(submit,/setJournalText\(''\)/);
 assert.doesNotMatch(submit,/setActiveTab|window.location|history\./);
 assert.match(app,/aria-label="Add journal entry"/);
});
test('journal timestamps show local weekday, date and time without year',()=>{
 const value='2026-09-10T05:04:00.000Z';
 const formatted=formatJournalTimestamp(value,'en-AU','Australia/Brisbane');
 assert.match(formatted,/Thursday/);assert.match(formatted,/10 September/);assert.match(formatted,/3:04\s?pm/i);
 assert.doesNotMatch(formatted,/2026/);assert.equal(journalDateTime(value),value);
 assert.match(formatJournalTimestamp(value,'en-AU','America/New_York'),/Thursday.*10 September.*1:04\s?am/i);
});
test('invalid legacy journal timestamps fail safely',()=>{
 assert.equal(formatJournalTimestamp('not-a-date'),'Time unavailable');assert.equal(journalDateTime('not-a-date'),undefined);
});
test('craving help is clearly an inline disclosure, not rightward navigation',()=>{
 assert.match(remodel,/aria-expanded=\{showHelp\}/);assert.match(remodel,/aria-controls="five-minute-pause"/);
 assert.match(remodel,/ChevronDown/);assert.match(remodel,/ChevronUp/);
 assert.doesNotMatch(remodel,/Help me through a craving →/);
 assert.match(remodel,/id="five-minute-pause" className="pause-panel"/);
});
test('LIVE progress dot is a steady accent highlight',()=>{
 const dot=app.match(/className="([^"]*app-accent-dot[^"]*)"/)[1];
 assert.ok(dot.includes('live-progress-dot'));assert.ok(!dot.includes('animate'));
});
