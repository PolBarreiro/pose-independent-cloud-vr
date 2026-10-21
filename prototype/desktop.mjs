// SPDX-License-Identifier: MIT
import { SceneAuthority } from './scene.mjs';
import { SnapshotReceiver } from './snapshot.mjs';
import { SnapshotDelay } from './delay.mjs';
import { InputTracker } from './input.mjs';
import { drawScene } from './draw.mjs';
const canvas = document.querySelector('#scene'), ctx = canvas.getContext('2d');
const status = document.querySelector('#status'), button = document.querySelector('#toggle');
const server = new SceneAuthority('browser-simulation'), sg = server.connect();
const receiver = new SnapshotReceiver(), rg = receiver.connect(), input = new InputTracker();
let queue = new SnapshotDelay(), yaw = 0, baseline = false, responseMs = null;
const started = performance.now();
document.querySelector('#delay').onchange = event => {
  queue.clear(); queue = new SnapshotDelay({ delayMs: Number(event.target.value) });
};
canvas.onpointermove = event => {
  const rect = canvas.getBoundingClientRect();
  yaw = ((event.clientX - rect.left) / rect.width - .5) * .8;
};
button.onclick = () => {
  const now = performance.now() - started;
  if (input.status(now).canSend) server.input(input.send(now), sg, now);
};
const timer = setInterval(() => {
  const now = performance.now() - started;
  queue.enqueue(server.snapshot(sg, now), now);
}, 1000 / 30);
function render() {
  const now = performance.now() - started;
  for (const item of queue.drain(now)) {
    if (receiver.receive(item.text, rg, now) !== 'applied') continue;
    const scene = receiver.view(now).scene;
    if (!baseline) { input.connect(scene.session, now); baseline = true; }
    const response = input.acknowledge(scene, now);
    if (response !== null) responseMs = response;
  }
  const view = receiver.view(now), state = input.status(now);
  drawScene(ctx, view.scene, canvas.width, canvas.height, yaw);
  button.disabled = !state.canSend;
  status.textContent = `Local simulation • sequence ${view.scene?.sequence ?? 'waiting'} • ${view.stale ? 'stale / waiting' : 'current'} • action ${state.outcomeUnknown ? 'outcome unknown' : state.pending ? 'pending' : 'ready'} • last simulated response ${responseMs === null ? '—' : responseMs.toFixed(1) + ' ms'}`;
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
addEventListener('pagehide', () => clearInterval(timer), { once: true });
