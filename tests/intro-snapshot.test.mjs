import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const json = async (path) =>
  JSON.parse(await readFile(resolve(root, path), 'utf8'));

test('官方中文入门快照校验来源、章节锚点与代码块', async () => {
  const snapshot = await json('upstream/intro/manifest.json');
  const pages = await json('content/0.17.1/zh-cn/intro/manifest.json');
  assert.equal(pages.length, 5);

  for (const asset of snapshot.assets) {
    const bytes = await readFile(resolve(root, asset.file));
    assert.equal(
      createHash('sha256').update(bytes).digest('hex'),
      asset.sha256,
    );
  }

  const generatedById = new Map();
  const slugs = new Set(pages.map((page) => page.id.split('/').at(-1)));
  for (const meta of pages) {
    const generated = await json('content/0.17.1/zh-cn/' + meta.file);
    const $ = load(generated.html, null, false);
    const ids = $('[id]')
      .map((_, element) => $(element).attr('id'))
      .get();
    assert.equal(
      new Set(ids).size,
      ids.length,
      'Duplicate anchors: ' + meta.id,
    );
    for (const heading of meta.headings)
      assert.ok(
        ids.includes(heading.slug),
        'Missing anchor: ' + meta.id + '#' + heading.slug,
      );
    generatedById.set(meta.id, new Set(ids));

    const source = await readFile(
      resolve(
        root,
        'upstream/intro/zh-CN/' + meta.id.slice('intro/'.length) + '.html',
      ),
      'utf8',
    );
    const source$ = load(source, null, false);
    assert.equal(
      $('.expressive-code').length,
      source$('#content .container').last().find('pre').length,
      'Code block count: ' + meta.id,
    );
    assert.ok(meta.sourceUrl.startsWith('https://ziglang.org/zh-CN/intro/'));
  }

  for (const meta of pages) {
    const generated = await json('content/0.17.1/zh-cn/' + meta.file);
    const $ = load(generated.html, null, false);
    $('a[href]').each((_, element) => {
      const target = new URL(
        $(element).attr('href'),
        'https://ziglang.org/zh-CN/intro/' + meta.id.split('/').at(-1) + '/',
      );
      if (!target.pathname.includes('/intro/')) return;
      const targetSlug = target.pathname.split('/').filter(Boolean).at(-1);
      if (!slugs.has(targetSlug) || !target.hash) return;
      const targetIds = generatedById.get('intro/' + targetSlug);
      assert.ok(
        targetIds.has(decodeURIComponent(target.hash.slice(1))),
        'Missing linked anchor: ' + meta.id + ' -> ' + target.href,
      );
    });
  }
});
