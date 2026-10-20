import test from 'node:test';
import assert from 'node:assert/strict';

test('tar parsing preserves nested source files and their exact bytes', async () => {
  const { readTar } = await import('../scripts/lib/std-runtime.mjs');
  const header = Buffer.alloc(512);
  header.write('std/Io/Writer.zig');
  const body = Buffer.from('pub const answer = 42;\n');
  header.write(`${body.length.toString(8).padStart(11, '0')}\0`, 124);
  const archive = Buffer.concat([
    header,
    body,
    Buffer.alloc(512 - body.length),
    Buffer.alloc(1024),
  ]);
  const files = readTar(archive);
  assert.equal(files.get('std/Io/Writer.zig').toString(), body.toString());
});

test('symbol URLs preserve case and quote special identifier characters', async () => {
  const { symbolHref } = await import('../scripts/lib/std-runtime.mjs');
  const map = new Map([['std.Io.Writer.writeAll', 'std/Io/Writer']]);
  assert.equal(
    symbolHref('std.Io.Writer.writeAll', map, 'en'),
    '/zig-docs/en/std/Io/Writer/#std.Io.Writer.writeAll',
  );
});

test('symbol URLs use the resolved declaration anchor for exported aliases', async () => {
  const { symbolHref } = await import('../scripts/lib/std-runtime.mjs');
  const map = new Map([
    [
      'std.math.log1p',
      { page: 'std/math/log1p', anchor: 'std.math.log1p.log1p' },
    ],
  ]);
  assert.equal(
    symbolHref('std.math.log1p', map, 'zh-cn'),
    '/zig-docs/zh-cn/std/math/log1p/#std.math.log1p.log1p',
  );
});
