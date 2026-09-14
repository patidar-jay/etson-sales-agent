/**
 * Whatomate Proxy Server — port 3002
 * Proxies all requests to Whatomate (localhost:8080)
 * Strips X-Frame-Options and CSP headers so it can be
 * embedded as an iframe inside the Etson dashboard.
 *
 * Run: node whatomate-proxy.js
 */
import http from 'http';
import httpProxy from 'http-proxy';

const WHATOMATE_TARGET = 'http://localhost:8080';
const PROXY_PORT       = 3002;

const proxy = httpProxy.createProxyServer({
  target:       WHATOMATE_TARGET,
  changeOrigin: true,
  selfHandleResponse: false,
});

// Strip blocking headers from every Whatomate response
proxy.on('proxyRes', (proxyRes) => {
  delete proxyRes.headers['x-frame-options'];
  delete proxyRes.headers['X-Frame-Options'];
  delete proxyRes.headers['content-security-policy'];
  delete proxyRes.headers['Content-Security-Policy'];
  delete proxyRes.headers['x-content-type-options'];
  // Allow iframe embedding from any origin
  proxyRes.headers['access-control-allow-origin'] = '*';
});

proxy.on('error', (err, req, res) => {
  console.error('[Proxy Error]', err.message);
  if (!res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Whatomate unavailable — make sure Docker containers are running.\nRun: docker compose up -d whatomate');
  }
});

const server = http.createServer((req, res) => {
  proxy.web(req, res);
});

// Handle websocket upgrades (Whatomate uses WS for real-time)
server.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head);
});

server.listen(PROXY_PORT, () => {
  console.log(`✅ Whatomate proxy running on http://localhost:${PROXY_PORT}`);
  console.log(`   Proxying → ${WHATOMATE_TARGET}`);
  console.log(`   X-Frame-Options: stripped ✅`);
});
