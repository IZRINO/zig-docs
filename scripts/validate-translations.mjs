import { readFile } from 'node:fs/promises';
import { createTokenizer } from './lib/tokenizer.mjs';
import { validateCommentTranslation } from './lib/comments.mjs';
import {
  loadStandardTranslations,
  loadTranslationPolicy,
  assertTranslationCoverage,
} from './lib/translations.mjs';

const { units } = JSON.parse(
  await readFile(
    new URL('../translations/std/catalog.json', import.meta.url),
    'utf8',
  ),
);
const all = await loadStandardTranslations();
const policy = await loadTranslationPolicy();
const tokenizer = await createTokenizer();
const errors = [];
const subset = units.filter((unit) => unit.id in all);
try {
  assertTranslationCoverage(subset, all, policy.verbatim);
} catch (error) {
  errors.push(error.message);
}
for (const unit of subset) {
  try {
    validateCommentTranslation(
      unit,
      all[unit.id],
      tokenizer,
      policy.protectedExceptions,
    );
  } catch (error) {
    errors.push(error.message);
  }
}
if (errors.length) throw new Error(errors.join('\n'));
console.log(
  `Validated ${subset.length}/${units.length} existing translations; ${units.length - subset.length} remain. This partial validation does not authorize publication.`,
);
