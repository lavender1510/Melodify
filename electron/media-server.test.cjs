const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {serveFile} = require('./media-server.cjs');

test('local audio serves complete and partial byte ranges', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'melodify-range-'));
  const file = path.join(dir, 'sample.mp3');
  const bytes = Buffer.from('ID3' + 'x'.repeat(2045));
  try {
    await fs.writeFile(file, bytes);
    const request = (method, range) => ({
      method,
      headers: new Headers(range ? {Range: range} : {})
    });
    const all = await serveFile(file, request('GET'));
    assert.equal(all.status, 200);
    assert.equal(all.headers.get('content-type'), 'audio/mpeg');
    assert.equal(all.headers.get('accept-ranges'), 'bytes');
    assert.deepEqual(Buffer.from(await all.arrayBuffer()), bytes);

    const partial = await serveFile(file, request('GET', 'bytes=100-199'));
    assert.equal(partial.status, 206);
    assert.equal(partial.headers.get('content-range'), 'bytes 100-199/2048');
    assert.equal(partial.headers.get('content-length'), '100');
    assert.deepEqual(Buffer.from(await partial.arrayBuffer()), bytes.subarray(100, 200));

    const suffix = await serveFile(file, request('GET', 'bytes=-16'));
    assert.equal(suffix.status, 206);
    assert.deepEqual(Buffer.from(await suffix.arrayBuffer()), bytes.subarray(-16));

    const head = await serveFile(file, request('HEAD'));
    assert.equal(head.status, 200);
    assert.equal(head.headers.get('content-length'), '2048');
    assert.equal((await head.arrayBuffer()).byteLength, 0);

    const invalid = await serveFile(file, request('GET', 'bytes=9999-'));
    assert.equal(invalid.status, 416);
    assert.equal(invalid.headers.get('content-range'), 'bytes */2048');
  } finally {
    await fs.rm(dir, {recursive:true,force:true});
  }
});
