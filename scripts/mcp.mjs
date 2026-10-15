// Minimal YouCam MCP client for spikes. Usage:
//   node --env-file=.env.local scripts/mcp.mjs <fashion|beauty> list
//   node --env-file=.env.local scripts/mcp.mjs <fashion|beauty> call <tool> '<json args>'
const [server, cmd, tool, argJson] = process.argv.slice(2);
const url = `https://mcp-api-01.makeupar.com/mcp/${server}`;
const headers = {
  Authorization: `Bearer ${process.env.YOUCAM_API_KEY}`,
  'Content-Type': 'application/json',
  Accept: 'application/json, text/event-stream',
};
let sid;
async function rpc(method, params, id = 1) {
  const res = await fetch(url, {
    method: 'POST',
    headers: sid ? { ...headers, 'mcp-session-id': sid } : headers,
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });
  sid ??= res.headers.get('mcp-session-id') ?? undefined;
  const text = await res.text();
  const data = text.split('\n').find((l) => l.startsWith('data:'));
  return data ? JSON.parse(data.slice(5)) : { raw: text, status: res.status };
}
await rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'spike', version: '0.1' } });
await fetch(url, { method: 'POST', headers: { ...headers, 'mcp-session-id': sid }, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) });
const out = cmd === 'list' ? await rpc('tools/list', {}, 2) : await rpc('tools/call', { name: tool, arguments: JSON.parse(argJson ?? '{}') }, 2);
console.log(JSON.stringify(out, null, 2));
