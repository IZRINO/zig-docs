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

const version = process.argv[2] ?? '0.17.0';
if (!['0.17.0', '0.17.1'].includes(version))
  throw new Error('Unsupported version');
const contentPrefix = version === '0.17.0' ? '' : `${version}/`;
const reportsPrefix = version === '0.17.0' ? '' : `${version}/`;

const codeStylesUrl = new URL(
  '../src/styles/expressive-code.css',
  import.meta.url,
);
if (version === '0.17.0')
  await writeFile(
    codeStylesUrl,
    await format(await getCodeFrameStyles(), {
      ...(await resolveConfig(codeStylesUrl)),
      parser: 'css',
    }),
  );

const englishRuntime = await loadRuntime(undefined, version);
const tokenizer = await createTokenizer();
const { units, groups } = collectCommentUnits(englishRuntime.files, tokenizer);
const translations = await loadStandardTranslations(version);
const { verbatim, protectedExceptions } = await loadTranslationPolicy(version);
assertTranslationCoverage(
  units,
  Object.fromEntries(units.map((unit) => [unit.id, translations[unit.id]])),
  verbatim,
);
const translatedSources = translateSources(
  englishRuntime.files,
  groups,
  translations,
  tokenizer,
  protectedExceptions,
);
const chineseRuntime = await loadRuntime(writeTar(translatedSources), version);
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
const reference = await extractLangref({ version });
console.log(`Extracted ${reference.en.length} reference chapters.`);
const en = await renderStandardLibrary(englishRuntime, 'en', version);
console.log(`Rendered ${en.manifest.length} English standard library modules.`);
const zh = await renderStandardLibrary(chineseRuntime, 'zh-cn', version);
console.log(`Rendered ${zh.manifest.length} Chinese standard library modules.`);
const unresolved = await rewriteContentLinks(
  reference.en,
  [
    ['en', [...reference.en, ...en.manifest], en.symbolPages],
    ['zh-cn', [...reference.zh, ...zh.manifest], zh.symbolPages],
  ],
  version,
);
for (const [locale, docs] of [
  ['en', [...reference.en, ...en.manifest]],
  ['zh-cn', [...reference.zh, ...zh.manifest]],
]) {
  await mkdir(
    new URL(`../content/${contentPrefix}${locale}/`, import.meta.url),
    {
      recursive: true,
    },
  );
  await writeFile(
    new URL(
      `../content/${contentPrefix}${locale}/manifest.json`,
      import.meta.url,
    ),
    `${JSON.stringify(docs)}\n`,
  );
}
await mkdir(new URL(`../reports/${reportsPrefix}`, import.meta.url), {
  recursive: true,
});
await writeFile(
  new URL(`../reports/${reportsPrefix}std-declarations.json`, import.meta.url),
  `${JSON.stringify(en.inventory)}\n`,
);
await writeFile(
  new URL(`../reports/${reportsPrefix}upstream-links.json`, import.meta.url),
  `${JSON.stringify({ version, unresolved }, null, 2)}\n`,
);
await writeFile(
  new URL(`../reports/${reportsPrefix}coverage.json`, import.meta.url),
  `${JSON.stringify({ version, reference: reference.stats, standardLibrary: en.stats, standardLibraryTranslations: { expected: units.length, translated: units.length, missing: 0, verbatim: Object.keys(verbatim).length } }, null, 2)}\n`,
);
console.log(
  `Exported ${reference.en.length} reference chapters and ${en.manifest.length} standard library modules in both languages.`,
);
