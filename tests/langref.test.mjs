import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdtemp,
  mkdir,
  writeFile,
  readdir,
  access,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  splitLangref,
  translateFragment,
  codeTokens,
  rewriteReferenceLinks,
  extractLangref,
} from '../scripts/lib/langref.mjs';

const fixture =
  '<main><h2 id="One"><a href="#toc-One">First</a> <a class="hdr" href="#One">§</a></h2><p>Read <a href="#nested">nested</a>.</p><h3 id="nested">Nested</h3><pre><code><span class="tok-comment">// first comment</span>\nconst value = "// not a comment";</code></pre><h2 id="Two">Second</h2><table><tbody><tr><td>cell</td></tr></tbody></table></main>';

test('split preserves nested anchors, code, and table cells exactly once', () => {
  const pages = splitLangref(fixture);
  assert.equal(pages.length, 2);
  assert.equal(pages[0].id, 'reference/One');
  assert.deepEqual(
    pages[0].headings.map((h) => h.slug),
    ['One', 'nested'],
  );
  assert.match(pages[0].html, /id="nested"/);
  assert.match(pages[0].html, /const value/);
  assert.match(pages[1].html, /<td>cell<\/td>/);
  assert.doesNotMatch(pages[1].html, /id="nested"/);
});

test('read-only reference validation rejects missing translations without writing generated files', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'zig-langref-validation-'));
  try {
    const source = '<main><h2 id="One">Introduction</h2><p>Text.</p></main>';
    const sha = (value) => createHash('sha256').update(value).digest('hex');
    await mkdir(path.join(root, 'upstream/0.17.0'), { recursive: true });
    await mkdir(path.join(root, 'translations'));
    await writeFile(path.join(root, 'upstream/0.17.0/langref.html'), source);
    await writeFile(
      path.join(root, 'translations/langref.source-hashes.json'),
      JSON.stringify({
        snapshotSha256: sha(source),
        units: {
          'reference/One::text:0': sha('Introduction'),
          'reference/One::text:1': sha('Text.'),
        },
      }),
    );
    const file = path.join(root, 'translations/langref.zh-cn.01.json');
    await writeFile(file, JSON.stringify({ 'reference/One::text:0': '简介' }));
    await assert.rejects(
      extractLangref({ root, write: false }),
      /translations incomplete: 1\/2/,
    );
    await writeFile(
      file,
      JSON.stringify({
        'reference/One::text:0': '简介',
        'reference/One::text:1': '正文。',
      }),
    );
    assert.equal(
      (await extractLangref({ root, write: false })).stats.missing,
      0,
    );
    assert.deepEqual((await readdir(path.join(root, 'translations'))).sort(), [
      'langref.source-hashes.json',
      'langref.zh-cn.01.json',
    ]);
    await assert.rejects(access(path.join(root, 'content')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('fragment translation protects inline code and validates placeholders', () => {
  const translated = translateFragment(
    'Use <code>const</code> with <a href="#One">a value</a>.',
    '使用 <0/> 声明<1>值</1>。',
  );
  assert.equal(
    translated,
    '使用 <code>const</code> 声明<a href="#One">值</a>。',
  );
  assert.throws(
    () => translateFragment('Use <code>const</code>.', '使用 const。'),
    /placeholder/,
  );
});

test('cross-page references and table-of-contents references retain source anchors', () => {
  const owners = new Map([
    ['One', 'One'],
    ['nested', 'One'],
    ['Two', 'Two'],
  ]);
  const html = rewriteReferenceLinks(
    '<a href="#nested">x</a><a href="#toc-Two">y</a><a href="https://ziglang.org">external</a>',
    'zh-cn',
    owners,
  );
  assert.match(html, /href="\/zig-docs\/zh-cn\/reference\/One\/#nested"/);
  assert.match(html, /href="\/zig-docs\/zh-cn\/reference\/Two\/#Two"/);
  assert.match(html, /href="https:\/\/ziglang.org"/);
});

test('code tokens ignore only comments, preserving comment-like strings', () => {
  assert.deepEqual(
    codeTokens('const s = "// unchanged"; // English\nconst n = 42;'),
    codeTokens('const s = "// unchanged"; // 中文\nconst n = 42;'),
  );
  assert.notDeepEqual(
    codeTokens('const s = "// unchanged";'),
    codeTokens('const s = "// 改动";'),
  );
});
