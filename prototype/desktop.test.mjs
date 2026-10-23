// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createDesktopServer } from './serve.mjs';
import { drawScene } from './draw.mjs';
import { SnapshotReceiver } from './snapshot.mjs';
import { InputTracker } from './input.mjs';
test('wireframe projects twelve finite cube edges and local yaw changes the view', () => {
  const lines = [];
  const ctx = { clearRect() {}, beginPath() {}, stroke() {}, moveTo(...p) { lines.push(p); }, lineTo(...p) { lines.push(p); } };
  const scene = { objects: [{ position: [0,1.2,-3], scale: [1,1,1] }] };
  drawScene(ctx, scene, 800, 450);
  assert.equal(lines.length, 24);
  assert.ok(lines.flat().every(Number.isFinite));
  const before = lines[0]; lines.length = 0;
  drawScene(ctx, scene, 800, 450, .2);
  assert.notDeepEqual(lines[0], before);
});
test('local server serves entry and all modules but refuses other files', async t => {
  const server = createDesktopServer();
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}`;
  for (const path of ['/', '/desktop.mjs', '/draw.mjs', '/scene.mjs', '/snapshot.mjs', '/delay.mjs', '/input.mjs']) {
    const response = await fetch(url + path);
    assert.equal(response.status, 200); assert.ok((await response.text()).length > 0);
  }
  assert.equal((await fetch(url + '/LICENSE-CODE')).status, 404);
});

test('HTTP scene acknowledges input and rejects superseded clients and foreign origins', async t => {
  const server = createDesktopServer();
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}`;
  const connect = () => fetch(url + '/api/connect', { method: 'POST', headers: { 'X-Scene-Client': 'desktop' } });
  assert.equal((await fetch(url + '/api/snapshot')).status, 401);
  assert.equal((await fetch(url + '/api/connect', { method: 'POST', headers: { Origin: 'https://foreign.example', 'X-Scene-Client': 'desktop' } })).status, 403);
  const { token } = await (await connect()).json();
  const headers = { 'X-Scene-Token': token };
  const receiver = new SnapshotReceiver(), tracker = new InputTracker(), generation = receiver.connect();
  const text = await (await fetch(url + '/api/snapshot', { headers })).text();
  receiver.receive(text, generation, 0);
  tracker.connect(receiver.view(0).scene.session, 0);
  const body = tracker.send(1);
  const send = value => fetch(url + '/api/input', { method: 'POST', headers, body: value });
  assert.equal((await (await send(body)).json()).result, 'applied');
  assert.equal((await (await send(body)).json()).result, 'duplicate');
  assert.equal((await send('{')).status, 400);
  assert.equal((await send('x'.repeat(1025))).status, 413);
  receiver.receive(await (await fetch(url + '/api/snapshot', { headers })).text(), generation, 5);
  assert.equal(tracker.acknowledge(receiver.view(5).scene, 5), 4);
  const next = await (await connect()).json();
  assert.notEqual(next.token, token);
  assert.equal((await fetch(url + '/api/snapshot', { headers })).status, 401);
  const fresh = await (await fetch(url + '/api/snapshot', { headers: { 'X-Scene-Token': next.token } })).json();
  assert.equal(fresh.lastAppliedInput, null);
});
