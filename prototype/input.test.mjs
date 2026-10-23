// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { InputTracker } from './input.mjs';
import { SceneAuthority } from './scene.mjs';
import { SnapshotReceiver } from './snapshot.mjs';

test('only one pending action; acknowledgment measures client elapsed time', () => {
  const i = new InputTracker();
  i.connect('a', 0);
  assert.equal(JSON.parse(i.send(10)).inputId, 0);
  assert.throws(() => i.send(11));
  assert.equal(i.acknowledge({ session: 'a', lastAppliedInput: 0 }, 30), 20);
  assert.equal(i.status(30).canSend, true);
  assert.equal(JSON.parse(i.send(31)).inputId, 1);
});

test('timeout is unknown, blocks resend, but late matching acknowledgment resolves it', () => {
  const i = new InputTracker(100);
  i.connect('a', 0); i.send(10);
  assert.equal(i.status(109).outcomeUnknown, false);
  assert.equal(i.status(110).outcomeUnknown, true);
  assert.throws(() => i.send(111));
  assert.equal(i.acknowledge({ session: 'old', lastAppliedInput: 0 }, 112), null);
  assert.equal(i.acknowledge({ session: 'a', lastAppliedInput: 1 }, 113), null);
  assert.equal(i.acknowledge({ session: 'a', lastAppliedInput: 0 }, 114), 104);
  assert.equal(i.status(114).canSend, true);
});

test('disconnect never replays an unknown action; reconnect begins new input numbering', () => {
  const i = new InputTracker();
  i.connect('a', 0); i.send(10); i.disconnect(20);
  assert.equal(i.status(20).outcomeUnknown, true);
  assert.throws(() => i.send(21));
  i.connect('b', 30);
  assert.deepEqual(i.status(30), { connected: true, pending: false, outcomeUnknown: false, canSend: true });
  assert.equal(JSON.parse(i.send(40)).inputId, 0);
});

test('scene authority and receiver complete an action acknowledgment round trip', () => {
  const s = new SceneAuthority('demo'), r = new SnapshotReceiver(), i = new InputTracker();
  const sg = s.connect(), rg = r.connect();
  r.receive(s.snapshot(sg, 0), rg, 5);
  i.connect(r.view(5).scene.session, 5);
  s.input(i.send(10), sg, 20);
  r.receive(s.snapshot(sg, 30), rg, 45);
  assert.equal(i.acknowledge(r.view(45).scene, 45), 35);
});

test('invalid time and timeout are rejected', () => {
  assert.throws(() => new InputTracker(0));
  const i = new InputTracker();
  assert.throws(() => i.connect('', 0));
  i.connect('a', 10);
  assert.throws(() => i.send(9));
  assert.throws(() => i.status(NaN));
});
