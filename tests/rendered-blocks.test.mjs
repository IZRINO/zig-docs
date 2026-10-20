import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createTokenizer } from '../scripts/lib/tokenizer.mjs';
import {
  approvedRenderedTextBlocks,
  assertRenderedBlockEquivalent,
} from '../scripts/lib/rendered-blocks.mjs';

test('reviewed text diagrams require exact comment, block and source identity', async () => {
  const tokenizer = await createTokenizer();
  const source = 'Diagram:\n```\n↳ zero or more\n```';
  const translation = '图示：\n```\n↳ 零个或多个\n```';
  const sha = (text) => createHash('sha256').update(text).digest('hex');
  const units = [{ id: 'diagram', source, locations: [{ path: 'std/a.zig' }] }];
  const translations = { diagram: translation };
  const exceptions = {
    diagram: {
      reason: 'Translate only the diagram label.',
      renderedTextBlocks: true,
      sourceSha256: sha(source),
      translationSha256: sha(translation),
    },
  };
  const approved = approvedRenderedTextBlocks(units, translations, exceptions);
  const context = { sourcePath: 'std/a.zig', documentId: 'std/a', index: 2 };
  const check = (before, after, options = {}) =>
    assertRenderedBlockEquivalent(before, after, tokenizer, approved, {
      ...context,
      ...options,
    });
  assert.equal(check('↳ zero or more\n', '↳ 零个或多个\n'), true);
  assert.throws(() => check('↳ zero or more\n', '↳ 一个\n'), /std\/a\[2\]/);
  assert.throws(
    () =>
      check('↳ zero or more\n', '↳ 零个或多个\n', { sourcePath: 'std/b.zig' }),
    /Zig token/,
  );
  assert.throws(
    () => check('↳ zero or more\n', '↳ 零个或多个\n', { sourceListing: true }),
    /Zig token/,
  );
  assert.throws(() => check('const n = 1;', 'const n = 2;'), /Zig token/);
  assert.throws(
    () => check('const n = "unterminated', 'const n = "已更改'),
    /Zig token/,
  );
  assert.throws(
    () =>
      approvedRenderedTextBlocks(
        units,
        { diagram: `${translation}!` },
        exceptions,
      ),
    /Stale rendered text approval/,
  );
  delete exceptions.diagram.renderedTextBlocks;
  assert.equal(
    approvedRenderedTextBlocks(units, translations, exceptions).size,
    0,
  );
});
