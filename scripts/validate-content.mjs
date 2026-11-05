import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readGrammar } from './lib/grammar.mjs';
import { load } from 'cheerio';
import assert from 'node:assert/strict';
import { createTokenizer } from './lib/tokenizer.mjs';
import { extractLangref, splitLangref } from './lib/langref.mjs';
import { readTar } from './lib/std-runtime.mjs';
import { collectCommentUnits, translateSources } from './lib/comments.mjs';
import {
  approvedRenderedTextBlocks,
  assertRenderedBlockEquivalent,
} from './lib/rendered-blocks.mjs';
import {
  assertTranslationCoverage,
  loadStandardTranslations,
  loadTranslationPolicy,
} from './lib/translations.mjs';

const root = new URL('../', import.meta.url);
const json = async (path) =>
  JSON.parse(await readFile(new URL(path, root), 'utf8'));
async function validate(version) {
  const prefix = version === '0.17.0' ? '' : `${version}/`;
  const snapshot = await json(`upstream/${version}/manifest.json`);
  assert.equal(snapshot.version, version);
  for (const asset of snapshot.assets) {
    const bytes = await readFile(
      new URL(`upstream/${version}/${asset.file}`, root),
    );
    assert.equal(
      createHash('sha256').update(bytes).digest('hex'),
      asset.sha256,
      `Snapshot checksum: ${asset.file}`,
    );
  }
  const coverage = await json(`reports/${prefix}coverage.json`);
  const currentReference = await extractLangref({ write: false, version });
  assert.equal(
    currentReference.stats.missing,
    0,
    'Incomplete language reference translation',
  );
  assert.equal(
    currentReference.stats.units,
    coverage.reference.units,
    'Language reference source unit count changed',
  );
  assert.equal(
    coverage.reference.missing,
    0,
    'Incomplete language reference translation',
  );
  assert.equal(
    coverage.standardLibraryTranslations.missing,
    0,
    'Incomplete standard library translation',
  );
  assert.equal(
    coverage.standardLibraryTranslations.expected,
    coverage.standardLibraryTranslations.translated,
    'Incomplete standard library translation count',
  );
  const tokenizer = await createTokenizer();
  const files = readTar(
    await readFile(new URL(`upstream/${version}/std/sources.tar`, root)),
  );
  const { units, groups } = collectCommentUnits(files, tokenizer);
  const translations = await loadStandardTranslations(version);
  const { verbatim, protectedExceptions } =
    await loadTranslationPolicy(version);
  assertTranslationCoverage(
    units,
    Object.fromEntries(units.map((unit) => [unit.id, translations[unit.id]])),
    verbatim,
  );
  const approvedTextBlocks = approvedRenderedTextBlocks(
    units,
    translations,
    protectedExceptions,
  );
  const translatedFiles = translateSources(
    files,
    groups,
    translations,
    tokenizer,
    protectedExceptions,
  );
  const en = await json(`content/${prefix}en/manifest.json`);
  const zh = await json(`content/${prefix}zh-cn/manifest.json`);
  assert.deepEqual(
    en.map((page) => page.id).sort(),
    zh.map((page) => page.id).sort(),
    'Locale document sets differ',
  );
  assert.equal(
    new Set(en.map((page) => page.id)).size,
    en.length,
    'Duplicate page identifiers',
  );
  const reference = en.filter((page) => page.kind === 'langref');
  const referenceSnapshots = new Map(
    splitLangref(
      await readFile(new URL(`upstream/${version}/langref.html`, root), 'utf8'),
    ).map((page) => [page.id, page.html]),
  );
  assert.equal(
    reference.length,
    referenceSnapshots.size,
    'Missing language reference chapters',
  );
  assert.equal(
    reference.reduce((sum, page) => sum + page.headings.length, 0),
    splitLangref(
      await readFile(new URL(`upstream/${version}/langref.html`, root), 'utf8'),
    ).reduce((sum, page) => sum + page.headings.length, 0),
    'Missing language reference headings',
  );
  assert.equal(
    en.filter((page) => page.kind === 'std').length,
    files.size,
    'Missing standard library source modules',
  );
  let codeBlocks = 0;
  let symbolCount = 0;
  for (const meta of en) {
    const english = await json(`content/${prefix}en/${meta.file}`);
    const chinese = await json(`content/${prefix}zh-cn/${meta.file}`);
    assert.equal(english.id, chinese.id);
    assert.deepEqual(
      english.headings.map((heading) => heading.slug),
      chinese.headings.map((heading) => heading.slug),
      `Heading identity: ${meta.id}`,
    );
    const e = load(english.html, null, false);
    const z = load(chinese.html, null, false);
    if (meta.kind === 'langref') {
      const original = load(referenceSnapshots.get(meta.id), null, false);
      assert.deepEqual(
        e('pre')
          .map((_, element) => e(element).text())
          .get(),
        original('pre')
          .map((_, element) => original(element).text())
          .get(),
        `English reference code changed: ${meta.id}`,
      );
      for (const element of original('[id]').toArray()) {
        const id = original(element).attr('id');
        assert.equal(
          e('[id]').filter((_, el) => e(el).attr('id') === id).length,
          1,
          `Missing original anchor: ${meta.id}#${id}`,
        );
      }
    }
    for (const [locale, $] of [
      ['en', e],
      ['zh-cn', z],
    ]) {
      const ids = $('[id]')
        .map((_, element) => $(element).attr('id'))
        .get();
      assert.equal(
        new Set(ids).size,
        ids.length,
        `Duplicate anchors: ${locale}/${meta.id}`,
      );
      for (const heading of meta.headings)
        assert.ok(
          ids.includes(heading.slug),
          `Missing heading anchor: ${locale}/${meta.id}#${heading.slug}`,
        );
    }
    const originalBlocks = e('pre')
      .toArray()
      .filter((element) => !e(element).hasClass('line-numbers'));
    const translatedBlocks = z('pre')
      .toArray()
      .filter((element) => !z(element).hasClass('line-numbers'));
    assert.equal(
      originalBlocks.length,
      translatedBlocks.length,
      `Code block count: ${meta.id}`,
    );
    for (let index = 0; index < originalBlocks.length; index++) {
      assertRenderedBlockEquivalent(
        e(originalBlocks[index]).text(),
        z(translatedBlocks[index]).text(),
        tokenizer,
        approvedTextBlocks,
        {
          sourcePath: meta.sourcePath,
          documentId: meta.id,
          index,
          sourceListing: e(originalBlocks[index]).hasClass('source-listing'),
        },
      );
      codeBlocks++;
    }
    if (meta.kind === 'std') {
      const source = e('.source-listing').text();
      const translatedSource = z('.source-listing').text();
      assert.equal(
        source,
        files.get(meta.sourcePath).toString(),
        `English source snapshot mismatch: ${meta.sourcePath}`,
      );
      assert.equal(
        translatedSource,
        translatedFiles.get(meta.sourcePath).toString(),
        `Chinese source mismatch: ${meta.sourcePath}`,
      );
      assert.deepEqual(
        english.symbols,
        chinese.symbols,
        `API identities: ${meta.id}`,
      );
      const anchors = new Set(
        e('[id]')
          .map((_, el) => e(el).attr('id'))
          .get(),
      );
      assert.equal(
        new Set(english.symbols.map((symbol) => symbol.id)).size,
        english.symbols.length,
        `Duplicate API identifiers: ${meta.id}`,
      );
      for (const symbol of english.symbols)
        assert.ok(
          anchors.has(symbol.anchor),
          `Missing API anchor: ${symbol.name}`,
        );
      symbolCount += english.symbols.length;
    }
  }
  assert.equal(
    symbolCount,
    coverage.standardLibrary.declarations,
    'Missing declaration records',
  );
  console.log(
    `Verified ${version}: ${en.length} bilingual documents, ${symbolCount} declarations, ${units.length} translated comment units, ${codeBlocks} code block pairs, and all snapshot checksums.`,
  );
}
for (const version of ['0.17.0', '0.17.1']) await validate(version);

const introSnapshot = await json('upstream/intro/manifest.json');
for (const asset of introSnapshot.assets) {
  const bytes = await readFile(new URL(asset.file, root));
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    asset.sha256,
    `Intro snapshot checksum: ${asset.file}`,
  );
}
const grammar = await readGrammar();
const introEnglish = await json('content/en/intro/manifest.json');
const introChinese = await json('content/zh-cn/intro/manifest.json');
assert.deepEqual(
  introEnglish.map((page) => page.id),
  introChinese.map((page) => page.id),
  'Intro locale document sets differ',
);
for (const [locale, expected] of [
  ['en', grammar.source],
  ['zh-cn', grammar.translated],
]) {
  const page = await json(`content/${locale}/intro/grammar.json`);
  const $ = load(page.html, null, false);
  assert.equal(
    $('pre')
      .map((_, element) => $(element).text())
      .get()
      .join(''),
    expected,
    `Rendered grammar changed: ${locale}`,
  );
}
console.log(
  `Verified ${introEnglish.length} shared bilingual intro pages and the grammar translation.`,
);
