import { describe, expect, it } from 'vitest';

import { createMspStdioCaller } from './msp-stdio-transport.mjs';

const fakeServer = String.raw`
let buffer = Buffer.alloc(0);
let mode;
function send(message) {
  const json = JSON.stringify(message);
  process.stdout.write(mode === 'jsonl' ? json + '\n' : 'Content-Length: ' + Buffer.byteLength(json) + '\r\n\r\n' + json);
}
function handle(message) {
  if (!message.id) return;
  if (message.method === 'initialize') return send({jsonrpc:'2.0',id:message.id,result:{protocolVersion:'2024-11-05',capabilities:{},serverInfo:{name:'fake',version:'1'}}});
  send({jsonrpc:'2.0',id:message.id,result:{content:[{type:'text',text:JSON.stringify({protocol:mode})}]}});
}
process.stdin.on('data', chunk => {
  buffer = Buffer.concat([buffer, chunk]);
  mode ??= buffer.toString('utf8', 0, Math.min(buffer.length, 14)).startsWith('Content-Length') ? 'content-length' : 'jsonl';
  if (mode === 'jsonl') {
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.subarray(0, newline).toString('utf8').trim(); buffer = buffer.subarray(newline + 1);
      if (line) handle(JSON.parse(line));
    }
  } else {
    while (true) {
      const separator = buffer.indexOf('\r\n\r\n'); if (separator < 0) break;
      const size = Number(buffer.subarray(0, separator).toString('utf8').match(/Content-Length:\s*(\d+)/i)?.[1]);
      const start = separator + 4; if (buffer.length < start + size) break;
      const message = JSON.parse(buffer.subarray(start, start + size).toString('utf8')); buffer = buffer.subarray(start + size); handle(message);
    }
  }
});
`;

describe('MCP stdio transport', () => {
  it('uses the newline-delimited JSON framing required by the MCP SDK', async () => {
    const call = createMspStdioCaller({ command: process.execPath, args: ['-e', fakeServer] });
    try {
      await expect(call('example_tool', {})).resolves.toEqual({ protocol: 'jsonl' });
    } finally {
      call.close();
    }
  });
});
