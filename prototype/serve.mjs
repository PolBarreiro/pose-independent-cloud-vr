// SPDX-License-Identifier: MIT
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const files = new Set(['desktop.html', 'desktop.mjs', 'draw.mjs', 'scene.mjs', 'snapshot.mjs', 'delay.mjs', 'input.mjs']);
export function createDesktopServer() {
  return createServer(async (request, response) => {
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
