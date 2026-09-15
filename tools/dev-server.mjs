import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HOST = '0.0.0.0';
const PORT = 5173;
const ROOT = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const LOCAL_URL = `http://127.0.0.1:${PORT}`;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg'
};

function isPrivateIPv4(address) {
  if (/^10\./.test(address)) return true;
  if (/^192\.168\./.test(address)) return true;
  const match = address.match(/^172\.(\d+)\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

function getLanUrls() {
  const urls = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family !== 'IPv4' || entry.internal || !isPrivateIPv4(entry.address)) continue;
      urls.push(`http://${entry.address}:${PORT}`);
    }
  }
  return [...new Set(urls)];
}

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
    // URLs are printed below if automatic opening is unavailable.
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
    pathname = decodeURIComponent(new URL(req.url, LOCAL_URL).pathname);
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
  console.log(`uGame local: ${LOCAL_URL}`);

  const lanUrls = getLanUrls();
  if (lanUrls.length) {
    console.log('uGame Wi-Fi / LAN:');
    for (const url of lanUrls) console.log(`  ${url}`);
    console.log('Open one of these addresses on another device connected to the same local network.');
  } else {
    console.log('No private IPv4 LAN address was detected.');
  }

  console.log('If Windows Firewall asks, allow Node.js on Private networks only.');
  console.log('Press Ctrl+C to stop.');
  openBrowser(LOCAL_URL);
});
