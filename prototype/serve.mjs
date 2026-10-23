// SPDX-License-Identifier: MIT
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { SceneAuthority } from './scene.mjs';
const files = new Set(['desktop.html', 'desktop.mjs', 'draw.mjs', 'scene.mjs', 'snapshot.mjs', 'delay.mjs', 'input.mjs']);
export function createDesktopServer() {
  const authority = new SceneAuthority(randomUUID()), started = performance.now();
  let token = null, generation = null;
  return createServer(async (request, response) => {
    if (request.headers.host !== `127.0.0.1:${request.socket.localPort}`) { response.writeHead(403).end(); return; }
    response.setHeader('Cache-Control', 'no-store');
    if (request.url.startsWith('/api/')) {
      const origin = request.headers.origin;
      if (origin && origin !== `http://${request.headers.host}`) { response.writeHead(403).end(); return; }
      response.setHeader('Content-Type', 'application/json');
      if (request.url === '/api/connect' && request.method === 'POST') {
        if (request.headers['x-scene-client'] !== 'desktop') { response.writeHead(403).end(); return; }
        token = randomUUID(); generation = authority.connect();
        response.end(JSON.stringify({ token })); return;
      }
      if (!token || request.headers['x-scene-token'] !== token) { response.writeHead(401).end(); return; }
      if (request.url === '/api/snapshot' && request.method === 'GET') {
        response.end(authority.snapshot(generation, performance.now() - started)); return;
      }
      if (request.url === '/api/input' && request.method === 'POST') {
        let body = '';
        try {
          for await (const chunk of request) {
            body += chunk.toString();
            if (Buffer.byteLength(body) > 1024) { response.writeHead(413).end(); return; }
          }
          // A newer connection may supersede this request while its body arrives.
          if (request.headers['x-scene-token'] !== token) { response.writeHead(401).end(); return; }
          const result = authority.input(body, generation, performance.now() - started);
          response.end(JSON.stringify({ result }));
        } catch { response.writeHead(400).end(); }
        return;
      }
      response.writeHead(404).end(); return;
    }
    const file = request.url === '/' ? 'desktop.html' : request.url.slice(1);
    if (request.method !== 'GET' || !files.has(file)) { response.writeHead(404).end(); return; }
    try {
      const content = await readFile(new URL(file, import.meta.url));
      response.writeHead(200, { 'Content-Type': file.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      response.end(content);
    } catch { response.writeHead(500).end(); }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createDesktopServer();
  server.listen(0, '127.0.0.1', () => console.log(`Local experiment: http://127.0.0.1:${server.address().port} — Ctrl+C to stop`));
}
