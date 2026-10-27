// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { SceneMetrics } from './metrics.mjs';
test('separate timing distributions and UTF-8 payload rate', () => {
  const m = new SceneMetrics();
  m.frame(0); m.frame(10); m.frame(30);
  m.applied(50); m.response(100); m.received('é');
  const r = m.report(2000);
  assert.deepEqual(r.frameIntervalMs, { samples: 2, p50: 10, p95: 20, p99: 20 });
  assert.equal(r.receiveToApplyMs.p50, 50);
  assert.equal(r.actionResponseMs.p50, 100);
  assert.equal(r.payloadBytesPerSecond, 1);
  assert.equal(r.hardwareMotionToPhotonMs, null);
  assert.equal(r.worldStateAgeMs, null);
});
test('bounded recent samples, empty reports and invalid timing', () => {
  const m = new SceneMetrics(2);
  assert.equal(m.report(0).frameIntervalMs.p50, null);
  assert.equal(m.report(0).payloadBytesPerSecond, null);
  m.applied(1); m.applied(2); m.applied(3);
  assert.deepEqual(m.report(10).receiveToApplyMs, { samples: 2, p50: 2, p95: 3, p99: 3 });
  assert.throws(() => m.response(-1));
  m.frame(10); assert.throws(() => m.frame(9));
  assert.throws(() => new SceneMetrics(0));
});
