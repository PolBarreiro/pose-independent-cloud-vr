// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { SnapshotDelay } from './delay.mjs';
import { SceneAuthority } from './scene.mjs';
import { SnapshotReceiver } from './snapshot.mjs';

test('0/50/100 ms settings gate delivery at the requested boundary', () => {
  for (const delayMs of [0, 50, 100]) {
    const d = new SnapshotDelay({ delayMs });
    d.enqueue('snapshot', 0);
    if (delayMs) assert.deepEqual(d.drain(delayMs - 1), []);
    assert.deepEqual(d.drain(delayMs), [{ text: 'snapshot', deliveryDelayMs: delayMs }]);
  }
});

test('seeded loss and jitter reproduce delivery order, delay and counts', () => {
  const run = () => {
    const d = new SnapshotDelay({ delayMs: 50, jitterMs: 10, dropRate: 0.3, seed: 42, capacity: 100 });
    for (let n = 0; n < 100; n++) d.enqueue(String(n), n);
    return { delivered: d.drain(200), stats: d.stats() };
  };
  const a = run();
  assert.deepEqual(a, run());
  assert.ok(a.stats.dropped > 0 && a.stats.delivered > 0);
  assert.equal(a.stats.received, a.stats.dropped + a.stats.delivered);
});

test('queue bound and disconnect discard old pending data', () => {
  const d = new SnapshotDelay({ delayMs: 100, capacity: 2 });
  d.enqueue('old', 0); d.enqueue('next', 1); d.enqueue('new', 2);
  assert.equal(d.stats().queued, 2);
  assert.equal(d.stats().superseded, 1);
  d.clear();
  assert.deepEqual(d.drain(200), []);
  assert.equal(d.stats().superseded, 3);
});

test('delayed scenes apply through the receiver while local reads remain immediate', () => {
  const s = new SceneAuthority('delay'), sg = s.connect();
  const r = new SnapshotReceiver(), rg = r.connect(), d = new SnapshotDelay({ delayMs: 100 });
  d.enqueue(s.snapshot(sg, 0), 0);
  assert.equal(r.view(50).scene, null);
  for (const item of d.drain(100)) r.receive(item.text, rg, 100);
  assert.equal(r.view(100).scene.sequence, 0);
  assert.equal(r.view(600).stale, true);
});

test('invalid configuration/time and oversized data are rejected', () => {
  for (const options of [{ delayMs: -1 }, { jitterMs: NaN }, { dropRate: 2 }, { seed: -1 }, { capacity: 0 }]) assert.throws(() => new SnapshotDelay(options));
  const d = new SnapshotDelay();
  assert.throws(() => d.enqueue('é'.repeat(33000), 0));
  d.drain(10);
  assert.throws(() => d.drain(9));
});
