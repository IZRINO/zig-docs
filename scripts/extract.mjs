import { mkdir, writeFile } from 'node:fs/promises';
import { loadRuntime } from './lib/std-runtime.mjs';
import { renderStandardLibrary } from './lib/std-render.mjs';
import {
  collectCommentUnits,
  translateSources,
  writeTar,
} from './lib/comments.mjs';
import { createTokenizer } from './lib/tokenizer.mjs';
import {
  loadStandardTranslations,
  loadTranslationPolicy,
  assertTranslationCoverage,
} from './lib/translations.mjs';
import { extractLangref } from './lib/langref.mjs';
import { rewriteContentLinks } from './lib/links.mjs';
import { getCodeFrameStyles } from './lib/code-frame.mjs';
import { format, resolveConfig } from 'prettier';

const codeStylesUrl = new URL(
  '../src/styles/expressive-code.css',
  import.meta.url,
);
await writeFile(
  codeStylesUrl,
  await format(await getCodeFrameStyles(), {
    ...(await resolveConfig(codeStylesUrl)),
    parser: 'css',
  }),
);

const englishRuntime = await loadRuntime();
const tokenizer = await createTokenizer();
const { units, groups } = collectCommentUnits(englishRuntime.files, tokenizer);
const translations = await loadStandardTranslations();
const { verbatim, protectedExceptions } = await loadTranslationPolicy();
assertTranslationCoverage(units, translations, verbatim);
const translatedSources = translateSources(
  englishRuntime.files,
  groups,
  translations,
  tokenizer,
  protectedExceptions,
);
const chineseRuntime = await loadRuntime(writeTar(translatedSources));
if (englishRuntime.declarations.size !== chineseRuntime.declarations.size)
  throw new Error('Translation changes declaration count');
for (const [id, declaration] of englishRuntime.declarations) {
  const translated = chineseRuntime.declarations.get(id);
  if (
    !translated ||
    translated.fqn !== declaration.fqn ||
    translated.sourcePath !== declaration.sourcePath ||
    translated.sourceLine !== declaration.sourceLine ||
    translated.category !== declaration.category
  )
    throw new Error(
      `Translation changes declaration identity: ${declaration.fqn}`,
    );
}
const reference = await extractLangref();
console.log(`Extracted ${reference.en.length} reference chapters.`);
const en = await renderStandardLibrary(englishRuntime, 'en');
console.log(`Rendered ${en.manifest.length} English standard library modules.`);
const zh = await renderStandardLibrary(chineseRuntime, 'zh-cn');
console.log(`Rendered ${zh.manifest.length} Chinese standard library modules.`);
const unresolved = await rewriteContentLinks(reference.en, [
  ['en', [...reference.en, ...en.manifest], en.symbolPages],
  ['zh-cn', [...reference.zh, ...zh.manifest], zh.symbolPages],
]);
for (const [locale, docs] of [
  ['en', [...reference.en, ...en.manifest]],
  ['zh-cn', [...reference.zh, ...zh.manifest]],
]) {
  await mkdir(new URL(`../content/${locale}/`, import.meta.url), {
    recursive: true,
  });
  await writeFile(
    new URL(`../content/${locale}/manifest.json`, import.meta.url),
    `${JSON.stringify(docs)}\n`,
  );
}
await mkdir(new URL('../reports/', import.meta.url), { recursive: true });
await writeFile(
  new URL('../reports/std-declarations.json', import.meta.url),
  `${JSON.stringify(en.inventory)}\n`,
);
await writeFile(
  new URL('../reports/upstream-links.json', import.meta.url),
  `${JSON.stringify({ version: '0.17.0', unresolved }, null, 2)}\n`,
);
await writeFile(
  new URL('../reports/coverage.json', import.meta.url),
  `${JSON.stringify({ version: '0.17.0', reference: reference.stats, standardLibrary: en.stats, standardLibraryTranslations: { expected: units.length, translated: units.length, missing: 0, verbatim: Object.keys(verbatim).length } }, null, 2)}\n`,
);
console.log(
  `Exported ${reference.en.length} reference chapters and ${en.manifest.length} standard library modules in both languages.`,
);
