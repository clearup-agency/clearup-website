import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// One «احجز مكالمة» on phones (Mohamed, Nov 8, 2026): the fixed bar at the bottom carries it, so the header's button
// is hidden at phone width; desktop/tablet keep the header button (no bar there). The menu sheet keeps its own.
const root = fileURLToPath(new URL('..', import.meta.url));
const css = readFileSync(root + 'src/app/globals.css', 'utf8');
const nav = readFileSync(root + 'src/components/Nav.tsx', 'utf8');

const phoneBlocks = () => [...css.matchAll(/@media \(max-width: 760px\) \{([\s\S]*?)\n\}/g)].map((m) => m[1]);

test('phones: the header «احجز مكالمة» is hidden and never shown again by a later phone rule', () => {
  const rules = phoneBlocks().flatMap((b) => [...b.matchAll(/\.nav \.btn--sm\s*\{([^}]*)\}/g)].map((m) => m[1]));
  assert.ok(rules.length > 0, 'a phone rule for the header button exists');
  assert.match(rules[rules.length - 1], /display:\s*none/, 'the last phone rule hides it');
  for (const r of rules) assert.doesNotMatch(r, /display:\s*(inline-)?flex/);
});

test('phones: the bottom bar still carries the booking button', () => {
  const bar = phoneBlocks().find((b) => b.includes('.mbar {'));
  assert.ok(bar, 'the bar is shown on phones');
  assert.match(bar, /\.mbar \{ display: flex/);
  assert.match(readFileSync(root + 'src/components/MobileBar.tsx', 'utf8'), /mbar__book/);
});

test('desktop header still renders the button; the menu sheet keeps its own', () => {
  assert.match(nav, /className="btn btn--sm"/);
  assert.match(nav, /nav__sheet-cta/);
});
