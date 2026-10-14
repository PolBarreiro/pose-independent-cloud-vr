// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSnapshot, SnapshotReceiver } from './snapshot.mjs';

const object = { id: 'cube', position: [0, 1, -3], rotation: [0, 0, 0, 1], scale: [1, 1, 1] };
const packet = (sequence, changes = {}) => JSON.stringify({ version: 1, type: 'snapshot', session: 'a', sequence, serverTimeMs: 0, lastAppliedInput: null, objects: [object], ...changes });

test('out-of-order snapshots never roll back the scene', () => {
  const r = new SnapshotReceiver(), g = r.connect();
  assert.equal(r.receive(packet(10), g, 0), 'applied');
  assert.equal(r.receive(packet(12), g, 20), 'applied');
  assert.equal(r.receive(packet(11), g, 30), 'superseded');
  assert.equal(r.view(30).scene.sequence, 12);
});

test('full snapshot recovers after skipped updates and removes missing objects', () => {
  const r = new SnapshotReceiver(), g = r.connect();
  r.receive(packet(0), g, 0);
  r.receive(packet(9, { objects: [] }), g, 100);
  assert.deepEqual(r.view(100).scene.objects, []);
});

test('reconnect accepts a new baseline but rejects old queued callbacks', () => {
  const r = new SnapshotReceiver(), old = r.connect();
  r.receive(packet(100), old, 0);
  r.disconnect(old);
  assert.equal(r.view(1).connected, false);
  assert.equal(r.view(1).scene.sequence, 100);
  const fresh = r.connect();
  assert.equal(r.view(2).awaitingSnapshot, true);
  assert.equal(r.receive(packet(101), old, 3), 'inactive');
  r.disconnect(old);
  assert.equal(r.receive(packet(0, { session: 'b' }), fresh, 4), 'applied');
});

test('unexpected session change requires reconnect without replacing the scene', () => {
  const r = new SnapshotReceiver(), g = r.connect();
  r.receive(packet(1), g, 0);
  assert.equal(r.receive(packet(2, { session: 'b' }), g, 1), 'reconnect-required');
  assert.equal(r.view(1).scene.session, 'a');
  assert.equal(r.view(1).connected, false);
});

test('stale boundary and returned scene isolation', () => {
  const r = new SnapshotReceiver(), g = r.connect();
  r.receive(packet(0), g, 10);
  assert.equal(r.view(509).stale, false);
  assert.equal(r.view(510).stale, true);
  r.view(510).scene.objects.length = 0;
  assert.equal(r.view(510).scene.objects.length, 1);
});

test('invalid packets are rejected without destroying the last scene', () => {
  const r = new SnapshotReceiver(), g = r.connect();
  r.receive(packet(1), g, 0);
  for (const bad of [null, '{', ' '.repeat(65537), packet(2, { version: 2 }),
    packet(-1), packet(2, { objects: [object, object] }),
    packet(2, { objects: [{ ...object, scale: [0, 1, 1] }] }),
    packet(2, { objects: [{ ...object, rotation: [0, 0, 0, 0] }] }),
    packet(2, { objects: [{ ...object, position: [null, 1, 1] }] }),
    packet(2, { objects: Array.from({ length: 101 }, (_, i) => ({ ...object, id: String(i) })) }),
    packet(2, { padding: 'é'.repeat(33000) })]) {
    assert.throws(() => r.receive(bad, g, 10));
    assert.equal(r.view(10).scene.sequence, 1);
  }
});

test('monotonic application time and safe sequence numbers are required', () => {
  assert.throws(() => parseSnapshot(packet(Number.MAX_SAFE_INTEGER + 1)));
  const r = new SnapshotReceiver(), g = r.connect();
  r.receive(packet(0), g, 10);
  assert.throws(() => r.receive(packet(1), g, 9));
  assert.throws(() => r.view(NaN));
});
