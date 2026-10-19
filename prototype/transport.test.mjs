// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { createConnection } from 'node:net';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { createSceneServer } from './transport.mjs';
import { SnapshotReceiver } from './snapshot.mjs';
import { InputTracker } from './input.mjs';

async function setup(t) {
  const server = createSceneServer();
  const address = await server.listen();
  t.after(() => server.close());
  assert.equal(address.address, '127.0.0.1');
  return address.port;
}

test('real loopback stream applies snapshots and acknowledges a fragmented input', { timeout: 5000 }, async t => {
  const port = await setup(t);
  const socket = createConnection({ host: '127.0.0.1', port });
  t.after(() => socket.destroy());
  const lines = createInterface({ input: socket });
  const receiver = new SnapshotReceiver(), tracker = new InputTracker();
  const generation = receiver.connect();
  let sent = false, count = 0;
  await new Promise((resolve, reject) => {
    socket.on('error', reject);
    lines.on('line', line => {
      try {
        const now = performance.now();
        assert.equal(receiver.receive(line, generation, now), 'applied');
        const scene = receiver.view(now).scene;
        count++;
        if (!sent) {
          tracker.connect(scene.session, now);
          const action = tracker.send(now);
          socket.write(action.slice(0, 10));
          socket.write(action.slice(10) + '\n');
          sent = true;
        } else {
          const elapsed = tracker.acknowledge(scene, now);
          if (elapsed !== null) {
            assert.ok(elapsed >= 0);
            assert.equal(scene.lastAppliedInput, 0);
            resolve();
          }
        }
      } catch (error) { reject(error); }
    });
  });
  assert.ok(count >= 2);
  assert.equal(tracker.status(performance.now()).canSend, true);
});

test('malformed/oversized clients close cleanly and a new client recovers', { timeout: 5000 }, async t => {
  const port = await setup(t);
  for (const data of ['{\n', 'x'.repeat(1025)]) {
    const socket = createConnection({ host: '127.0.0.1', port });
    socket.on('error', () => {});
    socket.resume();
    await once(socket, 'connect');
    const closed = new Promise(resolve => socket.once('close', resolve));
    socket.write(data);
    await closed;
  }
  const socket = createConnection({ host: '127.0.0.1', port });
  t.after(() => socket.destroy());
  const [chunk] = await once(socket, 'data');
  const snapshot = JSON.parse(chunk.toString().split('\n')[0]);
  assert.equal(snapshot.type, 'snapshot');
  assert.equal(snapshot.lastAppliedInput, null);
});
