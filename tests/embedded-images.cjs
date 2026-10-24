// Preserve every embedded image and crop definition from the known-good migration source.
// Run with --ref=<commit> to verify the actual GitHub commit after fetching it.
const fs = require('node:fs');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const ref = process.argv.find(x => x.startsWith('--ref='))?.slice(6);
const html = ref ? cp.execFileSync('git', ['show', ref + ':index.html'], { encoding: 'utf8', maxBuffer: 50000000 }) : fs.readFileSync('index.html', 'utf8');
const expected = {
  VISUAL_ASSETS: [130, '1d95729bf88ad7b13c61bc9b5a30844544376591a22fcbaff7f5b9c637718028'],
  TILE_IMAGES: [30, '4bb1b66e95ce4916abf80ae07162ed244c06ae6587091e136a7838741162268c']
};
let images = 0;
for (const [name, [count, hash]] of Object.entries(expected)) {
  const prefix = 'const ' + name + '=';
  const line = html.split('\n').find(x => x.startsWith(prefix));
  assert(line, name + ' missing');
  const data = JSON.parse(line.slice(prefix.length).trim().replace(/;$/, ''));
  assert.equal(Object.keys(data).length, count, name + ': missing image/crop entries');
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex'), hash, name + ': image bytes or crop definitions changed');
  for (const [id, art] of Object.entries(data)) {
    const src = typeof art === 'string' ? art : art.src;
    if (art.sheet) assert(data[art.sheet]?.src, id + ': crop sheet missing');
    if (!src?.startsWith('data:image/')) continue;
    const match = src.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/);
    assert(match, id + ': malformed image URL');
    const bytes = Buffer.from(match[2], 'base64');
    assert(bytes.length > 32, id + ': empty image');
    // Some original portrait URLs say image/png while their bytes are JPEG.
    const png = bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
    const jpeg = bytes[0] === 255 && bytes[1] === 216;
    const webp = bytes.subarray(0, 4).toString() === 'RIFF';
    assert(png || jpeg || webp, id + ': unsupported image bytes');
    if (png) {
      assert.equal(bytes.subarray(-8, -4).toString(), 'IEND', id + ': truncated PNG');
    }
    images++;
  }
}
assert.equal(images, 153);
console.log('PASS: all 153 embedded images, 130 visual assets/crops and 30 tile images exactly match the known-good source' + (ref ? ' at ' + ref : ''));
