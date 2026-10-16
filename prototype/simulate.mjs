// SPDX-License-Identifier: MIT
import { SceneAuthority } from './scene.mjs';
import { SnapshotReceiver } from './snapshot.mjs';
const server = new SceneAuthority('local-simulation');
const receiver = new SnapshotReceiver();
const sg = server.connect(), cg = receiver.connect();
let dropped = 0, delivered = 0;
for (let frame = 0; frame <= 60; frame++) {
  const now = frame * 1000 / 30;
  if (frame === 30) server.input(JSON.stringify({ version: 1, type: 'input', session: 'local-simulation', inputId: 0, action: 'toggle-motion' }), sg, now);
  const packet = server.snapshot(sg, now);
  if (frame % 10 === 5) { dropped++; continue; }
  receiver.receive(packet, cg, now);
  delivered++;
}
console.log(JSON.stringify({ mode: 'in-memory simulation, no real-time or network measurements', delivered, dropped, finalScene: receiver.view(2000).scene }, null, 2));
