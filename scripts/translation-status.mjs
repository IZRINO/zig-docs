import { readFile, writeFile } from 'node:fs/promises';
import { loadStandardTranslations } from './lib/translations.mjs';

const root = new URL('../', import.meta.url);
const catalog = JSON.parse(
  await readFile(new URL('translations/std/catalog.json', root), 'utf8'),
);
const translations = await loadStandardTranslations();
const translated = catalog.units.filter(
  (unit) => typeof translations[unit.id] === 'string',
);
const reference = JSON.parse(
  await readFile(new URL('translations/langref.status.json', root), 'utf8'),
);
const result = {
  version: '0.17.0',
  reference: {
    expected: reference.total,
    translated: reference.translated,
    missing: reference.missing.length,
  },
  standardLibrary: {
    expected: catalog.units.length,
    translated: translated.length,
    missing: catalog.units.length - translated.length,
    sourceCharacters: catalog.units.reduce(
      (sum, unit) => sum + unit.source.length,
      0,
    ),
    translatedSourceCharacters: translated.reduce(
      (sum, unit) => sum + unit.source.length,
      0,
    ),
  },
};
if (process.argv.includes('--write'))
  await writeFile(
    new URL('reports/translation-progress.json', root),
    `${JSON.stringify(result, null, 2)}\n`,
  );
console.log(JSON.stringify(result, null, 2));
