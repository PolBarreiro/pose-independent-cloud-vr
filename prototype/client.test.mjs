// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';

test('malformed snapshot displays disconnect and keeps render loop alive', async t => {
  // Node-only DOM/clock harness: no browser or graphical control is involved.
  const frames = [], handlers = {}, calls = [];
  const button = {}, status = {}, delay = {};
  const ctx = { clearRect() {}, beginPath() {}, stroke() {}, moveTo() {}, lineTo() {} };
  const canvas = { width: 800, height: 450, getContext: () => ctx };
  const elements = { '#scene': canvas, '#toggle': button, '#status': status, '#delay': delay };
  const originals = new Map();
  for (const [key, value] of Object.entries({
    document: { querySelector: selector => elements[selector] },
    requestAnimationFrame: callback => frames.push(callback),
    addEventListener: (event, callback) => { handlers[event] = callback; },
  })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  t.after(() => {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  let clock = 100;
  t.mock.method(performance, 'now', () => ++clock);
  t.mock.method(globalThis, 'setTimeout', () => 0); // no polling timer escapes the harness
  t.mock.method(globalThis, 'fetch', async path => {
    calls.push(path);
    return path === '/api/connect'
      ? { ok: true, json: async () => ({ token: 'test' }) }
      : { ok: true, text: async () => '{' };
  });
  await import('./desktop.mjs?malformed-regression');
  await setImmediate(); // connect + one malformed snapshot queued
  assert.deepEqual(calls, ['/api/connect', '/api/snapshot']);
  assert.doesNotThrow(() => frames.shift()());
  assert.match(status.textContent, /Disconnected/);
  assert.equal(button.disabled, true);
  assert.equal(frames.length, 1);
  assert.doesNotThrow(() => frames.shift()());
  await button.onclick();
  assert.equal(calls.length, 2); // failure cannot send or replay an action
  handlers.pagehide();
});
