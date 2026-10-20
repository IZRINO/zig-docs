import test from 'node:test';
import assert from 'node:assert/strict';

async function loadTokenizer() {
  const { createTokenizer } = await import('../scripts/lib/tokenizer.mjs');
  return createTokenizer();
}

test('uses official tags and UTF-8 byte ranges without an EOF token', async () => {
  const tokenizer = await loadTokenizer();
  const source = 'const @"名称" = "// literal";';
  const tokens = tokenizer.tokens(source);
  assert.equal(tokens[0].tag, 'keyword_const');
  assert.equal(tokens.at(-1).tag, 'semicolon');
  for (const token of tokens) {
    assert.equal(
      Buffer.from(source).subarray(token.start, token.end).toString(),
      token.text,
    );
  }
  assert.deepEqual(
    tokenizer.comments('const url = "https://ziglang.org/";'),
    [],
  );
});

test('only extracts actual comments around strings and Zig multiline strings', async () => {
  const tokenizer = await loadTokenizer();
  const source = [
    '//! module description',
    '/// declaration description',
    'const url = "https://ziglang.org/"; // trailing description',
    'const text =',
    '    \\\\literal // is part of the string',
    '    \\\\another /// string line',
    ';',
    '//// ordinary four-slash comment',
    '// final comment',
  ].join('\n');
  const comments = tokenizer.comments(source);
  assert.deepEqual(
    comments.map(({ tag }) => tag),
    [
      'container_doc_comment',
      'doc_comment',
      'line_comment',
      'line_comment',
      'line_comment',
    ],
  );
  assert.deepEqual(
    comments.map(({ line }) => line),
    [1, 2, 3, 8, 9],
  );
  assert.equal(comments[2].text, '// trailing description');
  assert.equal(comments.at(-1).end, Buffer.byteLength(source));
  assert.equal(
    tokenizer
      .tokens(source)
      .filter(({ tag }) => tag === 'multiline_string_literal_line').length,
    2,
  );
});

test('permits Chinese comment translations and whitespace changes', async () => {
  const tokenizer = await loadTokenizer();
  const original = '//! Module\n/// An answer\nconst answer = 42; // Use it\n';
  const translated = '//! 模块\n/// 答案\nconst  answer=42; // 使用该值\n';
  assert.equal(tokenizer.assertEquivalent(original, translated), true);
  assert.deepEqual(
    tokenizer.comments(translated).map(({ line }) => line),
    [1, 2, 3],
  );
});

test('rejects changed numbers, strings, identifiers, and punctuation', async () => {
  const tokenizer = await loadTokenizer();
  const original = 'const value = "text"; const number = 42;';
  for (const changed of [
    'const value = "text"; const number = 43;',
    'const value = "文本"; const number = 42;',
    'const renamed = "text"; const number = 42;',
    'const value = "text"; const number + 42;',
  ]) {
    assert.throws(() => tokenizer.assertEquivalent(original, changed), {
      code: 'ZIG_TOKEN_MISMATCH',
    });
  }
});

test('supports incomplete and intentionally invalid documentation examples', async () => {
  const tokenizer = await loadTokenizer();
  const incomplete =
    'fn main( {\n  const value = "unfinished\n// this example cannot compile\n';
  const translated = incomplete.replace(
    'this example cannot compile',
    '此示例无法编译',
  );
  assert.ok(tokenizer.tokens(incomplete).some(({ tag }) => tag === 'invalid'));
  assert.equal(tokenizer.assertEquivalent(incomplete, translated), true);
  assert.throws(
    () =>
      tokenizer.assertEquivalent(
        incomplete,
        translated.replace('value', 'other'),
      ),
    {
      code: 'ZIG_TOKEN_MISMATCH',
    },
  );
});

test('preserves CRLF and maps Chinese comments to exact original lines and columns', async () => {
  const tokenizer = await loadTokenizer();
  const source =
    '\uFEFF//! 模块\r\nconst text = "中文"; // 说明\r\n/// 文档\r\n';
  const comments = tokenizer.comments(source);
  assert.deepEqual(
    comments.map(({ line, endLine }) => [line, endLine]),
    [
      [1, 1],
      [2, 2],
      [3, 3],
    ],
  );
  assert.equal(comments[1].column, 20);
  for (const comment of comments) {
    assert.equal(
      Buffer.from(source).subarray(comment.start, comment.end).toString(),
      comment.text,
    );
    assert.ok(!comment.text.endsWith('\r'));
  }
  assert.equal(
    tokenizer.assertEquivalent(source, source.replace('说明', '分配后释放')),
    true,
  );
});

test('handles empty source, escaped quotes, and repeated calls without stale memory', async () => {
  const tokenizer = await loadTokenizer();
  assert.deepEqual(tokenizer.tokens(''), []);
  assert.deepEqual(tokenizer.comments(''), []);
  const source = 'const quote = "\\\"//still a string"; // comment';
  assert.equal(tokenizer.comments(source).length, 1);
  assert.equal(tokenizer.comments('/// only docs')[0].tag, 'doc_comment');
  assert.equal(tokenizer.assertEquivalent('', '\n\t// comment only'), true);
  assert.throws(() => tokenizer.assertEquivalent('const a = 1;', ''), {
    code: 'ZIG_TOKEN_MISMATCH',
  });
});

test('rejects changed multiline-string contents even when they look like comments', async () => {
  const tokenizer = await loadTokenizer();
  const original = 'const value =\n    \\\\// literal text\n;';
  const translated = original.replace('literal text', '字面文本');
  assert.throws(() => tokenizer.assertEquivalent(original, translated), {
    code: 'ZIG_TOKEN_MISMATCH',
  });
});

test('grows WASM memory for complete modules without affecting later calls', async () => {
  const tokenizer = await loadTokenizer();
  const source = `// ${'long comment '.repeat(25000)}\nconst answer = 42;`;
  assert.equal(tokenizer.tokens(source).at(-1).tag, 'semicolon');
  assert.equal(tokenizer.comments(source)[0].end, source.indexOf('\n'));
  assert.equal(tokenizer.assertEquivalent(source, 'const answer = 42;'), true);
  assert.deepEqual(tokenizer.tokens(''), []);
});
