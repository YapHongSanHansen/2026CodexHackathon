// Smoke test for the standalone ToolForge MCP server.
// Spawns it via tsx, performs the JSON-RPC handshake over stdio, lists tools, calls one.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [, , projectId, apiKey] = process.argv;
if (!projectId || !apiKey) {
  console.error('usage: node mcp-smoke.mjs <projectId> <apiKey>');
  process.exit(1);
}

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'server');

// Launch tsx via `node --import tsx` so there is no .cmd / shell involved (reliable on Windows).
const child = spawn(
  process.execPath,
  ['--import', 'tsx', 'mcp-server/index.ts', '--project', projectId, '--server', 'http://localhost:8787', '--key', apiKey],
  { cwd: serverDir, stdio: ['pipe', 'pipe', 'pipe'] },
);
child.on('error', (e) => console.error('spawn error:', e));
child.on('exit', (code) => console.error('[mcp exited] code=' + code));

let buf = '';
const results = [];
child.stdout.on('data', (d) => {
  buf += d.toString();
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (line) {
      try { results.push(JSON.parse(line)); } catch { /* ignore non-json */ }
    }
  }
});
child.stderr.on('data', (d) => process.stderr.write('[mcp] ' + d.toString()));

const send = (obj) => child.stdin.write(JSON.stringify(obj) + '\n');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await sleep(1500); // let it fetch the manifest + connect
send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'smoke', version: '1' } } });
await sleep(400);
send({ jsonrpc: '2.0', method: 'notifications/initialized' });
await sleep(200);
send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
await sleep(600);
send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'get_customer', arguments: { code: '300-A001' } } });
await sleep(900);

const toolsMsg = results.find((m) => m.id === 2);
const callMsg = results.find((m) => m.id === 3);
console.log('TOOLS/LIST ->', toolsMsg?.result?.tools?.length, 'tools:',
  (toolsMsg?.result?.tools ?? []).map((t) => t.name).join(', '));
const text = callMsg?.result?.content?.[0]?.text ?? '(none)';
console.log('TOOLS/CALL get_customer ->', text.replace(/\s+/g, ' ').slice(0, 180));

child.kill();
process.exit(0);
