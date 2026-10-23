// SPDX-License-Identifier: MIT
import { SnapshotReceiver } from './snapshot.mjs';
import { SnapshotDelay } from './delay.mjs';
import { InputTracker } from './input.mjs';
import { drawScene } from './draw.mjs';
const canvas = document.querySelector('#scene'), ctx = canvas.getContext('2d');
const status = document.querySelector('#status'), button = document.querySelector('#toggle');
const receiver = new SnapshotReceiver(), rg = receiver.connect(), input = new InputTracker();
let queue = new SnapshotDelay(), yaw = 0, baseline = false, responseMs = null;
let token = null, stopped = false, networkError = '';
const started = performance.now();
document.querySelector('#delay').onchange = event => {
  queue.clear(); queue = new SnapshotDelay({ delayMs: Number(event.target.value) });
};
canvas.onpointermove = event => {
  const rect = canvas.getBoundingClientRect();
  yaw = ((event.clientX - rect.left) / rect.width - .5) * .8;
};
function fail(error, now = performance.now() - started) {
  stopped = true; networkError = String(error.message ?? error);
  queue.clear(); receiver.disconnect(rg); input.disconnect(now);
}
button.onclick = async () => {
  const now = performance.now() - started;
  if (stopped || !input.status(now).canSend) return;
  try {
    const response = await fetch('/api/input', { method: 'POST', headers: { 'X-Scene-Token': token }, body: input.send(now), signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new Error(`Input HTTP ${response.status}`);
  } catch (error) { fail(error); }
};
async function poll() {
  if (stopped) return;
  try {
    const response = await fetch('/api/snapshot', { headers: { 'X-Scene-Token': token }, signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new Error(`Snapshot HTTP ${response.status}`);
    const text = await response.text();
    if (!stopped) queue.enqueue(text, performance.now() - started);
  } catch (error) { fail(error); }
  if (!stopped) setTimeout(poll, 1000 / 30);
}
async function connect() {
  try {
    const response = await fetch('/api/connect', { method: 'POST', headers: { 'X-Scene-Client': 'desktop' }, signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new Error(`Connect HTTP ${response.status}`);
    token = (await response.json()).token;
    if (!stopped) poll();
  } catch (error) { fail(error); }
}
function render() {
  const now = performance.now() - started;
  for (const item of queue.drain(now)) {
    let result;
    try { result = receiver.receive(item.text, rg, now); }
    catch (error) { fail(error, now); break; }
    if (result === 'reconnect-required') { fail(new Error('Session changed; reload to reconnect'), now); break; }
    if (result !== 'applied') continue;
    const scene = receiver.view(now).scene;
    if (!baseline) { input.connect(scene.session, now); baseline = true; }
    const response = input.acknowledge(scene, now);
    if (response !== null) responseMs = response;
  }
  const view = receiver.view(now), state = input.status(now);
  drawScene(ctx, view.scene, canvas.width, canvas.height, yaw);
  button.disabled = !state.canSend;
  status.textContent = networkError ? `Disconnected: ${networkError}. Reload to reconnect; actions are not replayed.` : `Local HTTP scene • sequence ${view.scene?.sequence ?? 'waiting'} • ${view.stale ? 'stale / waiting' : 'current'} • action ${state.outcomeUnknown ? 'outcome unknown' : state.pending ? 'pending' : 'ready'} • last application response ${responseMs === null ? '—' : responseMs.toFixed(1) + ' ms'}`;
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
connect();
addEventListener('pagehide', () => { stopped = true; }, { once: true });
