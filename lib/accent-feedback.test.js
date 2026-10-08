import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app = fs.readFileSync('src/App.tsx','utf8');
const css = fs.readFileSync('src/remodel.css','utf8');
test('app copy uses accent ink instead of black utility classes',()=>{
 assert.doesNotMatch(app,/text-black/);
 assert.match(css,/data-display-mode="light"\]\{--theme-text:var\(--theme-accent\)/);
 assert.match(css,/data-display-mode="night"\]\{--theme-text:var\(--theme-highlight\)/);
 assert.match(css,/new-timeline article small\{color:var\(--theme-text\)/);
 assert.match(css,/new-note,.clear-shell .new-story blockquote\{border-left-color:var\(--theme-accent\)/);
});
test('both breathing experiences have an accent tile and labelled reset button',()=>{
 assert.equal((app.match(/breathing-icon-tile/g)||[]).length,2);
 assert.equal((app.match(/breathing-reset/g)||[]).length,2);
 assert.equal((app.match(/breath-orb-copy/g)||[]).length,2);
 assert.match(css,/breathing-reset\{border-radius:14px/);
 assert.match(app,/RotateCcw className="w-4 h-4" \/> Reset/);
});
test('colour choice uses thin border rather than heavy selection outline',()=>{
 assert.doesNotMatch(css,/outline:3px solid var\(--theme-text\)/);
 assert.match(css,/accent-tile\[aria-pressed="true"\]\{border:1px solid var\(--theme-accent\);outline:none/);
 assert.match(css,/accent-tile:focus-visible\{outline:2px solid var\(--theme-accent\)/);
});
test('journal labels are tidy neutral accent labels, not mood-specific colours',()=>{
 assert.match(app,/journal-mood-label/);
 assert.doesNotMatch(app,/j.mood === 'great' \? 'bg-emerald/);
 assert.match(css,/journal-mood-label\{color:var\(--theme-text\)/);
});
test('sync button has a solid accent background, even while busy',()=>{
 assert.match(app,/cloud-sync-button app-accent-fill/);
 assert.match(css,/cloud-sync-button:disabled\{opacity:1/);
});
test('sign-in failures are surfaced independently of any cached session',()=>{
 assert.match(app,/initialAuthLinkIssue/);
 assert.match(app,/auth-link-notice.*role="alert"/);
 const helper=fs.readFileSync('src/authLink.ts','utf8');
 assert.match(helper,/otp_expired/);
 assert.match(helper,/existing session may still be active/);
 assert.doesNotMatch(helper,/return.*error_description/);
});
test('one canonical live origin and matching Windows smoke icon are configured',()=>{
 const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));
 assert.equal(config.redirects[0].has[0].value,'clear-plus.app');
 assert.equal(config.redirects[0].destination,'https://www.clear-plus.app/:path*');
 assert.match(fs.readFileSync('index.html','utf8'),/icons\/favicon-v5.ico/);
});
