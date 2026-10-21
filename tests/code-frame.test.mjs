import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from 'cheerio';
import {
  renderCodeFrame,
  enhanceCodeBlocks,
} from '../scripts/lib/code-frame.mjs';

test('code frames preserve whitespace, comments, literal HTML and terminal output exactly', async () => {
  for (const code of [
    '',
    '\n\t// 中文 <>&\nconst text = "<script>";  \t\n\n',
    '\n\nconst n = 1;\n\n',
    '  \n\t\n',
    '$ zig test test.zig\n1/1 test...OK\nAll 1 tests passed.\n',
    'const x = 1;',
  ]) {
    for (const terminal of [false, true]) {
      const html = await renderCodeFrame(code, {
        title: terminal ? '命令行' : 'test.zig',
        language: terminal ? 'shellsession' : 'zig',
        terminal,
      });
      const $ = load(html, null, false);
      assert.equal($('pre code').text(), code);
      assert.equal($('script').length, 0);
      assert.equal($('.copy').length, 0);
      assert.equal($('pre').attr('tabindex'), '0');
    }
  }
});

test('reference frames keep anchors and distinguish C, JavaScript and shell examples', async () => {
  const html = `<h2 id="chapter">Title</h2>
<figure id="sample"><figcaption id="caption"><cite class="file">test.c</cite></figcaption><pre id="code"><code>int main(void) { return 0; }\n</code></pre></figure>
<figure><figcaption><cite class="file">test.js</cite></figcaption><pre><code>console.log("ok");\n</code></pre></figure>
<figure><figcaption class="shell-cap">Terminal</figcaption><pre><samp>$ zig version\n0.17.0\n</samp></pre></figure>`;
  const original = load(html, null, false);
  const result = load(await enhanceCodeBlocks(html), null, false);
  assert.deepEqual(
    result('[id]')
      .map((_, e) => result(e).attr('id'))
      .get(),
    original('[id]')
      .map((_, e) => original(e).attr('id'))
      .get(),
  );
  assert.deepEqual(
    result('pre')
      .map((_, e) => result(e).text())
      .get(),
    original('pre')
      .map((_, e) => original(e).text())
      .get(),
  );
  assert.deepEqual(
    result('pre')
      .map((_, e) => result(e).attr('data-language'))
      .get(),
    ['c', 'javascript', 'shellsession'],
  );
  assert.equal(result('.frame.is-terminal .title').text(), 'Terminal');
});
