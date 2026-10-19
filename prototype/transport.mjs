// SPDX-License-Identifier: MIT
import { createServer } from 'node:net';
import { randomUUID } from 'node:crypto';
import { SceneAuthority } from './scene.mjs';

// A deliberately local TCP adapter. Browser clients will need a WebSocket adapter.
export function createSceneServer() {
  const authority = new SceneAuthority(randomUUID());
  const started = performance.now();
  let active = null;
  const server = createServer(socket => {
    if (active) { socket.destroy(); return; }
    active = socket;
    const generation = authority.connect();
    let pending = Buffer.alloc(0);
    let timer;
    const now = () => performance.now() - started;
    const publish = () => {
      if (socket.destroyed) return;
      // Disconnect slow consumers rather than accumulating stale scene data.
      if (socket.writableLength > 65536) { socket.destroy(); return; }
      socket.write(authority.snapshot(generation, now()) + '\n');
    };
    socket.setNoDelay(true);
    socket.on('error', () => {}); // close performs cleanup; malformed clients cannot crash the server.
    socket.on('close', () => {
      clearInterval(timer);
      authority.disconnect(generation);
      if (active === socket) active = null;
    });
    socket.on('data', chunk => {
      // One input at a time; bound both incomplete and batched input bytes.
      if (pending.length + chunk.length > 4096) { socket.destroy(); return; }
      pending = Buffer.concat([pending, chunk]);
      let end;
      while ((end = pending.indexOf(10)) !== -1) {
        const line = pending.subarray(0, end);
        pending = pending.subarray(end + 1);
        if (line.length > 1024) { socket.destroy(); return; }
        try { authority.input(new TextDecoder('utf-8', { fatal: true }).decode(line), generation, now()); }
        catch { socket.destroy(); return; }
      }
      if (pending.length > 1024) socket.destroy();
    });
    publish();
    timer = setInterval(publish, 1000 / 30);
  });
  return {
    async listen(port = 0) {
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', () => { server.off('error', reject); resolve(); });
      });
      return server.address();
    },
    async close() {
      active?.destroy();
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    },
  };
}
