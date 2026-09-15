import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HOST = '127.0.0.1';
const PORT = 5173;
const ROOT = path.resolve(fileURLToPath(new URL('../', import.meta.url)));

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
};

function openBrowser(url) {
  let command;
  let args;

  if (process.platform === 'win32') {
    command = 'cmd.exe';
    args = ['/c', 'start', '', url];
  } else if (process.platform === 'darwin') {
    command = 'open';
    args = [url];
  } else {
    command = 'xdg-open';
    args = [url];
  }

  try {
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    child.unref();
  } catch {
    // The URL is printed below if automatic opening is unavailable.
  }
}

const server = http.createServer((req, res) => {
  if (!req.url || !['GET', 'HEAD'].includes(req.method ?? '')) {
    res.writeHead(405);
    res.end('Method Not Allowed');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, `http://${HOST}`).pathname);
  } catch {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }

  if (pathname === '/') pathname = '/index.html';

  const candidate = path.resolve(ROOT, `.${pathname}`);
  if (candidate !== ROOT && !candidate.startsWith(`${ROOT}${path.sep}`)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(candidate, (statError, stat) => {
    if (statError || !stat.isFile()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': mime[path.extname(candidate).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-store'
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    fs.createReadStream(candidate).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}`;
  console.log(`uGame v0.0.1: ${url}`);
  console.log('Press Ctrl+C to stop.');
  openBrowser(url);
});
