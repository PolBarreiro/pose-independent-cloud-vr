// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createDesktopServer } from './serve.mjs';
import { drawScene } from './draw.mjs';
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
