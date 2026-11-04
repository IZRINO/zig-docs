import { readFile } from 'node:fs/promises';
import { createTokenizer } from './lib/tokenizer.mjs';
import {
  collectCommentUnits,
  validateCommentTranslation,
} from './lib/comments.mjs';
import { readTar } from './lib/std-runtime.mjs';
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

const nextUnits = collectCommentUnits(
  readTar(
    await readFile(
      new URL('../upstream/0.17.1/std/sources.tar', import.meta.url),
    ),
  ),
  tokenizer,
).units;
const nextTranslations = await loadStandardTranslations('0.17.1');
const nextPolicy = await loadTranslationPolicy('0.17.1');
assertTranslationCoverage(
  nextUnits,
  Object.fromEntries(
    nextUnits.map((unit) => [unit.id, nextTranslations[unit.id]]),
  ),
  nextPolicy.verbatim,
);
for (const unit of nextUnits)
  validateCommentTranslation(
    unit,
    nextTranslations[unit.id],
    tokenizer,
    nextPolicy.protectedExceptions,
  );
console.log(`Validated ${nextUnits.length} Zig 0.17.1 comment translations.`);
