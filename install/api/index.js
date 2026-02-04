/**
 * Minimal API: /healthz and /readyz for hybrid architecture (Rule 5).
 * No DB or secrets in this process; readyz can be extended later (e.g. DB ping).
 * Runnable in Cloud Run and Docker Compose; PORT from env.
 */
const http = require('http');

const PORT = parseInt(process.env.PORT || '3000', 10);

function respond(res, statusCode, body) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const path = req.url?.split('?')[0] ?? '';
  if (req.method === 'GET' && path === '/healthz') {
    return respond(res, 200, { status: 'ok' });
  }
  if (req.method === 'GET' && path === '/readyz') {
    return respond(res, 200, { status: 'ready' });
  }
  respond(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`API listening on ${PORT}`);
});
