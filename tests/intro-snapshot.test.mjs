import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { readGrammar, translateGrammar } from '../scripts/lib/grammar.mjs';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const json = async (path) =>
  JSON.parse(await readFile(resolve(root, path), 'utf8'));

test('官方中文入门快照校验来源、章节锚点与代码块', async () => {
  const snapshot = await json('upstream/intro/manifest.json');
  const pages = (await json('content/zh-cn/intro/manifest.json')).filter(
    (page) => page.id !== 'intro/grammar',
  );
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
    const generated = await json('content/zh-cn/' + meta.file);
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
    const generated = await json('content/zh-cn/' + meta.file);
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

test('共享入门章节的双语标识与锚点一致，英文保留官方原文', async () => {
  const english = await json('content/en/intro/manifest.json');
  const chinese = await json('content/zh-cn/intro/manifest.json');
  assert.equal(english.length, 6);
  assert.deepEqual(
    english.map((page) => page.id),
    chinese.map((page) => page.id),
  );
  for (let index = 0; index < english.length; index++) {
    const meta = english[index];
    assert.deepEqual(
      meta.headings.map((heading) => heading.slug),
      chinese[index].headings.map((heading) => heading.slug),
      `Intro anchors differ: ${meta.id}`,
    );
    if (meta.id === 'intro/grammar') continue;
    const source = load(
      await readFile(
        resolve(
          root,
          `upstream/intro/en/${meta.id.slice('intro/'.length)}.html`,
        ),
        'utf8',
      ),
      null,
      false,
    );
    const original = source('#content .container').last();
    const page = load(
      (await json(`content/en/${meta.file}`)).html,
      null,
      false,
    );
    assert.equal(meta.title, original.find('h1.title').text().trim());
    assert.deepEqual(
      page('pre')
        .map((_, element) => page(element).text())
        .get(),
      original
        .find('pre')
        .map((_, element) => source(element).text())
        .get(),
      `English intro code changed: ${meta.id}`,
    );
    assert.deepEqual(
      page('p')
        .map((_, element) => page(element).text().replace(/\s+/g, ' ').trim())
        .get(),
      original
        .find('p')
        .map((_, element) => source(element).text().replace(/\s+/g, ' ').trim())
        .get(),
      `English intro prose changed: ${meta.id}`,
    );
    assert.equal(meta.sourceUrl, `https://ziglang.org/${meta.id}/`);
  }
});

test('语法页面保留全部原文、代码与空白，仅翻译自然语言注释', async () => {
  const grammar = await readGrammar();
  for (const [locale, expected] of [
    ['en', grammar.source],
    ['zh-cn', grammar.translated],
  ]) {
    const generated = await json(`content/${locale}/intro/grammar.json`);
    const $ = load(generated.html, null, false);
    assert.equal(
      $('pre')
        .map((_, element) => $(element).text())
        .get()
        .join(''),
      expected,
    );
    assert.equal(generated.sourceUrl, grammar.snapshot.sourceUrl);
    for (const heading of generated.headings)
      assert.equal($(`[id="${heading.slug}"]`).length, 1);
  }
  const original = grammar.source.split('\n');
  const translated = grammar.translated.split('\n');
  assert.equal(translated.length, original.length);
  for (let index = 0; index < original.length; index++) {
    if (
      !original[index].startsWith('# ') ||
      grammar.translation.verbatimComments.includes(original[index].slice(2))
    ) {
      assert.equal(
        translated[index],
        original[index],
        `Grammar rule or verbatim comment changed at line ${index + 1}`,
      );
    }
  }
  assert.match(grammar.translated, /最坏情况的时间复杂度为线性/);
  assert.match(grammar.translated, /禁止出现多个 align 或 addrspace/);
});

test('语法原文变动、缺失译文和多行译文均被拒绝', async () => {
  const { source, translation } = await readGrammar();
  assert.throws(
    () => translateGrammar(source + '\n', translation),
    /Grammar source hash changed/,
  );
  const missing = structuredClone(translation);
  const comment = Object.keys(missing.comments)[0];
  delete missing.comments[comment];
  assert.throws(
    () => translateGrammar(source, missing),
    /Missing grammar translation/,
  );
  const multiline = structuredClone(translation);
  multiline.comments[comment] = '中文\nRoot <- changed';
  assert.throws(
    () => translateGrammar(source, multiline),
    /Multiline grammar translation/,
  );
});
