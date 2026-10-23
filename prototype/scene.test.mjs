// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { SceneAuthority } from './scene.mjs';
import { SnapshotReceiver } from './snapshot.mjs';
const input = (inputId, changes = {}) => JSON.stringify({ version: 1, type: 'input', session: 'test', inputId, action: 'toggle-motion', ...changes });
const x = s => JSON.parse(s).objects[0].position[0];

test('scene snapshots at 30 Hz are accepted and move the cube without head pose', () => {
  const server = new SceneAuthority('test'), receiver = new SnapshotReceiver();
  const sg = server.connect(), cg = receiver.connect();
  for (let n = 0; n <= 30; n++) assert.equal(receiver.receive(server.snapshot(sg, n * 1000 / 30), cg, n * 1000 / 30), 'applied');
  assert.equal(receiver.view(1000).scene.sequence, 30);
  assert.ok(receiver.view(1000).scene.objects[0].position[0] > 0.8);
});

test('toggle freezes motion, acknowledges once, and a later input resumes it', () => {
  const s = new SceneAuthority('test'), g = s.connect();
  const before = x(s.snapshot(g, 500));
  assert.equal(s.input(input(7), g, 500), 'applied');
  assert.equal(s.input(input(7), g, 501), 'duplicate');
  assert.equal(s.input(input(6), g, 502), 'duplicate');
  const stopped = s.snapshot(g, 1500);
  assert.equal(x(stopped), before);
  assert.equal(JSON.parse(stopped).lastAppliedInput, 7);
  s.input(input(8), g, 1500);
  assert.notEqual(x(s.snapshot(g, 2000)), before);
});

test('reconnect clears acknowledgments and old callbacks cannot toggle the scene', () => {
  const s = new SceneAuthority('test'), old = s.connect();
  s.input(input(4), old, 0);
  s.disconnect(old);
  const fresh = s.connect();
  assert.equal(s.input(input(5), old, 10), 'inactive');
  s.disconnect(old);
  assert.equal(JSON.parse(s.snapshot(fresh, 10)).lastAppliedInput, null);
  assert.equal(s.input(input(0), fresh, 10), 'applied');
  assert.ok(x(s.snapshot(fresh, 1000)) > 0);
});

test('bad actions and time cannot change state or acknowledgment', () => {
  const s = new SceneAuthority('test'), g = s.connect();
  s.snapshot(g, 100);
  for (const text of ['{', input(0, { session: 'old' }), input(0, { action: 'delete' }), input(-1), input(0, { version: 2 }), ' '.repeat(1025)]) {
    assert.throws(() => s.input(text, g, 100));
  }
  assert.throws(() => s.input(input(0), g, 99));
  assert.throws(() => s.snapshot(g, NaN));
  const result = JSON.parse(s.snapshot(g, 200));
  assert.equal(result.lastAppliedInput, null);
  assert.ok(result.objects[0].position[0] > 0.19);
});

test('receiver sees applied input in a full scene snapshot after skipped updates', () => {
  const s = new SceneAuthority('test'), r = new SnapshotReceiver();
  const sg = s.connect(), cg = r.connect();
  r.receive(s.snapshot(sg, 0), cg, 0);
  s.input(input(1), sg, 100);
  s.snapshot(sg, 110); // deliberately undelivered
  r.receive(s.snapshot(sg, 150), cg, 200);
  assert.equal(r.view(200).scene.lastAppliedInput, 1);
  assert.equal(r.view(200).scene.sequence, 2);
});
