import test from 'node:test';
import assert from 'node:assert/strict';
import { createTokenizer } from '../scripts/lib/tokenizer.mjs';

test('comment translation keeps code and source line numbers unchanged', async () => {
  const { collectCommentUnits, translateSources } =
    await import('../scripts/lib/comments.mjs');
  const original =
    '/// An allocator.\n/// Owned by the caller.\npub const name = "// literal"; // A value.\n';
  const files = new Map([['std/example.zig', Buffer.from(original)]]);
  const tokenizer = await createTokenizer();
  const { units, groups } = collectCommentUnits(files, tokenizer);
  assert.equal(units.length, 2);
  const translations = Object.fromEntries(
    units.map((unit) => [
      unit.id,
      unit.source.includes('allocator') ? '分配器，由调用者持有。' : '一个值。',
    ]),
  );
  const result = translateSources(files, groups, translations, tokenizer);
  const translated = result.get('std/example.zig').toString();
  assert.match(translated, /分配器，由调用者持有/);
  assert.equal(translated.split('\n').length, original.split('\n').length);
  assert.equal(tokenizer.assertEquivalent(original, translated), true);
});

test('translation refuses missing comment units', async () => {
  const { collectCommentUnits, translateSources } =
    await import('../scripts/lib/comments.mjs');
  const files = new Map([
    [
      'std/example.zig',
      Buffer.from('// Caller owns memory.\npub const x = 1;\n'),
    ],
  ]);
  const tokenizer = await createTokenizer();
  const { groups } = collectCommentUnits(files, tokenizer);
  assert.throws(
    () => translateSources(files, groups, {}, tokenizer),
    /Missing translation/,
  );
});

test('Zig fenced examples allow translated comments but reject changed literals', async () => {
  const { collectCommentUnits, translateSources } =
    await import('../scripts/lib/comments.mjs');
  const original =
    '/// Example:\n/// ```zig\n/// const value = 42; // Caller owns this value.\n/// ```\npub const x = 1;\n';
  const files = new Map([['std/example.zig', Buffer.from(original)]]);
  const tokenizer = await createTokenizer();
  const { units, groups } = collectCommentUnits(files, tokenizer);
  const translated =
    '示例：\n```zig\nconst value = 42; // 此值由调用者持有。\n```';
  assert.doesNotThrow(() =>
    translateSources(files, groups, { [units[0].id]: translated }, tokenizer),
  );
  assert.throws(
    () =>
      translateSources(
        files,
        groups,
        { [units[0].id]: translated.replace('42', '43') },
        tokenizer,
      ),
    /Modified protected/,
  );
});

test('inline code can follow Chinese word order but cannot be omitted or modified', async () => {
  const { collectCommentUnits, translateSources } =
    await import('../scripts/lib/comments.mjs');
  const files = new Map([
    [
      'std/example.zig',
      Buffer.from('/// Calls `function` with `args`.\npub const x = 1;\n'),
    ],
  ]);
  const tokenizer = await createTokenizer();
  const { units, groups } = collectCommentUnits(files, tokenizer);
  assert.doesNotThrow(() =>
    translateSources(
      files,
      groups,
      { [units[0].id]: '使用 `args` 调用 `function`。' },
      tokenizer,
    ),
  );
  assert.throws(
    () =>
      translateSources(
        files,
        groups,
        { [units[0].id]: '使用 `args` 调用函数。' },
        tokenizer,
      ),
    /Modified protected/,
  );
});

test('URL protection distinguishes prose punctuation from the actual target', async () => {
  const { validateCommentTranslation } =
    await import('../scripts/lib/comments.mjs');
  const tokenizer = await createTokenizer();
  const unit = {
    id: 'test',
    source:
      'See [RFC](https://example.org/spec). Also https://example.org/Type_(topic).',
  };
  assert.doesNotThrow(() =>
    validateCommentTranslation(
      unit,
      '参见 [RFC](https://example.org/spec)。另见 https://example.org/Type_(topic)。',
      tokenizer,
    ),
  );
  assert.throws(
    () =>
      validateCommentTranslation(
        unit,
        '参见 [RFC](https://example.org/other)。另见 https://example.org/Type_(topic)。',
        tokenizer,
      ),
    /Modified protected/,
  );
});
